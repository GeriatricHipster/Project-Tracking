import { useRef, useState } from 'react';
import { addDays, daysBetween, formatDate, maxIsoDate, minIsoDate, todayIso } from '../lib/dates';

function getScale(totalDays) {
  if (totalDays > 180) return { stepDays: 14, unitWidth: 72, label: '2 wk' };
  if (totalDays > 90) return { stepDays: 7, unitWidth: 72, label: 'week' };
  if (totalDays > 45) return { stepDays: 3, unitWidth: 56, label: '3 day' };
  return { stepDays: 1, unitWidth: 44, label: 'day' };
}

const zoomLevels = [0.8, 1, 1.25, 1.5, 1.85];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function taskMeta(task) {
  const parts = [];
  if (task.vendor) parts.push(task.vendor);
  if (task.assigned_to_name) parts.push(task.assigned_to_name);
  return parts.join(' · ');
}

export default function GanttChart({ project, tasks, dependencies, onEditTask }) {
  const scrollRef = useRef(null);
  const [zoomIndex, setZoomIndex] = useState(1);
  const allStartDates = [project.start_date, ...tasks.map((task) => task.start_date)];
  const allEndDates = [project.end_date, ...tasks.map((task) => task.end_date)];
  const rangeStart = minIsoDate(allStartDates) || project.start_date;
  const rangeEnd = maxIsoDate(allEndDates) || project.end_date;
  const totalDays = Math.max(1, daysBetween(rangeStart, rangeEnd) + 1);
  const baseScale = getScale(totalDays);
  const zoom = zoomLevels[zoomIndex];
  const scale = { ...baseScale, unitWidth: Math.round(baseScale.unitWidth * zoom) };
  const totalUnits = Math.ceil(totalDays / scale.stepDays);
  const chartWidth = Math.max(1120, totalUnits * scale.unitWidth + 160);
  const rowHeight = 58;
  const headerHeight = 86;
  const chartHeight = headerHeight + Math.max(tasks.length, 1) * rowHeight + 12;
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
    const width = Math.max(42, (duration / scale.stepDays) * scale.unitWidth);
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

  function scrollToToday() {
    if (!scrollRef.current || todayOffset === null) return;
    const target = clamp(todayOffset - scrollRef.current.clientWidth / 2, 0, chartWidth);
    scrollRef.current.scrollTo({ left: target, behavior: 'smooth' });
  }

  function scrollToStart() {
    scrollRef.current?.scrollTo({ left: 0, behavior: 'smooth' });
  }

  return (
    <section className="panel gantt-panel expanded-gantt-panel">
      <div className="panel-heading gantt-heading">
        <div>
          <h2>Gantt chart</h2>
          <p>{formatDate(rangeStart)} to {formatDate(rangeEnd)} · scale: {scale.label} · zoom: {Math.round(zoom * 100)}%</p>
        </div>
        <div className="gantt-toolbar" aria-label="Gantt navigation controls">
          <button className="ghost-button compact" onClick={scrollToStart} type="button">Start</button>
          <button className="ghost-button compact" onClick={scrollToToday} disabled={todayOffset === null} type="button">Today</button>
          <button className="ghost-button compact" onClick={zoomOut} disabled={zoomIndex === 0} type="button">Zoom out</button>
          <button className="ghost-button compact" onClick={zoomIn} disabled={zoomIndex === zoomLevels.length - 1} type="button">Zoom in</button>
        </div>
      </div>

      <p className="gantt-navigation-help">Scroll sideways to move through the schedule. Click a task name or bar to edit it.</p>

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
              const top = position.y - 18;
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
                  title={`${task.name}: ${formatDate(task.start_date)} to ${formatDate(task.end_date)} · ${task.vendor || 'No vendor'} · ${task.percent_complete}% complete`}
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
