import { useEffect, useMemo, useState } from 'react';
import { addDays, formatDateInput, parseFlexibleDate, todayIso } from '../lib/dates';
import { addCustomListValue, getMergedList } from '../lib/customLists';

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
  'CCure Operator Established',
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
  'CCure Member Testing',
  'Camera Member Testing',
  'Key Shop Hardware Change',
  'Punchlist',
  'Closeout',
  'Other'
];

const tradeOptions = ['CCure', 'Cameras', 'CCure & Cameras', 'Lock smiths'];
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
  'SMT',
  'Stone Security',
  'Thyssenkrupp',
  'Utah Yamas'
];

const securitySystemsOptions = [
  'Bill',
  'Bennett',
  'Chris',
  'Derick',
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
  'Locksmiths',
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

const locksmithOptions = ['Bill', 'Bennett', 'Chris', 'Jim', 'Custom'];

function blankTask(project) {
  const start = project?.start_date || todayIso();
  const displayStart = formatDateInput(start);
  return {
    name_mode: '',
    custom_name: '',
    name: '',
    description: '',
    trade: '',
    trade_custom: '',
    vendor: '',
    security_team_member: '',
    security_team_member_custom: '',
    security_systems_2: '',
    security_systems_2_custom: '',
    locksmiths: '',
    locksmiths_custom: '',
    other_assignment: '',
    other_assignment_custom: '',
    pm: '',
    assigned_to: '',
    parent_task_id: '',
    status: 'not_started',
    priority: 'normal',
    start_date: displayStart,
    end_date: formatDateInput(addDays(start, 5)),
    percent_complete: 0,
    color: '#2563eb',
    sort_order: ''
  };
}

function fieldValue(form, field) {
  return form[field] || '';
}

function normalizeCustomValue(value, fallback = '') {
  const text = String(value || '').trim();
  return text || fallback;
}

export default function TaskForm({ project, members, tasks, editingTask, canEdit, onSave, onCancel }) {
  const [form, setForm] = useState(blankTask(project));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (editingTask) {
      const start = editingTask.start_date || project?.start_date || todayIso();
      const end = editingTask.end_date || project?.end_date || addDays(start, 5);
      const nameInList = taskNameOptions.includes(editingTask.name || '');
      setForm({
        name_mode: nameInList ? editingTask.name : 'Other',
        custom_name: nameInList ? '' : (editingTask.name || ''),
        name: editingTask.name || '',
        description: editingTask.description || '',
        trade: editingTask.trade || '',
        trade_custom: tradeOptions.includes(editingTask.trade || '') ? '' : (editingTask.trade || ''),
        vendor: editingTask.vendor || '',
        security_team_member: editingTask.security_team_member || '',
        security_team_member_custom: securitySystemsOptions.includes(editingTask.security_team_member || '') ? '' : (editingTask.security_team_member || ''),
        security_systems_2: editingTask.security_systems_2 || '',
        security_systems_2_custom: securitySystemsOptions.includes(editingTask.security_systems_2 || '') ? '' : (editingTask.security_systems_2 || ''),
        locksmiths: editingTask.locksmiths || '',
        locksmiths_custom: locksmithOptions.includes(editingTask.locksmiths || '') ? '' : (editingTask.locksmiths || ''),
        other_assignment: editingTask.other_assignment || '',
        other_assignment_custom: '',
        pm: editingTask.pm || '',
        assigned_to: editingTask.assigned_to || '',
        parent_task_id: editingTask.parent_task_id || '',
        status: editingTask.status || 'not_started',
        priority: editingTask.priority || 'normal',
        start_date: formatDateInput(start),
        end_date: formatDateInput(end),
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

  function handleChoice(field, value, defaults = []) {
    updateField(field, value);
    if (value !== 'Custom') {
      updateField(`${field}_custom`, '');
      return;
    }
    const custom = window.prompt(`Enter a new ${field.replace(/_/g, ' ')} value.`);
    if (custom && custom.trim()) {
      const next = addCustomListValue(field, custom.trim());
      updateField(field, custom.trim());
      updateField(`${field}_custom`, '');
      return next;
    }
    updateField(field, '');
  }

  async function submit(event) {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      const taskName = form.name_mode === 'Other'
        ? normalizeCustomValue(form.custom_name)
        : normalizeCustomValue(form.name || form.name_mode);

      if (!taskName) {
        throw new Error('Task name is required.');
      }

      const payload = {
        ...form,
        name: taskName,
        trade: form.trade === 'Custom' ? normalizeCustomValue(form.trade_custom) : form.trade || null,
        vendor: form.vendor || null,
        security_team_member: form.security_team_member === 'Custom' ? normalizeCustomValue(form.security_team_member_custom) : form.security_team_member || null,
        security_systems_2: form.security_systems_2 === 'Custom' ? normalizeCustomValue(form.security_systems_2_custom) : form.security_systems_2 || null,
        locksmiths: form.locksmiths === 'Custom' ? normalizeCustomValue(form.locksmiths_custom) : form.locksmiths || null,
        other_assignment: form.other_assignment === 'Custom' ? normalizeCustomValue(form.other_assignment_custom) : form.other_assignment || null,
        pm: form.pm || null,
        assigned_to: form.assigned_to || null,
        parent_task_id: form.parent_task_id || null,
        percent_complete: Number(form.percent_complete),
        start_date: parseFlexibleDate(form.start_date),
        end_date: parseFlexibleDate(form.end_date),
        sort_order: form.sort_order === '' ? undefined : Number(form.sort_order)
      };

      if (payload.trade) addCustomListValue('task_trade', payload.trade);
      addCustomListValue('task_security_1', payload.security_team_member || '');
      addCustomListValue('task_security_2', payload.security_systems_2 || '');
      addCustomListValue('task_locksmiths', payload.locksmiths || '');
      addCustomListValue('task_other', payload.other_assignment || '');

      await onSave(payload);
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
            <select disabled={!canEdit} value={form.name_mode || (taskNameOptions.includes(form.name) ? form.name : 'Other')} onChange={(event) => updateField('name_mode', event.target.value)}>
              <option value="">Unassigned</option>
              {taskNameOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          <label>
            Custom task name
            <textarea
              disabled={!canEdit || (form.name_mode !== 'Other')}
              rows={2}
              value={form.custom_name}
              onChange={(event) => updateField('custom_name', event.target.value)}
              placeholder="Use this only when Other is selected"
            />
          </label>
        </div>

        <div className="four-col">
          <label>
            Trade
            <select disabled={!canEdit} value={form.trade} onChange={(event) => updateField('trade', event.target.value)}>
              <option value="">Unassigned</option>
              {getMergedList('task_trade', tradeOptions).map((trade) => <option key={trade} value={trade}>{trade}</option>)}
              <option value="Custom">Custom</option>
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
            Assignee
            <select disabled={!canEdit} value={form.assigned_to} onChange={(event) => updateField('assigned_to', event.target.value)}>
              <option value="">Unassigned</option>
              {members.map((member) => (
                <option key={member.user_id} value={member.user_id}>{member.name}</option>
              ))}
            </select>
          </label>
          <label>
            PM
            <select disabled={!canEdit} value={form.pm} onChange={(event) => updateField('pm', event.target.value)}>
              <option value="">Unassigned</option>
              {['Austin', 'Kurt'].sort((a, b) => a.localeCompare(b)).map((pm) => <option key={pm} value={pm}>{pm}</option>)}
            </select>
          </label>
        </div>

        {form.trade === 'Custom' && (
          <label>
            Custom trade
            <input disabled={!canEdit} value={form.trade_custom} onChange={(event) => updateField('trade_custom', event.target.value)} placeholder="Type a custom trade" />
          </label>
        )}

        <div className="four-col">
          <label>
            Security Systems 1
            <select disabled={!canEdit} value={form.security_team_member} onChange={(event) => updateField('security_team_member', event.target.value)}>
              <option value="">Unassigned</option>
              {getMergedList('task_security_1', securitySystemsOptions).map((member) => <option key={member} value={member}>{member}</option>)}
              <option value="Custom">Custom</option>
            </select>
          </label>
          <label>
            Security Systems 2
            <select disabled={!canEdit} value={form.security_systems_2} onChange={(event) => updateField('security_systems_2', event.target.value)}>
              <option value="">Unassigned</option>
              {getMergedList('task_security_2', securitySystemsOptions).map((member) => <option key={member} value={member}>{member}</option>)}
              <option value="Custom">Custom</option>
            </select>
          </label>
          <label>
            Lock Smiths
            <select disabled={!canEdit} value={form.locksmiths} onChange={(event) => updateField('locksmiths', event.target.value)}>
              <option value="">Unassigned</option>
              {getMergedList('task_locksmiths', locksmithOptions).map((member) => <option key={member} value={member}>{member}</option>)}
              <option value="Custom">Custom</option>
            </select>
          </label>
          <label>
            Other
            <select disabled={!canEdit} value={form.other_assignment} onChange={(event) => updateField('other_assignment', event.target.value)}>
              <option value="">Unassigned</option>
              <option value="Custom">Custom</option>
            </select>
          </label>
        </div>

        {form.security_team_member === 'Custom' && (
          <label>
            Security Systems 1 custom
            <input disabled={!canEdit} value={form.security_team_member_custom} onChange={(event) => updateField('security_team_member_custom', event.target.value)} placeholder="Type a custom option" />
          </label>
        )}

        {form.security_systems_2 === 'Custom' && (
          <label>
            Security Systems 2 custom
            <input disabled={!canEdit} value={form.security_systems_2_custom} onChange={(event) => updateField('security_systems_2_custom', event.target.value)} placeholder="Type a custom option" />
          </label>
        )}

        {form.locksmiths === 'Custom' && (
          <label>
            Lock Smiths custom
            <input disabled={!canEdit} value={form.locksmiths_custom} onChange={(event) => updateField('locksmiths_custom', event.target.value)} placeholder="Type a custom option" />
          </label>
        )}

        {form.other_assignment === 'Custom' && (
          <label>
            Other custom value
            <input
              disabled={!canEdit}
              value={form.other_assignment_custom}
              onChange={(event) => updateField('other_assignment_custom', event.target.value)}
              placeholder="Type a custom value"
            />
          </label>
        )}

        <label>
          Description
          <textarea disabled={!canEdit} value={form.description} onChange={(event) => updateField('description', event.target.value)} placeholder="Scope, constraints, notes, inspection needs" />
        </label>

        <div className="two-col">
          <label>
            Start
            <input disabled={!canEdit} type="text" inputMode="numeric" value={fieldValue(form, 'start_date')} onChange={(event) => updateField('start_date', event.target.value)} placeholder="MM-DD-YYYY" />
          </label>
          <label>
            Finish
            <input disabled={!canEdit} type="text" inputMode="numeric" value={fieldValue(form, 'end_date')} onChange={(event) => updateField('end_date', event.target.value)} placeholder="MM-DD-YYYY" />
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
