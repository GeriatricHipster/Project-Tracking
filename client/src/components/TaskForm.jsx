import { useEffect, useMemo, useState } from 'react';
import { addDays, todayIso } from '../lib/dates';
import { assigneeOptions, projectManagerOptions, taskNameOptions, tradeOptions, vendorOptions } from '../lib/taskOptions';

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

const assigneeFields = ['assignee_1', 'assignee_2', 'assignee_3', 'assignee_4'];

function blankTask(project) {
  const start = project?.start_date || todayIso();
  return {
    task_name_choice: '',
    task_name_custom: '',
    description: '',
    trade: '',
    vendor: '',
    vendor_2: '',
    assignee_1: '',
    assignee_2: '',
    assignee_3: '',
    assignee_4: '',
    pm: '',
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

function resolveTaskName(form) {
  if (form.task_name_choice === 'Other') {
    return String(form.task_name_custom || '').trim();
  }
  return String(form.task_name_choice || '').trim();
}

export default function TaskForm({ project, tasks, editingTask, canEdit, onSave, onCancel }) {
  const [form, setForm] = useState(blankTask(project));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (editingTask) {
      const nameChoice = taskNameOptions.includes(editingTask.name) ? editingTask.name : 'Other';
      setForm({
        task_name_choice: nameChoice,
        task_name_custom: nameChoice === 'Other' ? editingTask.name || '' : '',
        description: editingTask.description || '',
        trade: editingTask.trade || '',
        vendor: editingTask.vendor || '',
        vendor_2: editingTask.vendor_2 || '',
        assignee_1: editingTask.assignee_1 || '',
        assignee_2: editingTask.assignee_2 || '',
        assignee_3: editingTask.assignee_3 || '',
        assignee_4: editingTask.assignee_4 || '',
        pm: editingTask.pm || '',
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
    const resolvedName = resolveTaskName(form);
    if (!resolvedName) {
      setError(form.task_name_choice === 'Other' ? 'Please enter a custom task name.' : 'Please choose a task name.');
      return;
    }

    setSaving(true);
    try {
      await onSave({
        name: resolvedName,
        description: form.description,
        trade: form.trade || null,
        vendor: form.vendor || null,
        vendor_2: form.vendor_2 || null,
        assignee_1: form.assignee_1 || null,
        assignee_2: form.assignee_2 || null,
        assignee_3: form.assignee_3 || null,
        assignee_4: form.assignee_4 || null,
        pm: form.pm || null,
        parent_task_id: form.parent_task_id || null,
        status: form.status,
        priority: form.priority,
        start_date: form.start_date,
        end_date: form.end_date,
        percent_complete: Number(form.percent_complete),
        color: form.color,
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
          <p>{canEdit ? 'Update dates, vendors, assignees, status, and progress.' : 'Viewer access is read-only except for project notes.'}</p>
        </div>
        {editingTask && <button className="ghost-button" onClick={onCancel} type="button">Cancel edit</button>}
      </div>

      <form className="stack" onSubmit={submit}>
        <label>
          Task name
          <select disabled={!canEdit} value={form.task_name_choice} onChange={(event) => updateField('task_name_choice', event.target.value)}>
            <option value="">Unassigned</option>
            {taskNameOptions.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>

        {form.task_name_choice === 'Other' && (
          <label>
            Custom task name
            <textarea
              disabled={!canEdit}
              value={form.task_name_custom}
              onChange={(event) => updateField('task_name_custom', event.target.value)}
              placeholder="Enter a custom task name"
              rows={3}
            />
          </label>
        )}

        <div className="three-col">
          <label>
            Trade
            <select disabled={!canEdit} value={form.trade} onChange={(event) => updateField('trade', event.target.value)}>
              <option value="">Unassigned</option>
              {tradeOptions.map((trade) => <option key={trade} value={trade}>{trade}</option>)}
            </select>
          </label>
          <label>
            Vendor
            <select disabled={!canEdit} value={form.vendor} onChange={(event) => updateField('vendor', event.target.value)}>
              <option value="">Unassigned</option>
              {vendorOptions.map((vendor) => <option key={vendor} value={vendor}>{vendor}</option>)}
            </select>
          </label>
          <label>
            Vendor 2
            <select disabled={!canEdit} value={form.vendor_2} onChange={(event) => updateField('vendor_2', event.target.value)}>
              <option value="">Unassigned</option>
              {vendorOptions.map((vendor) => <option key={vendor} value={vendor}>{vendor}</option>)}
            </select>
          </label>
        </div>

        <div className="four-col">
          {assigneeFields.map((field, index) => (
            <label key={field}>
              Assignee {index + 1}
              <select disabled={!canEdit} value={form[field]} onChange={(event) => updateField(field, event.target.value)}>
                <option value="">Unassigned</option>
                {assigneeOptions.map((assignee) => <option key={assignee} value={assignee}>{assignee}</option>)}
              </select>
            </label>
          ))}
        </div>

        <div className="two-col">
          <label>
            PM
            <select disabled={!canEdit} value={form.pm} onChange={(event) => updateField('pm', event.target.value)}>
              <option value="">Unassigned</option>
              {projectManagerOptions.map((pm) => <option key={pm} value={pm}>{pm}</option>)}
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
