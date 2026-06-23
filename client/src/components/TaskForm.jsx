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
const vendorOptions = ['Everbase', 'IES', 'Ideacom', 'Utah Yamas', 'Convergint', 'Pavion', 'Beacon', 'Stone Security', 'S101'];
const securityTeamOptions = ['Derick', 'Eric', 'James', 'Justin', 'Kenna', 'Kyra', 'Ryan', 'Suvam'];
const pmOptions = ['Kurt', 'Austin'];

function blankTask(project) {
  const start = project?.start_date || todayIso();
  return {
    name: '',
    description: '',
    trade: '',
    vendor: '',
    security_team_member: '',
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

  useEffect(() => {
    if (editingTask) {
      setForm({
        name: editingTask.name || '',
        description: editingTask.description || '',
        trade: editingTask.trade || '',
        vendor: editingTask.vendor || '',
        security_team_member: editingTask.security_team_member || '',
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
      setForm(blankTask(project));
    }
    setError('');
  }, [editingTask, project]);

  const parentTaskOptions = useMemo(
    () => tasks.filter((task) => !editingTask || task.id !== editingTask.id),
    [tasks, editingTask]
  );

  const assigneeOptions = useMemo(
    () => [...members]
      .map((member) => ({
        id: member.user_id ?? member.id,
        name: member.name || member.email || 'Unnamed member'
      }))
      .filter((member) => member.id)
      .sort((a, b) => String(a.name).localeCompare(String(b.name))),
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
      await onSave({
        ...form,
        trade: form.trade || null,
        vendor: form.vendor || null,
        security_team_member: form.security_team_member || null,
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
          <p>{canEdit ? 'Update dates, vendor, status, responsibility, and progress.' : 'Viewer access is read-only except for project notes.'}</p>
        </div>
        {editingTask && <button className="ghost-button" onClick={onCancel} type="button">Cancel edit</button>}
      </div>

      <form className="stack" onSubmit={submit}>
        <label>
          Task name
          <input disabled={!canEdit} value={form.name} onChange={(event) => updateField('name', event.target.value)} placeholder="Panel installation" />
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
              {assigneeOptions.length ? assigneeOptions.map((member) => (
                <option key={member.id} value={member.id}>{member.name}</option>
              )) : <option value="" disabled>No project members yet</option>}
            </select>
          </label>
        </div>

        <div className="three-col">
          <label>
            Security Team Member
            <select disabled={!canEdit} value={form.security_team_member} onChange={(event) => updateField('security_team_member', event.target.value)}>
              <option value=""> </option>
              {securityTeamOptions.map((member) => <option key={member} value={member}>{member}</option>)}
            </select>
          </label>
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
