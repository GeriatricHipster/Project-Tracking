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
const vendorOptions = [
  'AVTEC',
  'Accent Automatic',
  'Beacon',
  'Bid Walk',
  'Convergint',
  'DSI',
  'Everbase',
  'G4S',
  'IC&E',
  'Ideacom',
  'IES',
  'Misc',
  'Nelson Fire',
  'OTIS',
  'Pavion',
  'PTI',
  'Pye Barker',
  'S101',
  'SMT',
  'Stone Security',
  'USHOP'
].sort((a, b) => a.localeCompare(b));
const pmOptions = ['Austin', 'Kurt'].sort((a, b) => a.localeCompare(b));
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

const presetAssigneeNames = [
  'Bill',
  'Bennett',
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
].sort((a, b) => a.localeCompare(b));

function sortUnique(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b)));
}

function blankTask(project) {
  const start = project?.start_date || todayIso();
  return {
    name_choice: '',
    custom_task_name: '',
    description: '',
    trade: '',
    vendor: '',
    vendor_secondary: '',
    pm: '',
    assigned_to: '',
    assignee_secondary: '',
    assignee_tertiary: '',
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

function deriveTaskName(taskName) {
  const name = String(taskName || '').trim();
  if (!name) return { name_choice: '', custom_task_name: '' };
  if (taskNameOptions.includes(name)) return { name_choice: name, custom_task_name: '' };
  return { name_choice: 'Other', custom_task_name: name };
}

export default function TaskForm({ project, members, tasks, editingTask, canEdit, onSave, onCancel }) {
  const [form, setForm] = useState(blankTask(project));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (editingTask) {
      const derived = deriveTaskName(editingTask.name);
      setForm({
        name_choice: derived.name_choice,
        custom_task_name: derived.custom_task_name,
        description: editingTask.description || '',
        trade: editingTask.trade || '',
        vendor: editingTask.vendor || '',
        vendor_secondary: editingTask.vendor_secondary || '',
        pm: editingTask.pm || '',
        assigned_to: editingTask.assigned_to || '',
        assignee_secondary: editingTask.assignee_secondary || '',
        assignee_tertiary: editingTask.assignee_tertiary || '',
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
      ...presetAssigneeNames,
      ...members.map((member) => member.name).filter(Boolean)
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
      const taskName = form.name_choice === 'Other'
        ? String(form.custom_task_name || '').trim()
        : String(form.name_choice || '').trim();

      if (!taskName) {
        throw new Error('Please choose a task name or enter a custom task name.');
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

  const showCustomName = form.name_choice === 'Other';

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
        <label>
          Task name
          <select
            disabled={!canEdit}
            value={form.name_choice}
            onChange={(event) => updateField('name_choice', event.target.value)}
          >
            <option value="">Unassigned</option>
            {taskNameOptions.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>

        {showCustomName && (
          <label>
            Custom task name
            <textarea
              disabled={!canEdit}
              rows={4}
              value={form.custom_task_name}
              onChange={(event) => updateField('custom_task_name', event.target.value)}
              placeholder="Enter your custom task name here"
            />
          </label>
        )}

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

        <div className="three-col">
          <label>
            Assignee 1
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
