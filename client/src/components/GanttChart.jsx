import { useEffect, useRef, useState } from 'react';
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

function taskMeta(task) {
  const parts = [];
  if (task.trade) parts.push(task.trade);
  if (task.vendor) parts.push(task.vendor);
  if (task.vendor_secondary) parts.push(task.vendor_secondary);
  if (task.security_team_member) parts.push(`Security Systems 1: ${task.security_team_member}`);
  if (task.pm) parts.push(`PM: ${task.pm}`);
  if (task.assigned_to_name) parts.push(`Assignee: ${task.assigned_to_name}`);
  if (task.assignee_secondary) parts.push(`Security Systems 2: ${task.assignee_secondary}`);
  if (task.assignee_tertiary) parts.push(`Lock Smiths: ${task.assignee_tertiary}`);
  if (task.assignee_quaternary) parts.push(`Other: ${task.assignee_quaternary}`);
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
  const [isFullscreen, setIsFullscreen] = useState(false);
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
  const taskById = new Map(tasks.map((task) => [task.id, task]));

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

  function toggleFullscreen() {
    const element = document.querySelector('.project-view') || document.documentElement;
    if (!document.fullscreenElement) {
      element.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }

  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  function exportGanttPdf() {
    const printWindow = window.open('', '_blank', 'width=1200,height=850');
    if (!printWindow) {
      window.alert('Please allow pop-ups for this site, then click Export PDF again.');
      return;
    }

    const printableTasks = tasks.length ? tasks : [];
    const printRowHeight = 48;
    const printHeaderHeight = 78;
    const printHeight = printHeaderHeight + Math.max(printableTasks.length, 1) * printRowHeight + 18;
    const tickStep = totalDays > 240 ? 30 : totalDays > 120 ? 14 : totalDays > 60 ? 7 : 3;
    const ticks = [];
    for (let offset = 0; offset <= totalDays; offset += tickStep) {
      const date = addDays(rangeStart, offset);
      ticks.push({ date, percent: clamp((offset / totalDays) * 100, 0, 100) });
    }
    if (!ticks.some((tick) => tick.date === rangeEnd)) {
      ticks.push({ date: rangeEnd, percent: 100 });
    }

    const headerTicks = ticks.map((tick) => `
      <div class="print-tick" style="left:${tick.percent}%">
        <strong>${escapeHtml(tick.date.slice(5))}</strong>
        <span>${escapeHtml(tick.date.slice(0, 4))}</span>
      </div>
    `).join('');

    const gridLines = ticks.map((tick) => `
      <div class="print-grid-line vertical" style="left:${tick.percent}%;height:${printHeight}px"></div>
    `).join('');

    const labelRows = printableTasks.length
      ? printableTasks.map((task) => `
          <div class="print-label-row" style="height:${printRowHeight}px">
            <strong>${escapeHtml(task.name)}</strong>
            <span>${escapeHtml(taskMeta(task) || 'No vendor/team assigned')}</span>
          </div>
        `).join('')
      : `<div class="print-label-row" style="height:${printRowHeight}px"><strong>No tasks yet</strong><span>Add tasks before exporting.</span></div>`;

    const rowLines = Array.from({ length: Math.max(printableTasks.length, 1) }, (_, index) => `
      <div class="print-grid-line horizontal" style="top:${printHeaderHeight + index * printRowHeight}px"></div>
    `).join('');

    const bars = printableTasks.map((task, index) => {
      const startOffset = clamp(daysBetween(rangeStart, task.start_date), 0, totalDays);
      const duration = Math.max(1, daysBetween(task.start_date, task.end_date) + 1);
      const left = clamp((startOffset / totalDays) * 100, 0, 100);
      const width = clamp((duration / totalDays) * 100, 1.5, 100 - left);
      const top = printHeaderHeight + index * printRowHeight + 9;
      const color = safeColor(task.color);
      return `
        <div class="print-bar" style="left:${left}%;top:${top}px;width:${width}%;background:${color}">
          <span class="print-progress" style="width:${clamp(Number(task.percent_complete || 0), 0, 100)}%"></span>
          <span class="print-bar-label">${escapeHtml(task.name)} · ${escapeHtml(statusLabel(task.status))} · ${escapeHtml(task.percent_complete || 0)}%</span>
        </div>
      `;
    }).join('');

    const todayPercent = today >= rangeStart && today <= rangeEnd
      ? clamp((daysBetween(rangeStart, today) / totalDays) * 100, 0, 100)
      : null;
    const todayLine = todayPercent === null ? '' : `
      <div class="print-today-line" style="left:${todayPercent}%"><span>Today</span></div>
    `;

    const dependencyNote = dependencies.length
      ? `<p class="print-small">Dependencies shown in app: ${dependencies.length}. The PDF export summarizes the schedule bars and task assignments.</p>`
      : '';

    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(project.name)} Gantt chart</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 24px; font-family: Arial, Helvetica, sans-serif; color: #111827; background: #ffffff; }
    h1 { margin: 0 0 4px; font-size: 24px; }
    p { margin: 0 0 12px; color: #4b5563; }
    .print-meta { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 18px; font-size: 12px; color: #374151; }
    .print-meta span { border: 1px solid #d1d5db; border-radius: 999px; padding: 5px 8px; }
    .print-gantt { display: grid; grid-template-columns: 285px minmax(0, 1fr); border: 1px solid #d1d5db; border-radius: 14px; overflow: hidden; }
    .print-labels { background: #f8fafc; border-right: 1px solid #d1d5db; }
    .print-label-header { height: ${printHeaderHeight}px; display: flex; align-items: end; padding: 0 12px 11px; font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 800; }
    .print-label-row { border-top: 1px solid #e5e7eb; padding: 7px 12px; overflow: hidden; }
    .print-label-row strong, .print-label-row span { display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .print-label-row strong { font-size: 12px; }
    .print-label-row span { margin-top: 3px; font-size: 10px; color: #64748b; }
    .print-timeline { position: relative; min-height: ${printHeight}px; background: #ffffff; overflow: hidden; }
    .print-tick { position: absolute; top: 0; width: 72px; transform: translateX(-1px); padding-top: 10px; font-size: 10px; color: #475569; }
    .print-tick strong, .print-tick span { display: block; }
    .print-tick strong { font-size: 12px; color: #0f172a; }
    .print-grid-line { position: absolute; pointer-events: none; }
    .print-grid-line.vertical { top: 0; width: 1px; background: #e5e7eb; }
    .print-grid-line.horizontal { left: 0; right: 0; height: 1px; background: #e5e7eb; }
    .print-bar { position: absolute; height: 30px; border-radius: 999px; color: #ffffff; overflow: hidden; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.16); }
    .print-progress { position: absolute; inset: 0 auto 0 0; background: rgba(255,255,255,0.28); }
    .print-bar-label { position: relative; z-index: 1; display: block; padding: 7px 10px 0; font-size: 11px; font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .print-today-line { position: absolute; top: 0; bottom: 0; width: 2px; background: #dc2626; }
    .print-today-line span { position: absolute; top: 4px; left: 5px; color: #dc2626; font-size: 10px; font-weight: 800; }
    .print-small { margin-top: 12px; font-size: 11px; color: #64748b; }
    .print-instruction { margin-top: 18px; font-size: 11px; color: #64748b; }
    @media print {
      @page { size: landscape; margin: 0.35in; }
      body { padding: 0; }
      .print-instruction { display: none; }
    }
  </style>
</head>
<body>
  <h1>${escapeHtml(project.name)} — Gantt chart</h1>
  <p>${escapeHtml(project.location || 'No location set')} · ${escapeHtml(formatDate(rangeStart))} to ${escapeHtml(formatDate(rangeEnd))}</p>
  <div class="print-meta">
    <span>${printableTasks.length} task${printableTasks.length === 1 ? '' : 's'}</span>
    <span>${dependencies.length} dependenc${dependencies.length === 1 ? 'y' : 'ies'}</span>
    <span>Exported ${escapeHtml(new Date().toLocaleString())}</span>
  </div>
  <div class="print-gantt">
    <div class="print-labels">
      <div class="print-label-header">Task / assignment</div>
      ${labelRows}
    </div>
    <div class="print-timeline">
      ${headerTicks}
      ${gridLines}
      ${rowLines}
      ${todayLine}
      ${bars}
    </div>
  </div>
  ${dependencyNote}
  <p class="print-instruction">Use your browser print window and choose Save as PDF. Landscape orientation is recommended.</p>
  <script>
    window.onload = function () {
      window.focus();
      window.setTimeout(function () { window.print(); }, 250);
    };
  </script>
</body>
</html>`;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  }

  return (
    <section className="panel gantt-panel expanded-gantt-panel">
      <div className="panel-heading gantt-heading">
        <div>
          <h2>Gantt chart</h2>
          <p>{formatDate(rangeStart)} to {formatDate(rangeEnd)} · scale: {scale.label} · zoom: {Math.round(zoom * 100)}%</p>
        </div>
        <div className="gantt-toolbar" aria-label="Gantt navigation controls">
          <button className="ghost-button compact" onClick={toggleFullscreen} type="button">{isFullscreen ? 'Exit full screen' : 'Full screen'}</button>
          <button className="ghost-button compact" onClick={scrollToStart} type="button">Start</button>
          <button className="ghost-button compact" onClick={() => scrollByDays(-30)} type="button">Prev 30 days</button>
          <button className="ghost-button compact" onClick={scrollToToday} disabled={todayOffset === null} type="button">Today</button>
          <button className="ghost-button compact" onClick={() => scrollByDays(30)} type="button">Next 30 days</button>
          <button className="ghost-button compact" onClick={zoomOut} disabled={zoomIndex === 0} type="button">Zoom out</button>
          <button className="ghost-button compact" onClick={resetZoom} type="button">Reset zoom</button>
          <button className="ghost-button compact" onClick={zoomIn} disabled={zoomIndex === zoomLevels.length - 1} type="button">Zoom in</button>
          <button className="primary-button compact" onClick={exportGanttPdf} type="button">Export PDF</button>
        </div>
      </div>

      <p className="gantt-navigation-help">Use the buttons or horizontal scroll bar to move through the schedule. Click a task name or bar to edit it. Export PDF opens a printable Gantt view.</p>

      <div className="gantt-shell expanded-gantt-shell">
        <div className="gantt-label-column" style={{ paddingTop: headerHeight }}>
          {tasks.length === 0 && <div className="gantt-empty-label">No tasks yet</div>}
          {tasks.map((task) => (
            <button className="gantt-label-row expanded" key={task.id} onClick={() => onEditTask?.(task)} type="button">
              <span className={`status-dot status-${task.status}`} />
              <span className="gantt-label-text">
                <strong>{task.name}</strong>
                {taskMeta(task) && <small>{taskMeta(task)}</small>}
              </span>
            </button>
          ))}
        </div>

        <div className="gantt-scroll expanded-gantt-scroll" ref={scrollRef} role="region" aria-label="Gantt timeline" tabIndex="0">
          <div className="gantt-canvas" style={{ width: chartWidth, height: chartHeight }}>
            <div className="gantt-header-row expanded">
              {units.map((unit) => (
                <div className="gantt-header-unit" style={{ left: unit.left, width: scale.unitWidth }} key={unit.date}>
                  <strong>{unit.date.slice(5)}</strong>
                  <span>{unit.date.slice(0, 4)}</span>
                </div>
              ))}
            </div>

            {units.map((unit) => (
              <div className="gantt-grid-line vertical" style={{ left: unit.left, height: chartHeight }} key={`line-${unit.date}`} />
            ))}

            {tasks.map((task, index) => (
              <div className="gantt-grid-line horizontal" style={{ top: headerHeight + index * rowHeight, width: chartWidth }} key={`row-${task.id}`} />
            ))}

            {todayOffset !== null && (
              <div className="today-line" style={{ left: clamp(todayOffset, 0, chartWidth) }}>
                <span>Today</span>
              </div>
            )}

            <svg className="dependency-lines" width={chartWidth} height={chartHeight} aria-hidden="true">
              <defs>
                <marker id="arrowhead" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
                  <path d="M0,0 L0,6 L7,3 z" />
                </marker>
              </defs>
              {dependencies.map((dependency) => {
                const predecessor = taskById.get(dependency.predecessor_task_id);
                const successor = taskById.get(dependency.successor_task_id);
                if (!predecessor || !successor) return null;
                const from = getTaskPosition(predecessor);
                const to = getTaskPosition(successor);
                const startX = from.right + 3;
                const endX = Math.max(to.left - 4, startX + 18);
                const midX = startX + Math.max(28, (endX - startX) / 2);
                const path = `M ${startX} ${from.y} C ${midX} ${from.y}, ${midX} ${to.y}, ${endX} ${to.y}`;
                return <path key={dependency.id} d={path} markerEnd="url(#arrowhead)" />;
              })}
            </svg>

            {tasks.map((task) => {
              const position = getTaskPosition(task);
              const top = position.y - 21;
              return (
                <button
                  className={`gantt-bar expanded status-bg-${task.status}`}
                  key={task.id}
                  style={{
                    left: position.left,
                    top,
                    width: position.width,
                    backgroundColor: task.color || '#2563eb'
                  }}
                  onClick={() => onEditTask?.(task)}
                  title={`${task.name}: ${formatDate(task.start_date)} to ${formatDate(task.end_date)} · ${taskMeta(task) || 'No team/vendor assigned'} · ${task.percent_complete}% complete`}
                  type="button"
                >
                  <span className="gantt-progress" style={{ width: `${task.percent_complete}%` }} />
                  <span className="gantt-bar-label">{task.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
