import { useEffect, useMemo, useState } from 'react';
import { addDays, todayIso } from '../lib/dates';

const statusOptions = [
  ['not_started', 'Not started'],
  ['in_progress', 'In progress'],
  ['blocked', 'Blocked'],
  ['complete', 'Complete']
];

const priorityOptions = [
  ['low', 'Low'],
  ['normal', 'Normal'],
  ['high', 'High'],
  ['critical', 'Critical']
];

const tradeOptions = ['CCure', 'Cameras', 'CCure & Cameras'];
const vendorOptions = ['Beacon', 'Convergint', 'Everbase', 'IC&E', 'IES', 'Ideacom', 'Pavion', 'S101', 'Utah Yamas'];
const pmOptions = ['Austin', 'Kurt'];
const taskNameOptions = [
  'Parts Procurement',
  'Preprogramming (Vendor)',
  'Preprogramming (Ccure Team) clearances/schedules etc.',
  'Ccure Operator Established',
  'UIT (IP Addresses, Firewall)',
  'Conduit Install',
  'Cable Install',
  'ADA Install',
  'Ccure Hardware Install',
  'Camera Hardware Install',
  'Panel Install',
  'Fire Integration',
  'Alarm Panel Install/Integration',
  'Elevator Integration',
  'Final Programming',
  'Vendor Testing',
  'CCure/Camera Testing',
  'Key Shop Hardware Change',
  'Punchlist',
  'Closeout',
  'Other'
];

function blankTask(project) {
  const start = project?.start_date || todayIso();
  return {
    name: '',
    description: '',
    trade: '',
    vendor: '',
    pm: '',
    assigned_to: '',
    parent_task_id: '',
    status: 'not_started',
    priority: 'normal',
    start_date: start,
    end_date: addDays(start, 5),
    percent_complete: 0,
    color: '#2563eb',
    sort_order: ''
  };
}

export default function TaskForm({ project, members, tasks, editingTask, canEdit, onSave, onCancel }) {
  const [form, setForm] = useState(blankTask(project));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [taskNameMode, setTaskNameMode] = useState('preset');

  useEffect(() => {
    if (editingTask) {
      const taskNameIsPreset = taskNameOptions.includes(editingTask.name || '');
      setTaskNameMode(taskNameIsPreset ? 'preset' : 'other');
      setForm({
        name: editingTask.name || '',
        description: editingTask.description || '',
        trade: editingTask.trade || '',
        vendor: editingTask.vendor || '',
        pm: editingTask.pm || '',
        assigned_to: editingTask.assigned_to || '',
        parent_task_id: editingTask.parent_task_id || '',
        status: editingTask.status || 'not_started',
        priority: editingTask.priority || 'normal',
        start_date: editingTask.start_date || project?.start_date || todayIso(),
        end_date: editingTask.end_date || project?.start_date || todayIso(),
        percent_complete: editingTask.percent_complete || 0,
        color: editingTask.color || '#2563eb',
        sort_order: editingTask.sort_order || ''
      });
    } else {
      setTaskNameMode('preset');
      setForm(blankTask(project));
    }
    setError('');
  }, [editingTask, project]);

  const parentTaskOptions = useMemo(
    () => tasks.filter((task) => !editingTask || task.id !== editingTask.id),
    [tasks, editingTask]
  );

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      await onSave({
        ...form,
        trade: form.trade || null,
        vendor: form.vendor || null,
        pm: form.pm || null,
        assigned_to: form.assigned_to || null,
        parent_task_id: form.parent_task_id || null,
        percent_complete: Number(form.percent_complete),
        sort_order: form.sort_order === '' ? undefined : Number(form.sort_order)
      });
      if (!editingTask) setForm(blankTask(project));
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="panel task-form-panel">
      <div className="panel-heading">
        <div>
          <h2>{editingTask ? 'Edit task' : 'Add task'}</h2>
          <p>{canEdit ? 'Update dates, vendor, status, and progress.' : 'Viewer access is read-only except for project notes.'}</p>
        </div>
        {editingTask && <button className="ghost-button" onClick={onCancel} type="button">Cancel edit</button>}
      </div>

      <form className="stack" onSubmit={submit}>
        <div className="task-name-section">
          <div className="task-name-toggle" role="tablist" aria-label="Task name entry mode">
            <button
              className={taskNameMode === 'preset' ? 'active' : ''}
              disabled={!canEdit}
              onClick={() => {
                if (!canEdit) return;
                setTaskNameMode('preset');
                if (!taskNameOptions.includes(form.name)) updateField('name', '');
              }}
              type="button"
            >
              Task list
            </button>
            <button
              className={taskNameMode === 'other' ? 'active' : ''}
              disabled={!canEdit}
              onClick={() => {
                if (!canEdit) return;
                setTaskNameMode('other');
                if (taskNameOptions.includes(form.name)) updateField('name', '');
              }}
              type="button"
            >
              Other
            </button>
          </div>

          {taskNameMode === 'preset' ? (
            <label>
              Task name
              <select
                disabled={!canEdit}
                value={taskNameOptions.includes(form.name) ? form.name : ''}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  if (nextValue === '__other__') {
                    setTaskNameMode('other');
                    updateField('name', '');
                    return;
                  }
                  updateField('name', nextValue);
                }}
              >
                <option value="">Select a task name</option>
                {taskNameOptions.filter((option) => option !== 'Other').map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
                <option value="__other__">Other</option>
              </select>
            </label>
          ) : (
            <label>
              Custom task name
              <textarea
                disabled={!canEdit}
                value={form.name}
                onChange={(event) => updateField('name', event.target.value)}
                placeholder="Type a custom task name"
                rows={3}
              />
            </label>
          )}
        </div>

        <div className="three-col">
          <label>
            Trade
            <select disabled={!canEdit} value={form.trade} onChange={(event) => updateField('trade', event.target.value)}>
              <option value=""> </option>
              {tradeOptions.map((trade) => <option key={trade} value={trade}>{trade}</option>)}
            </select>
          </label>
          <label>
            Vendor
            <select disabled={!canEdit} value={form.vendor} onChange={(event) => updateField('vendor', event.target.value)}>
              <option value=""> </option>
              {vendorOptions.map((vendor) => <option key={vendor} value={vendor}>{vendor}</option>)}
            </select>
          </label>
        </div>

        <div className="three-col">
          <label>
            PM
            <select disabled={!canEdit} value={form.pm} onChange={(event) => updateField('pm', event.target.value)}>
              <option value=""> </option>
              {pmOptions.map((pm) => <option key={pm} value={pm}>{pm}</option>)}
            </select>
          </label>
          <label>
            Parent task
            <select disabled={!canEdit} value={form.parent_task_id} onChange={(event) => updateField('parent_task_id', event.target.value)}>
              <option value="">None</option>
              {parentTaskOptions.map((task) => <option key={task.id} value={task.id}>{task.name}</option>)}
            </select>
          </label>
        </div>

        <label>
          Description
          <textarea disabled={!canEdit} value={form.description} onChange={(event) => updateField('description', event.target.value)} placeholder="Scope, constraints, notes, inspection needs" />
        </label>

        <div className="two-col">
          <label>
            Start
            <input disabled={!canEdit} type="date" value={form.start_date} onChange={(event) => updateField('start_date', event.target.value)} />
          </label>
          <label>
            Finish
            <input disabled={!canEdit} type="date" value={form.end_date} onChange={(event) => updateField('end_date', event.target.value)} />
          </label>
        </div>

        <div className="three-col">
          <label>
            Status
            <select disabled={!canEdit} value={form.status} onChange={(event) => updateField('status', event.target.value)}>
              {statusOptions.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
            </select>
          </label>
          <label>
            Priority
            <select disabled={!canEdit} value={form.priority} onChange={(event) => updateField('priority', event.target.value)}>
              {priorityOptions.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
            </select>
          </label>
          <label>
            Percent complete
            <input disabled={!canEdit} type="number" min="0" max="100" value={form.percent_complete} onChange={(event) => updateField('percent_complete', event.target.value)} />
          </label>
        </div>

        <div className="two-col">
          <label>
            Color
            <input disabled={!canEdit} type="color" value={form.color} onChange={(event) => updateField('color', event.target.value)} />
          </label>
          <label>
            Sort order
            <input disabled={!canEdit} type="number" value={form.sort_order} onChange={(event) => updateField('sort_order', event.target.value)} placeholder="Auto" />
          </label>
        </div>

        {error && <p className="error-box">{error}</p>}
        <button className="primary-button" disabled={!canEdit || saving}>{saving ? 'Saving...' : editingTask ? 'Update task' : 'Add task'}</button>
      </form>
    </section>
  );
}
