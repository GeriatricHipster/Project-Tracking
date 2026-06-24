import { useRef, useState } from 'react';
import { addDays, daysBetween, formatDate, maxIsoDate, minIsoDate, todayIso } from '../lib/dates';

function getScale(totalDays) {
  if (totalDays > 180) return { stepDays: 14, unitWidth: 84, label: '2 wk' };
  if (totalDays > 90) return { stepDays: 7, unitWidth: 86, label: 'week' };
  if (totalDays > 45) return { stepDays: 3, unitWidth: 66, label: '3 day' };
  return { stepDays: 1, unitWidth: 54, label: 'day' };
}

const zoomLevels = [0.8, 1, 1.25, 1.55, 1.9, 2.25];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function joinValues(values) {
  return values.map((value) => String(value || '').trim()).filter(Boolean).join(', ');
}

function taskMeta(task) {
  const parts = [];
  if (task.trade) parts.push(task.trade);

  const vendors = joinValues([task.vendor, task.vendor_2]);
  if (vendors) parts.push(`Vendors: ${vendors}`);

  const assignees = joinValues([
    task.assignee_1,
    task.assignee_2,
    task.assignee_3,
    task.assignee_4,
    task.assigned_to_name
  ]);
  if (assignees) parts.push(`Assignees: ${assignees}`);

  if (task.pm) parts.push(`PM: ${task.pm}`);
  return parts.join(' · ');
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function safeColor(value) {
  return /^#[0-9a-f]{6}$/i.test(String(value || '')) ? value : '#2563eb';
}

function statusLabel(value) {
  return String(value || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function GanttChart({ project, tasks, dependencies, onEditTask }) {
  const scrollRef = useRef(null);
  const [zoomIndex, setZoomIndex] = useState(2);
  const allStartDates = [project.start_date, ...tasks.map((task) => task.start_date)];
  const allEndDates = [project.end_date, ...tasks.map((task) => task.end_date)];
  const rangeStart = minIsoDate(allStartDates) || project.start_date;
  const rangeEnd = maxIsoDate(allEndDates) || project.end_date;
  const totalDays = Math.max(1, daysBetween(rangeStart, rangeEnd) + 1);
  const baseScale = getScale(totalDays);
  const zoom = zoomLevels[zoomIndex];
  const scale = { ...baseScale, unitWidth: Math.round(baseScale.unitWidth * zoom) };
  const totalUnits = Math.ceil(totalDays / scale.stepDays);
  const chartWidth = Math.max(1600, totalUnits * scale.unitWidth + 220);
  const rowHeight = 66;
  const headerHeight = 104;
  const chartHeight = headerHeight + Math.max(tasks.length, 1) * rowHeight + 18;
  const today = todayIso();
  const todayOffset = today >= rangeStart && today <= rangeEnd
    ? (daysBetween(rangeStart, today) / scale.stepDays) * scale.unitWidth
    : null;

  const units = [];
  for (let offset = 0; offset <= totalDays; offset += scale.stepDays) {
    const date = addDays(rangeStart, offset);
    units.push({ date, left: (offset / scale.stepDays) * scale.unitWidth });
  }

  const taskIndex = new Map(tasks.map((task, index) => [task.id, index]));

  function getTaskPosition(task) {
    const left = (daysBetween(rangeStart, task.start_date) / scale.stepDays) * scale.unitWidth;
    const duration = Math.max(1, daysBetween(task.start_date, task.end_date) + 1);
    const width = Math.max(56, (duration / scale.stepDays) * scale.unitWidth);
    const rowIndex = taskIndex.get(task.id) || 0;
    const y = headerHeight + rowIndex * rowHeight + rowHeight / 2;
    return { left, width, right: left + width, y };
  }

  function zoomOut() {
    setZoomIndex((current) => Math.max(0, current - 1));
  }

  function zoomIn() {
    setZoomIndex((current) => Math.min(zoomLevels.length - 1, current + 1));
  }

  function resetZoom() {
    setZoomIndex(2);
  }

  function scrollToToday() {
    if (!scrollRef.current || todayOffset === null) return;
    const maxLeft = Math.max(0, chartWidth - scrollRef.current.clientWidth);
    const target = clamp(todayOffset - scrollRef.current.clientWidth / 2, 0, maxLeft);
    scrollRef.current.scrollTo({ left: target, behavior: 'smooth' });
  }

  function scrollToStart() {
    scrollRef.current?.scrollTo({ left: 0, behavior: 'smooth' });
  }

  function scrollByDays(days) {
    if (!scrollRef.current) return;
    const pixels = (days / scale.stepDays) * scale.unitWidth;
    scrollRef.current.scrollBy({ left: pixels, behavior: 'smooth' });
  }

  function exportGanttPdf() {
    const printWindow = window.open('', '_blank', 'width=1200,height=850');
    if (!printWindow) {
      window.alert('Please allow pop-ups for this site, then click Export PDF again.');
      return;
    }

    const rows = tasks.map((task) => {
      const meta = taskMeta(task);
      const position = getTaskPosition(task);
      return `
        <tr>
          <td>${escapeHtml(task.name)}</td>
          <td>${escapeHtml(formatDate(task.start_date))}</td>
          <td>${escapeHtml(formatDate(task.end_date))}</td>
          <td>${escapeHtml(String(task.percent_complete))}%</td>
          <td>${escapeHtml(meta || 'No vendors or assignees assigned')}</td>
          <td>${escapeHtml(`${Math.round(position.left)} / ${Math.round(position.width)}`)}</td>
        </tr>
      `;
    }).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>${escapeHtml(project.name)} - Gantt PDF</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 24px; color: #111827; }
            h1 { margin: 0 0 6px; font-size: 22px; }
            p { margin: 0 0 14px; color: #4b5563; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; vertical-align: top; }
            th { background: #f3f4f6; }
            .meta { margin-top: 8px; margin-bottom: 16px; }
            .legend { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 12px; font-size: 11px; }
            .legend span { padding: 4px 8px; border: 1px solid #d1d5db; border-radius: 999px; }
          </style>
        </head>
        <body>
          <h1>${escapeHtml(project.name)} Gantt chart</h1>
          <p>${escapeHtml(formatDate(project.start_date))} to ${escapeHtml(formatDate(project.end_date))}</p>
          <div class="meta">${escapeHtml(project.location || 'No location set')}</div>
          <table>
            <thead>
              <tr>
                <th>Task</th>
                <th>Start</th>
                <th>Finish</th>
                <th>% Complete</th>
                <th>Meta</th>
                <th>Bar span</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <script>
            window.onload = () => { window.print(); window.close(); };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  return (
    <section className="panel gantt-shell">
      <div className="panel-heading">
        <div>
          <h2>Gantt chart</h2>
          <p>{tasks.length} task{tasks.length === 1 ? '' : 's'} spanning {formatDate(rangeStart)} through {formatDate(rangeEnd)}</p>
        </div>
        <div className="gantt-actions">
          <button className="ghost-button compact" onClick={scrollToStart} type="button">Start</button>
          <button className="ghost-button compact" onClick={scrollToToday} type="button">Today</button>
          <button className="ghost-button compact" onClick={() => scrollByDays(-30)} type="button">Prev 30 days</button>
          <button className="ghost-button compact" onClick={() => scrollByDays(30)} type="button">Next 30 days</button>
          <button className="ghost-button compact" onClick={zoomOut} type="button">Zoom out</button>
          <button className="ghost-button compact" onClick={zoomIn} type="button">Zoom in</button>
          <button className="ghost-button compact" onClick={resetZoom} type="button">Reset zoom</button>
          <button className="ghost-button compact" onClick={exportGanttPdf} type="button">Export PDF</button>
        </div>
      </div>

      <div className="gantt-navigation-help">
        <span>{scale.label} scale</span>
        <span>{dependencies.length} dependency{dependencies.length === 1 ? '' : 's'}</span>
        <span>Drag the horizontal scroll bar to pan the timeline.</span>
      </div>

      <div className="gantt-scroll" ref={scrollRef} style={{ height: chartHeight }}>
        <div className="gantt-canvas" style={{ width: chartWidth, height: chartHeight }}>
          <div className="gantt-grid-line gantt-grid-left" />
          {units.map((unit, index) => (
            <div className="gantt-grid-line" key={unit.date} style={{ left: unit.left }}>
              <div className="gantt-axis-label">{index % Math.max(1, Math.round(7 / scale.stepDays)) === 0 ? formatDate(unit.date) : ''}</div>
            </div>
          ))}

          {todayOffset !== null && (
            <div className="gantt-today-line" style={{ left: todayOffset }}>
              <span>Today</span>
            </div>
          )}

          <div className="gantt-header-row">
            <div className="gantt-header-cell gantt-label-header">Task</div>
            <div className="gantt-header-cell gantt-timeline-header">
              {units.map((unit) => (
                <div className="gantt-header-tick" key={unit.date} style={{ left: unit.left }}>
                  <strong>{formatDate(unit.date)}</strong>
                </div>
              ))}
            </div>
          </div>

          {tasks.map((task) => {
            const position = getTaskPosition(task);
            const meta = taskMeta(task);
            return (
              <div className="gantt-row" key={task.id}>
                <button className="gantt-label-column" onClick={() => onEditTask(task)} type="button">
                  <strong>{task.name}</strong>
                  <span>{meta || 'No vendors or assignees assigned'}</span>
                  <small>{formatDate(task.start_date)} - {formatDate(task.end_date)}</small>
                </button>
                <div className="gantt-timeline-column">
                  <div className="gantt-track" />
                  <button
                    className={`gantt-task-bar status-${task.status}`}
                    onClick={() => onEditTask(task)}
                    style={{ left: position.left, width: position.width, background: safeColor(task.color) }}
                    title={`${task.name}: ${formatDate(task.start_date)} to ${formatDate(task.end_date)} · ${meta || 'No team assigned'} · ${task.percent_complete}% complete`}
                    type="button"
                  >
                    <span>{task.name}</span>
                    <small>{task.percent_complete}%</small>
                  </button>
                </div>
              </div>
            );
          })}
          {tasks.length === 0 && <div className="gantt-empty">No tasks yet. Add a task to populate the timeline.</div>}
        </div>
      </div>
    </section>
  );
}
