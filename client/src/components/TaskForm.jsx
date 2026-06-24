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

const tradeOptions = ['CCure', 'Cameras', 'CCure & Cameras'];
const vendorOptions = [
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
  'PTI (Bosch)',
  'Pye Barker',
  'S101',
  'Schindler',
  'SMT',
  'Stone Security',
  'Thyssenkrupp',
  'Utah Yamas'
];
const assigneeOptions = [
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
const pmOptions = ['Austin', 'Kurt'];

function blankTask(project) {
  const start = project?.start_date || todayIso();
  return {
    task_name_choice: '',
    task_name_custom: '',
    name: '',
    description: '',
    trade: '',
    vendor: '',
    vendor_secondary: '',
    assignee_one: '',
    assignee_two: '',
    assignee_three: '',
    assignee_four: '',
    assigned_to: '',
    parent_task_id: '',
    pm: '',
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
  const choice = String(form.task_name_choice || '').trim();
  const custom = String(form.task_name_custom || '').trim();
  if (choice === 'Other') return custom;
  if (choice) return choice;
  return String(form.name || '').trim();
}

export default function TaskForm({ project, members, tasks, editingTask, canEdit, onSave, onCancel }) {
  const [form, setForm] = useState(blankTask(project));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (editingTask) {
      const name = editingTask.name || '';
      const knownChoice = taskNameOptions.includes(name) ? name : 'Other';
      setForm({
        task_name_choice: editingTask.task_name_choice || knownChoice,
        task_name_custom: editingTask.task_name_custom || (knownChoice === 'Other' ? name : ''),
        name,
        description: editingTask.description || '',
        trade: editingTask.trade || '',
        vendor: editingTask.vendor || '',
        vendor_secondary: editingTask.vendor_secondary || '',
        assignee_one: editingTask.assignee_one || '',
        assignee_two: editingTask.assignee_two || '',
        assignee_three: editingTask.assignee_three || '',
        assignee_four: editingTask.assignee_four || '',
        assigned_to: editingTask.assigned_to || '',
        parent_task_id: editingTask.parent_task_id || '',
        pm: editingTask.pm || '',
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
    setSaving(true);
    try {
      const taskName = resolveTaskName(form);
      if (!taskName) throw new Error('Task name is required.');
      await onSave({
        ...form,
        name: taskName,
        task_name_choice: form.task_name_choice || taskName,
        task_name_custom: form.task_name_choice === 'Other' ? form.task_name_custom : '',
        trade: form.trade || null,
        vendor: form.vendor || null,
        vendor_secondary: form.vendor_secondary || null,
        assignee_one: form.assignee_one || null,
        assignee_two: form.assignee_two || null,
        assignee_three: form.assignee_three || null,
        assignee_four: form.assignee_four || null,
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

  const showCustomTaskName = form.task_name_choice === 'Other';

  return (
    <section className="panel task-form-panel">
      <div className="panel-heading">
        <div>
          <h2>{editingTask ? 'Edit task' : 'Add task'}</h2>
          <p>{canEdit ? 'Update dates, vendor, responsibility, and progress.' : 'Viewer access is read-only except for project notes.'}</p>
        </div>
        {editingTask && <button className="ghost-button" onClick={onCancel} type="button">Cancel edit</button>}
      </div>

      <form className="stack" onSubmit={submit}>
        <label>
          Task name
          <select disabled={!canEdit} value={form.task_name_choice} onChange={(event) => updateField('task_name_choice', event.target.value)}>
            <option value="">Unassigned</option>
            {taskNameOptions.map((taskName) => (
              <option key={taskName} value={taskName}>{taskName}</option>
            ))}
          </select>
        </label>

        {showCustomTaskName && (
          <label>
            Custom task name
            <textarea
              disabled={!canEdit}
              value={form.task_name_custom}
              onChange={(event) => updateField('task_name_custom', event.target.value)}
              placeholder="Type the custom task name here"
              rows={3}
            />
          </label>
        )}

        <div className="four-col">
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
            <select disabled={!canEdit} value={form.vendor_secondary} onChange={(event) => updateField('vendor_secondary', event.target.value)}>
              <option value="">Unassigned</option>
              {vendorOptions.map((vendor) => <option key={`secondary-${vendor}`} value={vendor}>{vendor}</option>)}
            </select>
          </label>
          <label>
            PM
            <select disabled={!canEdit} value={form.pm} onChange={(event) => updateField('pm', event.target.value)}>
              <option value="">Unassigned</option>
              {pmOptions.map((pm) => <option key={pm} value={pm}>{pm}</option>)}
            </select>
          </label>
        </div>

        <div className="four-col">
          <label>
            Assignee 1
            <select disabled={!canEdit} value={form.assignee_one} onChange={(event) => updateField('assignee_one', event.target.value)}>
              <option value="">Unassigned</option>
              {assigneeOptions.map((option) => <option key={`a1-${option}`} value={option}>{option}</option>)}
            </select>
          </label>
          <label>
            Assignee 2
            <select disabled={!canEdit} value={form.assignee_two} onChange={(event) => updateField('assignee_two', event.target.value)}>
              <option value="">Unassigned</option>
              {assigneeOptions.map((option) => <option key={`a2-${option}`} value={option}>{option}</option>)}
            </select>
          </label>
          <label>
            Assignee 3
            <select disabled={!canEdit} value={form.assignee_three} onChange={(event) => updateField('assignee_three', event.target.value)}>
              <option value="">Unassigned</option>
              {assigneeOptions.map((option) => <option key={`a3-${option}`} value={option}>{option}</option>)}
            </select>
          </label>
          <label>
            Assignee 4
            <select disabled={!canEdit} value={form.assignee_four} onChange={(event) => updateField('assignee_four', event.target.value)}>
              <option value="">Unassigned</option>
              {assigneeOptions.map((option) => <option key={`a4-${option}`} value={option}>{option}</option>)}
            </select>
          </label>
        </div>

        <label>
          Primary assignee
          <select disabled={!canEdit} value={form.assigned_to} onChange={(event) => updateField('assigned_to', event.target.value)}>
            <option value="">Unassigned</option>
            {members.map((member) => (
              <option key={member.user_id} value={member.user_id}>{member.name}</option>
            ))}
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
