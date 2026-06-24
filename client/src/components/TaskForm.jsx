import { useEffect, useMemo, useState } from 'react';
import { addDays, todayIso } from '../lib/dates';
import { addBuildingOption, getBuildingOptions } from '../lib/buildings';

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
  'IES',
  'Ideacom',
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
  'Utah Yamas',
];



function blankTask(project) {
  const start = project?.start_date || todayIso();
  return {
    task_name_choice: '',
    custom_task_name: '',
    building: '',
    description: '',
    trade: '',
    vendor: '',
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

function getTaskNameChoice(name) {
  return taskNameOptions.includes(name) ? name : 'Other';
}

export default function TaskForm({ project, members, tasks, editingTask, canEdit, onSave, onCancel }) {
  const [form, setForm] = useState(blankTask(project));
  const [buildingOptions, setBuildingOptions] = useState(() => getBuildingOptions());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (editingTask) {
      const taskNameChoice = getTaskNameChoice(editingTask.name || '');
      setForm({
        task_name_choice: taskNameChoice,
        custom_task_name: taskNameChoice === 'Other' ? (editingTask.name || '') : '',
        building: editingTask.building || '',
        description: editingTask.description || '',
        trade: editingTask.trade || '',
        vendor: editingTask.vendor || '',
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
      setForm(blankTask(project));
    }
    setBuildingOptions(getBuildingOptions());
    setError('');
  }, [editingTask, project]);

  useEffect(() => {
    const refreshBuildings = () => setBuildingOptions(getBuildingOptions());
    window.addEventListener('psg:buildings-updated', refreshBuildings);
    return () => window.removeEventListener('psg:buildings-updated', refreshBuildings);
  }, []);

  const parentTaskOptions = useMemo(
    () => tasks.filter((task) => !editingTask || task.id !== editingTask.id),
    [tasks, editingTask]
  );

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleBuildingBlur() {
    const value = String(form.building || '').trim();
    if (!value) return;
    const nextOptions = addBuildingOption(value);
    setBuildingOptions(nextOptions);
  }

  async function submit(event) {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      const taskName = form.task_name_choice === 'Other' ? String(form.custom_task_name || '').trim() : form.task_name_choice;
      if (!taskName) {
        throw new Error('Task name is required.');
      }

      const payload = {
        name: taskName,
        building: form.building || null,
        description: form.description || null,
        trade: form.trade || null,
        vendor: form.vendor || null,
        assigned_to: form.assigned_to || null,
        parent_task_id: form.parent_task_id || null,
        status: form.status,
        priority: form.priority,
        start_date: form.start_date,
        end_date: form.end_date,
        percent_complete: Number(form.percent_complete),
        color: form.color,
        sort_order: form.sort_order === '' ? undefined : Number(form.sort_order)
      };

      await onSave(payload);
      if (!editingTask) setForm(blankTask(project));
      if (form.building) setBuildingOptions(addBuildingOption(form.building));
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
        <label>
          Task name
          <select disabled={!canEdit} value={form.task_name_choice} onChange={(event) => updateField('task_name_choice', event.target.value)}>
            <option value="">Select a task name</option>
            {taskNameOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </label>

        {form.task_name_choice === 'Other' && (
          <label>
            Custom task name
            <textarea
              disabled={!canEdit}
              value={form.custom_task_name}
              onChange={(event) => updateField('custom_task_name', event.target.value)}
              placeholder="Type a custom task name"
              rows={3}
            />
          </label>
        )}

        <label>
          Building
          <input
            disabled={!canEdit}
            list="task-building-options"
            value={form.building}
            onChange={(event) => updateField('building', event.target.value)}
            onBlur={handleBuildingBlur}
            placeholder="Search or type a building"
          />
          <datalist id="task-building-options">
            {buildingOptions.map((building) => (
              <option key={building} value={building} />
            ))}
          </datalist>
        </label>

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
          <label>
            Assignee
            <select disabled={!canEdit} value={form.assigned_to} onChange={(event) => updateField('assigned_to', event.target.value)}>
              <option value="">Unassigned</option>
              {members.map((member) => (
                <option key={member.user_id} value={member.user_id}>{member.name}</option>
              ))}
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
