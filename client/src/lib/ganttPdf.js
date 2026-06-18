import { addDays, daysBetween, formatDate, maxIsoDate, minIsoDate } from './dates';

const APP_NAME = 'PSG and SS Tracking';

const statusLabels = {
  not_started: 'Not started',
  in_progress: 'In progress',
  blocked: 'Blocked',
  complete: 'Complete'
};

function safeText(value, fallback = '') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function sanitizeFileName(value) {
  return safeText(value, 'project')
    .replace(/[^a-z0-9]+/gi, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80) || 'project';
}

function hexToRgb(hex, fallback = [37, 99, 235]) {
  const text = String(hex || '').trim().replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(text)) return fallback;
  return [
    parseInt(text.slice(0, 2), 16),
    parseInt(text.slice(2, 4), 16),
    parseInt(text.slice(4, 6), 16)
  ];
}

function withAlpha(rgb, alpha, background = [255, 255, 255]) {
  return rgb.map((channel, index) => Math.round(channel * alpha + background[index] * (1 - alpha)));
}

function taskMeta(task) {
  const parts = [];
  if (task.trade) parts.push(task.trade);
  if (task.vendor) parts.push(task.vendor);
  if (task.security_team_member) parts.push(`Security: ${task.security_team_member}`);
  if (task.pm) parts.push(`PM: ${task.pm}`);
  if (task.assigned_to_name) parts.push(`Assignee: ${task.assigned_to_name}`);
  return parts.join(' | ');
}

function fitText(doc, text, maxWidth) {
  const clean = safeText(text);
  if (!clean) return '';
  if (doc.getTextWidth(clean) <= maxWidth) return clean;
  let clipped = clean;
  while (clipped.length > 3 && doc.getTextWidth(`${clipped}...`) > maxWidth) {
    clipped = clipped.slice(0, -1);
  }
  return `${clipped}...`;
}

function drawPageHeader(doc, { project, rangeStart, rangeEnd, pageNumber, totalPages }) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 30;
  doc.setFillColor(17, 24, 39);
  doc.rect(0, 0, pageWidth, 78, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(`${APP_NAME} - Gantt Chart`, margin, 30);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Project: ${safeText(project.name, 'Untitled project')}`, margin, 49);
  doc.text(`Schedule: ${formatDate(rangeStart)} to ${formatDate(rangeEnd)}`, margin, 64);
  doc.text(`Page ${pageNumber} of ${totalPages}`, pageWidth - margin, 30, { align: 'right' });
  doc.text(`Exported ${new Date().toLocaleString()}`, pageWidth - margin, 49, { align: 'right' });
  doc.setTextColor(17, 24, 39);
}

function drawTimelineHeader(doc, { chartX, chartY, chartWidth, headerHeight, rangeStart, totalDays, chartBottom }) {
  const ticks = Math.min(8, Math.max(2, totalDays));
  doc.setDrawColor(209, 213, 219);
  doc.setFillColor(248, 250, 252);
  doc.rect(chartX, chartY, chartWidth, headerHeight, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(55, 65, 81);

  for (let index = 0; index <= ticks; index += 1) {
    const dayOffset = Math.round((index / ticks) * totalDays);
    const date = addDays(rangeStart, dayOffset);
    const x = chartX + (dayOffset / Math.max(totalDays, 1)) * chartWidth;
    doc.setDrawColor(229, 231, 235);
    doc.line(x, chartY, x, chartBottom);
    const label = date.slice(5);
    doc.text(label, Math.min(x + 3, chartX + chartWidth - 26), chartY + 17);
    doc.setFont('helvetica', 'normal');
    doc.text(date.slice(0, 4), Math.min(x + 3, chartX + chartWidth - 26), chartY + 30);
    doc.setFont('helvetica', 'bold');
  }
}

function drawDependencySummary(doc, { dependencies, tasksById, pageWidth, pageHeight, margin }) {
  if (!dependencies.length) return;
  doc.addPage();
  doc.setTextColor(17, 24, 39);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Dependency summary', margin, 42);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Use this page as a quick reference for predecessor/successor task links.', margin, 60);

  let y = 88;
  const rowHeight = 24;
  const usableWidth = pageWidth - margin * 2;
  const predecessorWidth = usableWidth * 0.42;
  const typeWidth = 60;
  const successorWidth = usableWidth - predecessorWidth - typeWidth - 14;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(229, 231, 235);
  doc.rect(margin, y - 16, usableWidth, rowHeight, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.text('Predecessor', margin + 8, y);
  doc.text('Type', margin + predecessorWidth + 8, y);
  doc.text('Successor', margin + predecessorWidth + typeWidth + 14, y);
  doc.setFont('helvetica', 'normal');
  y += rowHeight;

  dependencies.forEach((dependency) => {
    if (y > pageHeight - 44) {
      doc.addPage();
      y = 44;
    }
    const predecessor = tasksById.get(dependency.predecessor_task_id);
    const successor = tasksById.get(dependency.successor_task_id);
    doc.setDrawColor(229, 231, 235);
    doc.line(margin, y + 7, pageWidth - margin, y + 7);
    doc.text(fitText(doc, predecessor?.name || 'Unknown task', predecessorWidth - 14), margin + 8, y);
    doc.text(safeText(dependency.dependency_type, 'FS'), margin + predecessorWidth + 8, y);
    doc.text(fitText(doc, successor?.name || 'Unknown task', successorWidth - 14), margin + predecessorWidth + typeWidth + 14, y);
    y += rowHeight;
  });
}

export async function exportGanttChartPdf({ project, tasks, dependencies = [] }) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'letter' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 30;
  const labelWidth = 235;
  const chartX = margin + labelWidth + 12;
  const chartWidth = pageWidth - chartX - margin;
  const chartY = 112;
  const headerHeight = 38;
  const rowHeight = 34;
  const allStartDates = [project.start_date, ...tasks.map((task) => task.start_date)].filter(Boolean);
  const allEndDates = [project.end_date, ...tasks.map((task) => task.end_date)].filter(Boolean);
  const rangeStart = minIsoDate(allStartDates) || project.start_date;
  const rangeEnd = maxIsoDate(allEndDates) || project.end_date;
  const totalDays = Math.max(1, daysBetween(rangeStart, rangeEnd) + 1);
  const rowsPerPage = Math.max(1, Math.floor((pageHeight - chartY - headerHeight - 42) / rowHeight));
  const totalPages = Math.max(1, Math.ceil(Math.max(tasks.length, 1) / rowsPerPage));
  const today = new Date().toISOString().slice(0, 10);
  const todayInsideRange = today >= rangeStart && today <= rangeEnd;
  const tasksById = new Map(tasks.map((task) => [task.id, task]));

  for (let pageIndex = 0; pageIndex < totalPages; pageIndex += 1) {
    if (pageIndex > 0) doc.addPage();
    drawPageHeader(doc, { project, rangeStart, rangeEnd, pageNumber: pageIndex + 1, totalPages });

    doc.setTextColor(17, 24, 39);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Task / responsibility', margin, chartY + 25);
    const chartBottom = Math.min(pageHeight - 42, chartY + headerHeight + Math.max(1, Math.min(rowsPerPage, Math.max(tasks.length - pageIndex * rowsPerPage, 1))) * rowHeight);
    drawTimelineHeader(doc, { chartX, chartY, chartWidth, headerHeight, rangeStart, totalDays, chartBottom });

    if (todayInsideRange) {
      const todayX = chartX + (daysBetween(rangeStart, today) / totalDays) * chartWidth;
      doc.setDrawColor(239, 68, 68);
      doc.setLineWidth(1.5);
      doc.line(todayX, chartY, todayX, pageHeight - 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(185, 28, 28);
      doc.text('Today', todayX + 4, chartY + headerHeight + 11);
      doc.setLineWidth(0.5);
    }

    const pageTasks = tasks.slice(pageIndex * rowsPerPage, (pageIndex + 1) * rowsPerPage);
    const displayTasks = pageTasks.length ? pageTasks : [{ id: 'empty', name: 'No tasks yet', start_date: rangeStart, end_date: rangeStart, percent_complete: 0, status: 'not_started' }];

    displayTasks.forEach((task, rowIndex) => {
      const rowTop = chartY + headerHeight + rowIndex * rowHeight;
      const rowMid = rowTop + rowHeight / 2;
      doc.setDrawColor(229, 231, 235);
      doc.line(margin, rowTop, pageWidth - margin, rowTop);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(17, 24, 39);
      doc.text(fitText(doc, task.name, labelWidth - 8), margin, rowTop + 13);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      const meta = taskMeta(task) || statusLabels[task.status] || 'Not started';
      doc.text(fitText(doc, meta, labelWidth - 8), margin, rowTop + 25);

      if (task.id !== 'empty') {
        const taskStartOffset = clampNumber(daysBetween(rangeStart, task.start_date), 0, totalDays);
        const taskDuration = Math.max(1, daysBetween(task.start_date, task.end_date) + 1);
        const barLeft = chartX + (taskStartOffset / totalDays) * chartWidth;
        const barWidth = Math.max(6, Math.min(chartWidth - (barLeft - chartX), (taskDuration / totalDays) * chartWidth));
        const barTop = rowMid - 8;
        const color = hexToRgb(task.color);
        doc.setFillColor(...withAlpha(color, 0.18));
        doc.roundedRect(chartX, rowTop + 4, chartWidth, rowHeight - 8, 5, 5, 'F');
        doc.setFillColor(...color);
        doc.roundedRect(barLeft, barTop, barWidth, 16, 8, 8, 'F');
        const progressWidth = Math.max(0, Math.min(barWidth, barWidth * (Number(task.percent_complete || 0) / 100)));
        if (progressWidth > 0) {
          doc.setFillColor(...withAlpha([255, 255, 255], 0.35, color));
          doc.roundedRect(barLeft, barTop, progressWidth, 16, 8, 8, 'F');
        }
        doc.setTextColor(17, 24, 39);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        const label = `${Number(task.percent_complete || 0)}%`;
        doc.text(label, Math.min(barLeft + barWidth + 5, pageWidth - margin - 18), rowMid + 2);
      }
    });

    doc.setDrawColor(229, 231, 235);
    doc.line(margin, pageHeight - 28, pageWidth - margin, pageHeight - 28);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`${tasks.length} task${tasks.length === 1 ? '' : 's'} | ${dependencies.length} dependenc${dependencies.length === 1 ? 'y' : 'ies'}`, margin, pageHeight - 14);
    doc.text(APP_NAME, pageWidth - margin, pageHeight - 14, { align: 'right' });
  }

  drawDependencySummary(doc, { dependencies, tasksById, pageWidth, pageHeight, margin });

  const fileName = `${sanitizeFileName(APP_NAME)}_Gantt_${sanitizeFileName(project.name)}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);
}

function clampNumber(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
