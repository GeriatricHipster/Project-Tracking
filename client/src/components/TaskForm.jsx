import { useEffect, useMemo, useState } from 'react';
import { addDays, todayIso } from '../lib/dates';

const statusOptions = [
  ['', 'Unassigned'],
  ['not_started', 'Not started'],
  ['in_progress', 'In progress'],
  ['blocked', 'Blocked'],
  ['complete', 'Complete']
];

const priorityOptions = [
  ['', 'Unassigned'],
  ['low', 'Low'],
  ['normal', 'Normal'],
  ['high', 'High'],
  ['critical', 'Critical']
];

const tradeOptions = ['CCure', 'Cameras', 'CCure & Cameras'];
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
  'Closeout'
];
const vendorOptions = [...new Set([
  'Accent Automatic',
  'Beacon',
  'Convergint',
  'DSI',
  'Everbase',
  'G4S',
  'IC&E',
  'Ideacom',
  'IES',
  'Nelson Fire',
  'OTIS',
  'Pavion',
  'Pye Barker',
  'S101',
  'SMT',
  'Stone Security',
  'USHOP',
  'Utah Yamas'
])].sort((a, b) => a.localeCompare(b));
const pmOptions = ['Austin', 'Kurt'].sort((a, b) => a.localeCompare(b));
const presetAssigneeNames = [
  'Bennett',
  'Bill',
  'Chris',
  'Derick',
  'Derick & James',
  'Derick & Justin',
  'Derick & Justin, Suvam',
  'Derick & Kenna',
  'Derick & Kyra',
  'Derick & Locksmiths',
  'Derick & Ryan',
  'Derick & Suvam',
  'James',
  'James & Derick',
  'James & Justin',
  'James & Justin, Suvam',
  'James & Kenna',
  'James & Kyra',
  'James & Locksmiths',
  'James & Ryan',
  'James & Suvam',
  'Jim',
  'Justin',
  'Justin & Derick',
  'Justin & James',
  'Justin & Kenna',
  'Justin & Kyra',
  'Justin & Locksmiths',
  'Justin & Ryan',
  'Justin & Suvam',
  'Kenna',
  'Kenna & Derick',
  'Kenna & Justin',
  'Kenna & Justin, Suvam',
  'Kenna & Kyra',
  'Kenna & Locksmiths',
  'Kenna & Ryan',
  'Kenna & Suvam',
  'Kyra',
  'Ryan',
  'Suvam',
  'Suvam & Derick',
  'Suvam & James',
  'Suvam & Justin',
  'Suvam & Kenna',
  'Suvam & Kyra',
  'Suvam & Locksmiths',
  'Suvam & Ryan'
];

function sortUnique(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b)));
}

function resolveTaskNameChoice(name) {
  const taskName = String(name || '').trim();
  if (!taskName) return { choice: '', custom: '' };
  if (taskNameOptions.includes(taskName)) {
    return { choice: taskName, custom: '' };
  }
  return { choice: 'other', custom: taskName };
}

function normalizeVendorSelection(value) {
  const text = String(value || '').trim();
  return vendorOptions.includes(text) ? text : '';
}

function blankTask(project) {
  const start = project?.start_date || todayIso();
  return {
    task_name_choice: '',
    custom_task_name: '',
    name: '',
    description: '',
    trade: '',
    vendor: '',
    vendor_secondary: '',
    pm: '',
    assigned_to: '',
    assignee_secondary: '',
    assignee_tertiary: '',
    assignee_quaternary: '',
    parent_task_id: '',
    status: '',
    priority: '',
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

  useEffect(() => {
    if (editingTask) {
      const taskNameChoice = resolveTaskNameChoice(editingTask.name || '');
      setForm({
        task_name_choice: taskNameChoice.choice,
        custom_task_name: taskNameChoice.custom,
        name: editingTask.name || '',
        description: editingTask.description || '',
        trade: editingTask.trade || '',
        vendor: normalizeVendorSelection(editingTask.vendor || ''),
        vendor_secondary: normalizeVendorSelection(editingTask.vendor_secondary || ''),
        pm: editingTask.pm || '',
        assigned_to: editingTask.assigned_to || '',
        assignee_secondary: editingTask.assignee_secondary || '',
        assignee_tertiary: editingTask.assignee_tertiary || '',
        assignee_quaternary: editingTask.assignee_quaternary || '',
        parent_task_id: editingTask.parent_task_id || '',
        status: editingTask.status || '',
        priority: editingTask.priority || '',
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

  const assigneeOptions = useMemo(
    () => sortUnique([
      ...members.map((member) => member.name).filter(Boolean),
      ...presetAssigneeNames
    ]),
    [members]
  );

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      const taskName = form.task_name_choice === 'other' ? String(form.custom_task_name || '').trim() : String(form.task_name_choice || '').trim();
      if (!taskName) {
        throw new Error('Task name is required.');
      }
      await onSave({
        ...form,
        name: taskName,
        trade: form.trade || null,
        vendor: form.vendor || null,
        vendor_secondary: form.vendor_secondary || null,
        pm: form.pm || null,
        assigned_to: form.assigned_to || null,
        assignee_secondary: form.assignee_secondary || null,
        assignee_tertiary: form.assignee_tertiary || null,
        assignee_quaternary: form.assignee_quaternary || null,
        parent_task_id: form.parent_task_id || null,
        status: form.status || 'not_started',
        priority: form.priority || 'normal',
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
          <p>{canEdit ? 'Update dates, vendor, status, responsibility, and progress.' : 'Viewer access is read-only except for project notes.'}</p>
        </div>
        {editingTask && <button className="ghost-button" onClick={onCancel} type="button">Cancel edit</button>}
      </div>

      <form className="stack" onSubmit={submit}>
        <div className="two-col">
          <label>
            Task name
            <select disabled={!canEdit} value={form.task_name_choice} onChange={(event) => updateField('task_name_choice', event.target.value)}>
              <option value="">Select a task</option>
              {taskNameOptions.map((taskName) => <option key={taskName} value={taskName}>{taskName}</option>)}
              <option value="other">Other</option>
            </select>
          </label>
          {form.task_name_choice === 'other' && (
            <label>
              Custom task name
              <input
                disabled={!canEdit}
                value={form.custom_task_name}
                onChange={(event) => updateField('custom_task_name', event.target.value)}
                placeholder="Enter custom task name"
              />
            </label>
          )}
        </div>

        <div className="two-col">
          <label>
            Trade
            <select disabled={!canEdit} value={form.trade} onChange={(event) => updateField('trade', event.target.value)}>
              <option value="">Unassigned</option>
              {tradeOptions.map((trade) => <option key={trade} value={trade}>{trade}</option>)}
            </select>
          </label>
          <label>
            Parent task
            <select disabled={!canEdit} value={form.parent_task_id} onChange={(event) => updateField('parent_task_id', event.target.value)}>
              <option value="">Unassigned</option>
              {parentTaskOptions.map((task) => <option key={task.id} value={task.id}>{task.name}</option>)}
            </select>
          </label>
        </div>

        <div className="two-col">
          <label>
            Vendor
            <select disabled={!canEdit} value={form.vendor} onChange={(event) => updateField('vendor', event.target.value)}>
              <option value="">Unassigned</option>
              {vendorOptions.map((vendor) => <option key={vendor} value={vendor}>{vendor}</option>)}
            </select>
          </label>
          <label>
            Vendor 2
            <select disabled={!canEdit} value={form.vendor_secondary} onChange={(event) => updateField('vendor_secondary', event.target.value)}>
              <option value="">Unassigned</option>
              {vendorOptions.map((vendor) => <option key={vendor} value={vendor}>{vendor}</option>)}
            </select>
          </label>
        </div>

        <div className="four-col">
          <label>
            Assignee
            <select disabled={!canEdit} value={form.assigned_to} onChange={(event) => updateField('assigned_to', event.target.value)}>
              <option value="">Unassigned</option>
              {assigneeOptions.map((member) => (
                <option key={member} value={member}>{member}</option>
              ))}
            </select>
          </label>
          <label>
            Assignee 2
            <select disabled={!canEdit} value={form.assignee_secondary} onChange={(event) => updateField('assignee_secondary', event.target.value)}>
              <option value="">Unassigned</option>
              {assigneeOptions.map((member) => <option key={member} value={member}>{member}</option>)}
            </select>
          </label>
          <label>
            Assignee 3
            <select disabled={!canEdit} value={form.assignee_tertiary} onChange={(event) => updateField('assignee_tertiary', event.target.value)}>
              <option value="">Unassigned</option>
              {assigneeOptions.map((member) => <option key={member} value={member}>{member}</option>)}
            </select>
          </label>
          <label>
            Assignee 4
            <select disabled={!canEdit} value={form.assignee_quaternary} onChange={(event) => updateField('assignee_quaternary', event.target.value)}>
              <option value="">Unassigned</option>
              {assigneeOptions.map((member) => <option key={member} value={member}>{member}</option>)}
            </select>
          </label>
        </div>

        <label>
          PM
          <select disabled={!canEdit} value={form.pm} onChange={(event) => updateField('pm', event.target.value)}>
            <option value="">Unassigned</option>
            {pmOptions.map((pm) => <option key={pm} value={pm}>{pm}</option>)}
          </select>
        </label>

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
