import { createPortal } from 'react-dom';
import { useEffect, useMemo, useRef, useState } from 'react';
import { addDays, daysBetween, formatDate, maxIsoDate, minIsoDate, todayIso } from '../lib/dates';

function getScale(totalDays) {
  if (totalDays > 180) return { stepDays: 14, unitWidth: 84, label: '2 wk' };
  if (totalDays > 90) return { stepDays: 7, unitWidth: 86, label: 'week' };
  if (totalDays > 45) return { stepDays: 3, unitWidth: 66, label: '3 day' };
  return { stepDays: 1, unitWidth: 54, label: 'day' };
}

const zoomLevels = [0.8, 1, 1.25, 1.55, 1.9, 2.25];
const SINGLE_CLICK_DELAY_MS = 220;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function taskMeta(task) {
  const parts = [];
  if (task.trade) parts.push(task.trade);
  if (task.vendor) parts.push(task.vendor);
  if (task.vendor_secondary) parts.push(task.vendor_secondary);
  if (task.security_team_member) parts.push(`Security: ${task.security_team_member}`);
  if (task.pm) parts.push(`PM: ${task.pm}`);
  if (task.assigned_to_name) parts.push(`Assignee: ${task.assigned_to_name}`);
  if (task.assignee_secondary) parts.push(`Assignee 2: ${task.assignee_secondary}`);
  if (task.assignee_tertiary) parts.push(`Assignee 3: ${task.assignee_tertiary}`);
  if (task.assignee_quaternary) parts.push(`Assignee 4: ${task.assignee_quaternary}`);
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

function quickActionPatch(action) {
  if (action === 'complete') return { status: 'complete', percent_complete: 100 };
  if (action === 'in_progress') return { status: 'in_progress' };
  if (action === 'blocked') return { status: 'blocked' };
  return {};
}

function QuickActionMenu({ task, x, y, onClose, onAction }) {
  if (!task || typeof document === 'undefined') return null;

  const actions = [
    { key: 'complete', icon: '✔', label: 'Mark Complete' },
    { key: 'in_progress', icon: '⏸', label: 'Mark In Progress' },
    { key: 'blocked', icon: '🚫', label: 'Mark Blocked' },
    { key: 'finish_date', icon: '📅', label: 'Change Finish Date' },
    { key: 'reassign', icon: '👤', label: 'Reassign' }
  ];

  return createPortal(
    <div
      role="menu"
      aria-label={`Quick actions for ${task.name}`}
      style={{
        position: 'fixed',
        left: Math.max(12, Math.min(x, window.innerWidth - 300)),
        top: Math.max(12, Math.min(y, window.innerHeight - 340)),
        zIndex: 9999,
        width: 290,
        borderRadius: 18,
        border: '1px solid #cbd5e1',
        background: '#ffffff',
        boxShadow: '0 18px 40px rgba(15, 23, 42, 0.24)',
        padding: 10,
        pointerEvents: 'auto'
      }}
      onContextMenu={(event) => event.preventDefault()}
    >
      <div style={{ padding: '4px 8px 10px' }}>
        <strong
          style={{
            display: 'block',
            fontSize: 13,
            color: '#0f172a',
            marginBottom: 3,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}
        >
          {task.name}
        </strong>
        <span
          style={{
            display: 'block',
            fontSize: 12,
            color: '#64748b',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}
        >
          {task.vendor || task.assigned_to_name || 'No vendor/team assigned'}
        </span>
      </div>

      <div style={{ display: 'grid', gap: 6 }}>
        {actions.map((action) => (
          <button
            key={action.key}
            type="button"
            onClick={() => onAction(action.key)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              width: '100%',
              borderRadius: 12,
              padding: '10px 12px',
              border: '1px solid #e2e8f0',
              background: '#f8fafc',
              color: '#0f172a',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
              textAlign: 'left'
            }}
          >
            <span style={{ width: 20, textAlign: 'center' }}>{action.icon}</span>
            <span>{action.label}</span>
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 10 }}>
        <button
          type="button"
          onClick={onClose}
          style={{
            border: '1px solid #cbd5e1',
            background: '#fff',
            color: '#0f172a',
            borderRadius: 10,
            padding: '8px 10px',
            fontSize: 13,
            cursor: 'pointer'
          }}
        >
          Close
        </button>
      </div>
    </div>,
    document.body
  );
}

export default function GanttChart({
  project,
  tasks,
  dependencies,
  onEditTask,
  onSelectTask,
  onUpdateTask,
  onTaskAction
}) {
  const scrollRef = useRef(null);
  const timelineRef = useRef(null);
  const clickTimerRef = useRef(null);

  const [zoomIndex, setZoomIndex] = useState(2);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);

  const allStartDates = [project.start_date, ...tasks.map((task) => task.start_date)].filter(Boolean);
  const allEndDates = [project.end_date, ...tasks.map((task) => task.end_date)].filter(Boolean);
  const rangeStart = minIsoDate(allStartDates) || project.start_date || todayIso();
  const rangeEnd = maxIsoDate(allEndDates) || project.end_date || rangeStart;
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
  const todayOffset =
    today >= rangeStart && today <= rangeEnd
      ? (daysBetween(rangeStart, today) / scale.stepDays) * scale.unitWidth
      : null;

  const taskById = useMemo(() => new Map(tasks.map((task) => [task.id, task])), [tasks]);
  const taskIndex = useMemo(() => new Map(tasks.map((task, index) => [task.id, index])), [tasks]);

  const timelineUnits = useMemo(() => {
    const units = [];
    for (let offset = 0; offset <= totalDays; offset += scale.stepDays) {
      const date = addDays(rangeStart, offset);
      units.push({ date, left: (offset / scale.stepDays) * scale.unitWidth });
    }
    return units;
  }, [rangeStart, scale.stepDays, scale.unitWidth, totalDays]);

  useEffect(() => {
    if (selectedTaskId && !taskById.has(selectedTaskId)) {
      setSelectedTaskId(null);
    }
  }, [selectedTaskId, taskById]);

  useEffect(() => {
    function handleFullscreenChange() {
      setIsFullscreen(Boolean(document.fullscreenElement));
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    function handleMouseDown(event) {
      if (!contextMenu) return;
      const target = event.target;
      if (timelineRef.current?.contains(target)) return;
      setContextMenu(null);
    }

    function handleEscape(event) {
      if (event.key === 'Escape') setContextMenu(null);
    }

    function handleScroll() {
      setContextMenu(null);
    }

    if (contextMenu) {
      document.addEventListener('mousedown', handleMouseDown, true);
      document.addEventListener('keydown', handleEscape, true);
      document.addEventListener('scroll', handleScroll, true);
      window.addEventListener('resize', handleScroll);
    }

    return () => {
      document.removeEventListener('mousedown', handleMouseDown, true);
      document.removeEventListener('keydown', handleEscape, true);
      document.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll);
    };
  }, [contextMenu]);

  useEffect(() => {
    return () => {
      if (clickTimerRef.current) window.clearTimeout(clickTimerRef.current);
    };
  }, []);

  function getTaskPosition(task) {
    const taskStart = task.start_date || rangeStart;
    const taskEnd = task.end_date || taskStart;
    const left = (daysBetween(rangeStart, taskStart) / scale.stepDays) * scale.unitWidth;
    const duration = Math.max(1, daysBetween(taskStart, taskEnd) + 1);
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

  async function toggleFullscreen() {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen?.();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen?.();
        setIsFullscreen(false);
      }
    } catch {
      setIsFullscreen((current) => !current);
    }
  }

  function scrollToEditPane() {
    window.setTimeout(() => {
      const editPane = document.querySelector('.task-form-panel');
      if (editPane) editPane.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 75);
  }

  function focusTask(task) {
    setSelectedTaskId(task.id);
    onSelectTask?.(task);

    const position = getTaskPosition(task);
    const container = scrollRef.current;
    if (!container) return;

    const maxLeft = Math.max(0, chartWidth - container.clientWidth);
    const target = clamp(position.left + position.width / 2 - container.clientWidth / 2, 0, maxLeft);
    container.scrollTo({ left: target, behavior: 'smooth' });
  }

  function openEditor(task) {
    setSelectedTaskId(task.id);
    onSelectTask?.(task);
    onEditTask?.(task);
    scrollToEditPane();
  }

  function queueSingleClick(task) {
    if (clickTimerRef.current) window.clearTimeout(clickTimerRef.current);
    clickTimerRef.current = window.setTimeout(() => {
      focusTask(task);
      clickTimerRef.current = null;
    }, SINGLE_CLICK_DELAY_MS);
  }

  function handleDoubleClick(task) {
    if (clickTimerRef.current) {
      window.clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }
    openEditor(task);
  }

  function handleContextMenu(event, task) {
    event.preventDefault();
    event.stopPropagation();
    if (clickTimerRef.current) {
      window.clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }
    setSelectedTaskId(task.id);
    onSelectTask?.(task);
    setContextMenu({ x: event.clientX, y: event.clientY, taskId: task.id });
  }

  function applyTaskUpdate(task, updates) {
    if (typeof onUpdateTask === 'function') {
      onUpdateTask(task.id, updates, task);
      return;
    }

    if (typeof onTaskAction === 'function') {
      onTaskAction(task, updates);
    }
  }

  function handleQuickAction(action) {
    const task = taskById.get(contextMenu?.taskId);
    if (!task) return;

    if (action === 'finish_date') {
      const nextValue = window.prompt('Enter the new finish date (YYYY-MM-DD):', task.end_date || '');
      if (!nextValue) return;
      applyTaskUpdate(task, { end_date: nextValue });
      setContextMenu(null);
      return;
    }

    if (action === 'reassign') {
      const nextValue = window.prompt('Enter the new assignee name or email:', task.assigned_to_name || '');
      if (!nextValue) return;
      applyTaskUpdate(task, { assigned_to: nextValue });
      setContextMenu(null);
      return;
    }

    applyTaskUpdate(task, quickActionPatch(action));
    setContextMenu(null);
  }

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
    if (!ticks.some((tick) => tick.date === rangeEnd)) ticks.push({ date: rangeEnd, percent: 100 });

    const headerTicks = ticks
      .map(
        (tick) => `
      <div class="print-tick" style="left:${tick.percent}%">
        <strong>${escapeHtml(tick.date.slice(5))}</strong>
        <span>${escapeHtml(tick.date.slice(0, 4))}</span>
      </div>
    `
      )
      .join('');

    const gridLines = ticks
      .map(
        (tick) => `
      <div class="print-grid-line vertical" style="left:${tick.percent}%;height:${printHeight}px"></div>
    `
      )
      .join('');

    const labelRows = printableTasks.length
      ? printableTasks
          .map(
            (task) => `
          <div class="print-label-row" style="height:${printRowHeight}px">
            <strong>${escapeHtml(task.name)}</strong>
            <span>${escapeHtml(taskMeta(task) || 'No vendor/team assigned')}</span>
          </div>
        `
          )
          .join('')
      : `<div class="print-label-row" style="height:${printRowHeight}px"><strong>No tasks yet</strong><span>Add tasks before exporting.</span></div>`;

    const rowLines = Array.from(
      { length: Math.max(printableTasks.length, 1) },
      (_, index) => `
      <div class="print-grid-line horizontal" style="top:${printHeaderHeight + index * printRowHeight}px"></div>
    `
    ).join('');

    const bars = printableTasks
      .map((task, index) => {
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
      })
      .join('');

    const todayPercent =
      today >= rangeStart && today <= rangeEnd
        ? clamp((daysBetween(rangeStart, today) / totalDays) * 100, 0, 100)
        : null;
    const todayLine =
      todayPercent === null
        ? ''
        : `
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
    <section className={`panel gantt-panel expanded-gantt-panel ${isFullscreen ? 'gantt-fullscreen' : ''}`}>
      <div className="panel-heading gantt-heading">
        <button className="ghost-button compact gantt-fullscreen-button" onClick={toggleFullscreen} type="button">
          {isFullscreen ? 'Exit full screen' : 'Full screen'}
        </button>
        <div>
          <h2>Gantt chart</h2>
          <p>
            {formatDate(rangeStart)} to {formatDate(rangeEnd)} · scale: {scale.label} · zoom:{' '}
            {Math.round(zoom * 100)}%
          </p>
        </div>
        <div className="gantt-toolbar" aria-label="Gantt navigation controls">
          <button className="ghost-button compact" onClick={scrollToStart} type="button">
            Start
          </button>
          <button className="ghost-button compact" onClick={() => scrollByDays(-30)} type="button">
            Prev 30 days
          </button>
          <button className="ghost-button compact" onClick={scrollToToday} disabled={todayOffset === null} type="button">
            Today
          </button>
          <button className="ghost-button compact" onClick={() => scrollByDays(30)} type="button">
            Next 30 days
          </button>
          <button className="ghost-button compact" onClick={zoomOut} disabled={zoomIndex === 0} type="button">
            Zoom out
          </button>
          <button className="ghost-button compact" onClick={resetZoom} type="button">
            Reset zoom
          </button>
          <button className="ghost-button compact" onClick={zoomIn} disabled={zoomIndex === zoomLevels.length - 1} type="button">
            Zoom in
          </button>
          <button className="primary-button compact" onClick={exportGanttPdf} type="button">
            Export PDF
          </button>
        </div>
      </div>

      <p className="gantt-navigation-help">
        Single-click scrolls to and highlights a task. Double-click opens the task editor. Right-click shows quick
        actions for experienced users.
      </p>

      <div className="gantt-shell expanded-gantt-shell">
        <div className="gantt-label-column" style={{ paddingTop: headerHeight }}>
          {tasks.length === 0 && <div className="gantt-empty-label">No tasks yet</div>}
          {tasks.map((task) => (
            <button
              key={task.id}
              className="gantt-label-row expanded"
              type="button"
              onClick={() => queueSingleClick(task)}
              onDoubleClick={() => handleDoubleClick(task)}
              onContextMenu={(event) => handleContextMenu(event, task)}
              style={{
                cursor: 'pointer',
                borderRadius: 12,
                transition: 'transform 120ms ease, box-shadow 120ms ease, outline 120ms ease, background-color 120ms ease',
                userSelect: 'none',
                ...(selectedTaskId === task.id
                  ? {
                      outline: '2px solid rgba(37, 99, 235, 0.35)',
                      backgroundColor: 'rgba(37, 99, 235, 0.08)',
                      boxShadow: 'inset 0 0 0 1px rgba(37, 99, 235, 0.15)',
                      transform: 'translateX(1px)'
                    }
                  : {})
              }}
              title="Single-click to highlight, double-click to edit, right-click for quick actions"
            >
              <span className={`status-dot status-${task.status}`} />
              <span className="gantt-label-text">
                <strong>{task.name}</strong>
                {taskMeta(task) && <small>{taskMeta(task)}</small>}
              </span>
            </button>
          ))}
        </div>

        <div
          className="gantt-scroll expanded-gantt-scroll"
          ref={scrollRef}
          role="region"
          aria-label="Gantt timeline"
          tabIndex={0}
        >
          <div className="gantt-canvas" ref={timelineRef} style={{ width: chartWidth, height: chartHeight }}>
            <div className="gantt-header-row expanded">
              {timelineUnits.map((unit) => (
                <div className="gantt-header-unit" style={{ left: unit.left, width: scale.unitWidth }} key={unit.date}>
                  <strong>{unit.date.slice(5)}</strong>
                  <span>{unit.date.slice(0, 4)}</span>
                </div>
              ))}
            </div>

            {timelineUnits.map((unit) => (
              <div className="gantt-grid-line vertical" style={{ left: unit.left, height: chartHeight }} key={`line-${unit.date}`} />
            ))}

            {tasks.map((task, index) => (
              <div
                className="gantt-grid-line horizontal"
                style={{ top: headerHeight + index * rowHeight, width: chartWidth }}
                key={`row-${task.id}`}
              />
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
              const selected = selectedTaskId === task.id || contextMenu?.taskId === task.id;
              return (
                <button
                  className={`gantt-bar expanded status-bg-${task.status}`}
                  key={task.id}
                  style={{
                    left: position.left,
                    top: position.y - 21,
                    width: position.width,
                    backgroundColor: task.color || '#2563eb',
                    cursor: 'pointer',
                    transition: 'transform 120ms ease, box-shadow 120ms ease, outline 120ms ease, background-color 120ms ease',
                    ...(selected
                      ? {
                          outline: '2px solid rgba(37, 99, 235, 0.35)',
                          boxShadow: '0 0 0 3px rgba(37, 99, 235, 0.18), 0 10px 22px rgba(15, 23, 42, 0.18)',
                          transform: 'translateY(-1px)'
                        }
                      : {})
                  }}
                  onClick={() => queueSingleClick(task)}
                  onDoubleClick={() => handleDoubleClick(task)}
                  onContextMenu={(event) => handleContextMenu(event, task)}
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

      <QuickActionMenu
        task={taskById.get(contextMenu?.taskId)}
        x={contextMenu?.x || 0}
        y={contextMenu?.y || 0}
        onClose={() => setContextMenu(null)}
        onAction={handleQuickAction}
      />
    </section>
  );
}
