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
const vendorOptions = [...new Set([
  'Accent Automatic',
  'Beacon',
  'Bid Walk',
  'Convergint',
  'DSI',
  'EverBase',
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
  'USHOP',
  'Utah Yamas',
  'Yamas'
])].sort((a, b) => a.localeCompare(b));
const pmOptions = ['Austin', 'Kurt'].sort((a, b) => a.localeCompare(b));
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

function sortUnique(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b)));
}

function normalizeText(value) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeMultilineText(value) {
  return String(value ?? '').trim();
}

function blankTask(project) {
  const start = project?.start_date || todayIso();
  return {
    task_name_choice: '',
    custom_task_name: '',
    description: '',
    trade: '',
    vendor: '',
    vendor_secondary: '',
    pm: '',
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

function detectTaskNameChoice(name) {
  const text = normalizeText(name);
  if (!text) {
    return { choice: '', custom: '' };
  }
  if (taskNameOptions.includes(text)) {
    return { choice: text, custom: '' };
  }
  return { choice: 'Other', custom: name || '' };
}

export default function TaskForm({ project, tasks, editingTask, canEdit, onSave, onCancel }) {
  const [form, setForm] = useState(blankTask(project));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (editingTask) {
      const detected = detectTaskNameChoice(editingTask.name);
      setForm({
        task_name_choice: detected.choice,
        custom_task_name: detected.custom,
        description: editingTask.description || '',
        trade: editingTask.trade || '',
        vendor: editingTask.vendor || '',
        vendor_secondary: editingTask.vendor_secondary || '',
        pm: editingTask.pm || '',
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

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updateTaskNameChoice(choice) {
    setForm((current) => ({
      ...current,
      task_name_choice: choice,
      custom_task_name: choice === 'Other' ? current.custom_task_name : ''
    }));
  }

  async function submit(event) {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      const finalName = form.task_name_choice === 'Other'
        ? normalizeMultilineText(form.custom_task_name)
        : normalizeText(form.task_name_choice);

      if (!finalName) {
        throw new Error('Task name is required.');
      }

      await onSave({
        name: finalName,
        description: form.description,
        trade: form.trade || null,
        vendor: form.vendor || null,
        vendor_secondary: form.vendor_secondary || null,
        pm: form.pm || null,
        assignee_secondary: form.assignee_secondary || null,
        assignee_tertiary: form.assignee_tertiary || null,
        assignee_quaternary: form.assignee_quaternary || null,
        parent_task_id: form.parent_task_id || null,
        status: form.status || 'not_started',
        priority: form.priority || 'normal',
        percent_complete: Number(form.percent_complete),
        sort_order: form.sort_order === '' ? undefined : Number(form.sort_order),
        start_date: form.start_date,
        end_date: form.end_date,
        color: form.color
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
        {editingTask && <button className="ghost-button compact" onClick={onCancel} type="button">Cancel edit</button>}
      </div>

      <form className="stack" onSubmit={submit}>
        <label>
          Task name
          <select disabled={!canEdit} value={form.task_name_choice} onChange={(event) => updateTaskNameChoice(event.target.value)}>
            <option value="">Unassigned</option>
            {taskNameOptions.map((taskName) => (
              <option key={taskName} value={taskName}>{taskName}</option>
            ))}
          </select>
        </label>

        {form.task_name_choice === 'Other' && (
          <label>
            Other task name
            <textarea
              disabled={!canEdit}
              value={form.custom_task_name}
              onChange={(event) => updateField('custom_task_name', event.target.value)}
              placeholder="Enter a custom task name"
              rows={3}
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
            <select disabled={!canEdit} value={form.assignee_secondary} onChange={(event) => updateField('assignee_secondary', event.target.value)}>
              <option value="">Unassigned</option>
              {sortUnique(presetAssigneeNames).map((member) => (
                <option key={member} value={member}>{member}</option>
              ))}
            </select>
          </label>
          <label>
            Assignee 2
            <select disabled={!canEdit} value={form.assignee_tertiary} onChange={(event) => updateField('assignee_tertiary', event.target.value)}>
              <option value="">Unassigned</option>
              {sortUnique(presetAssigneeNames).map((member) => <option key={member} value={member}>{member}</option>)}
            </select>
          </label>
          <label>
            Assignee 3
            <select disabled={!canEdit} value={form.assignee_quaternary} onChange={(event) => updateField('assignee_quaternary', event.target.value)}>
              <option value="">Unassigned</option>
              {sortUnique(presetAssigneeNames).map((member) => <option key={member} value={member}>{member}</option>)}
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
