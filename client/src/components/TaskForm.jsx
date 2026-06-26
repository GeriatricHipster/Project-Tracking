import { useEffect, useMemo, useState } from 'react';
import { addDays, formatDisplayDate, parseDisplayDate, todayIso } from '../lib/dates';

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
  'Closeout'
];

const tradeDefaults = ['CCure', 'Cameras', 'CCure & Cameras', 'Lock Smiths'];
const vendorDefaults = [
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
].sort((a, b) => a.localeCompare(b));

const securitySystemsDefaults = [
  'James',
  'James & Kyra',
  'James & Ryan',
  'James & Locksmiths',
  'James & Suvam',
  'James & Justin',
  'James & Derick',
  'James & Kenna',
  'James & Justin, Suvam',
  'Kenna',
  'Kenna & Kyra',
  'Kenna & Ryan',
  'Kenna & Locksmiths',
  'Kenna & Justin',
  'Kenna & Suvam',
  'Kenna & Derick',
  'Kenna & Justin, Suvam',
  'Derick',
  'Derick & Kyra',
  'Derick & Ryan',
  'Derick & Locksmiths',
  'Derick & Justin',
  'Derick & Suvam',
  'Derick & James',
  'Derick & Kenna',
  'Derick & Justin, Suvam',
  'Justin',
  'Justin & Kyra',
  'Justin & Ryan',
  'Justin & Locksmiths',
  'Justin & Derick',
  'Justin & Suvam',
  'Justin & Kenna',
  'Justin & James',
  'Suvam',
  'Suvam & Kyra',
  'Suvam & Ryan',
  'Suvam & Locksmiths',
  'Suvam & Derick',
  'Suvam & Kenna',
  'Suvam & Justin',
  'Suvam & James',
  'Ryan',
  'Kyra'
].sort((a, b) => a.localeCompare(b));

const locksmithDefaults = ['Bennett', 'Bill', 'Chris', 'Jim'];

function uniqueValues(values) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

function prepareDateInput(value) {
  return formatDisplayDate(value || todayIso());
}

function ChoiceSelect({ label, value, onChange, onCustomCreate, options, canEdit, allowCustom = false, customLabel = 'Custom', placeholder = 'Unassigned' }) {
  const effectiveOptions = allowCustom ? [...options, customLabel] : options;

  async function handleChange(event) {
    const next = event.target.value;
    if (allowCustom && next === customLabel) {
      const entered = window.prompt(`Enter a custom value for ${label}`);
      if (entered && entered.trim()) {
        const customValue = entered.trim();
        if (typeof onCustomCreate === 'function') onCustomCreate(customValue);
        onChange(customValue);
        return;
      }
      event.target.value = value || '';
      return;
    }
    onChange(next);
  }

  return (
    <label>
      {label}
      <select disabled={!canEdit} value={value || ''} onChange={handleChange}>
        <option value="">{placeholder}</option>
        {effectiveOptions.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

export default function TaskForm({ project, members, tasks, editingTask, canEdit, onSave, onCancel }) {
  const [form, setForm] = useState({
    task_name_choice: '',
    task_name_custom: '',
    description: '',
    trade: '',
    vendor: '',
    vendor_2: '',
    security_systems_1: '',
    security_systems_2: '',
    locksmiths: '',
    other_assignee: '',
    pm: '',
    assigned_to: '',
    parent_task_id: '',
    status: 'not_started',
    priority: 'normal',
    start_date: prepareDateInput(project?.start_date),
    end_date: prepareDateInput(project?.end_date || addDays(todayIso(), 5)),
    percent_complete: 0,
    color: '#2563eb',
    sort_order: ''
  });
  const [customVendorOptions, setCustomVendorOptions] = useState([]);
  const [customTradeOptions, setCustomTradeOptions] = useState([]);
  const [customSecurityOptions, setCustomSecurityOptions] = useState([]);
  const [customLocksmithOptions, setCustomLocksmithOptions] = useState([]);
  const [customOtherOptions, setCustomOtherOptions] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const taskNameChoices = useMemo(() => uniqueValues([...taskNameOptions, ...tasks.map((task) => task.name)]), [tasks]);
  const vendorChoices = useMemo(() => uniqueValues([...vendorDefaults, ...tasks.flatMap((task) => [task.vendor, task.vendor_2]), ...customVendorOptions]), [tasks, customVendorOptions]);
  const tradeChoices = useMemo(() => uniqueValues([...tradeDefaults, ...tasks.map((task) => task.trade), ...customTradeOptions]), [tasks, customTradeOptions]);
  const securityChoices = useMemo(() => uniqueValues([...securitySystemsDefaults, ...tasks.flatMap((task) => [task.security_systems_1, task.security_systems_2]), ...customSecurityOptions]), [tasks, customSecurityOptions]);
  const locksmithChoices = useMemo(() => uniqueValues([...locksmithDefaults, ...tasks.map((task) => task.locksmiths), ...customLocksmithOptions]), [tasks, customLocksmithOptions]);
  const otherChoices = useMemo(() => uniqueValues([...customOtherOptions, form.other_assignee]), [customOtherOptions, form.other_assignee]);

  useEffect(() => {
    if (editingTask) {
      const existingName = taskNameChoices.includes(editingTask.name) ? editingTask.name : 'Other';
      setForm({
        task_name_choice: existingName === 'Other' ? 'Other' : existingName,
        task_name_custom: existingName === 'Other' ? (editingTask.name || '') : '',
        description: editingTask.description || '',
        trade: editingTask.trade || '',
        vendor: editingTask.vendor || '',
        vendor_2: editingTask.vendor_2 || '',
        security_systems_1: editingTask.security_systems_1 || '',
        security_systems_2: editingTask.security_systems_2 || '',
        locksmiths: editingTask.locksmiths || '',
        other_assignee: editingTask.other_assignee || '',
        pm: editingTask.pm || '',
        assigned_to: editingTask.assigned_to || '',
        parent_task_id: editingTask.parent_task_id || '',
        status: editingTask.status || 'not_started',
        priority: editingTask.priority || 'normal',
        start_date: formatDisplayDate(editingTask.start_date || project?.start_date || todayIso()),
        end_date: formatDisplayDate(editingTask.end_date || project?.start_date || todayIso()),
        percent_complete: editingTask.percent_complete || 0,
        color: editingTask.color || '#2563eb',
        sort_order: editingTask.sort_order || ''
      });
    } else {
      setForm({
        task_name_choice: '',
        task_name_custom: '',
        description: '',
        trade: '',
        vendor: '',
        vendor_2: '',
        security_systems_1: '',
        security_systems_2: '',
        locksmiths: '',
        other_assignee: '',
        pm: '',
        assigned_to: '',
        parent_task_id: '',
        status: 'not_started',
        priority: 'normal',
        start_date: prepareDateInput(project?.start_date),
        end_date: prepareDateInput(project?.end_date || addDays(todayIso(), 5)),
        percent_complete: 0,
        color: '#2563eb',
        sort_order: ''
      });
    }
    setError('');
  }, [editingTask, project, taskNameChoices]);

  const parentTaskOptions = useMemo(
    () => tasks.filter((task) => !editingTask || task.id !== editingTask.id),
    [tasks, editingTask]
  );

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function chooseCustom(field, optionsSetter) {
    const entered = window.prompt(`Enter a custom value for ${field}`);
    if (!entered || !entered.trim()) return;
    const next = entered.trim();
    optionsSetter((current) => uniqueValues([...current, next]));
    return next;
  }

  async function submit(event) {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      const name = form.task_name_choice === 'Other' ? form.task_name_custom.trim() : form.task_name_choice.trim();
      if (!name) throw new Error('Task name is required.');
      await onSave({
        ...form,
        name,
        description: form.description,
        trade: form.trade || null,
        vendor: form.vendor || null,
        vendor_2: form.vendor_2 || null,
        security_systems_1: form.security_systems_1 || null,
        security_systems_2: form.security_systems_2 || null,
        locksmiths: form.locksmiths || null,
        other_assignee: form.other_assignee || null,
        pm: form.pm || null,
        assigned_to: form.assigned_to || null,
        parent_task_id: form.parent_task_id || null,
        start_date: parseDisplayDate(form.start_date),
        end_date: parseDisplayDate(form.end_date),
        percent_complete: Number(form.percent_complete),
        sort_order: form.sort_order === '' ? undefined : Number(form.sort_order)
      });
      if (!editingTask) {
        setForm((current) => ({
          ...current,
          task_name_choice: '',
          task_name_custom: '',
          description: '',
          trade: '',
          vendor: '',
          vendor_2: '',
          security_systems_1: '',
          security_systems_2: '',
          locksmiths: '',
          other_assignee: '',
          pm: '',
          assigned_to: '',
          parent_task_id: '',
          status: 'not_started',
          priority: 'normal',
          start_date: prepareDateInput(project?.start_date),
          end_date: prepareDateInput(project?.end_date || addDays(todayIso(), 5)),
          percent_complete: 0,
          color: '#2563eb',
          sort_order: ''
        }));
      }
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
          <p>{canEdit ? 'Update task details, responsibility, and progress.' : 'Viewer access is read-only except for project notes.'}</p>
        </div>
        {editingTask && <button className="ghost-button" onClick={onCancel} type="button">Cancel edit</button>}
      </div>

      <form className="stack" onSubmit={submit}>
        <label>
          Task name
          <select disabled={!canEdit} value={form.task_name_choice} onChange={(event) => updateField('task_name_choice', event.target.value)}>
            <option value="">Unassigned</option>
            {taskNameChoices.map((option) => <option key={option} value={option}>{option}</option>)}
            <option value="Other">Other</option>
          </select>
        </label>

        {form.task_name_choice === 'Other' && (
          <label>
            Custom task name
            <textarea disabled={!canEdit} rows={2} value={form.task_name_custom} onChange={(event) => updateField('task_name_custom', event.target.value)} placeholder="Enter a custom task name" />
          </label>
        )}

        <div className="four-col">
          <ChoiceSelect label="Trade" value={form.trade} canEdit={canEdit} options={tradeChoices} allowCustom customLabel="Custom" onCustomCreate={(value) => setCustomTradeOptions((current) => uniqueValues([...current, value]))} onChange={(value) => {
            updateField('trade', value);
          }} />
          <label>
            Vendor
            <select disabled={!canEdit} value={form.vendor} onChange={(event) => {
              const next = event.target.value;
              if (next === 'Custom') {
                const custom = chooseCustom('vendor', setCustomVendorOptions);
                if (custom) updateField('vendor', custom);
                return;
              }
              updateField('vendor', next);
            }}>
              <option value="">Unassigned</option>
              {vendorChoices.map((vendor) => <option key={vendor} value={vendor}>{vendor}</option>)}
              <option value="Custom">Custom</option>
            </select>
          </label>
          <label>
            Vendor 2
            <select disabled={!canEdit} value={form.vendor_2} onChange={(event) => {
              const next = event.target.value;
              if (next === 'Custom') {
                const custom = chooseCustom('vendor', setCustomVendorOptions);
                if (custom) updateField('vendor_2', custom);
                return;
              }
              updateField('vendor_2', next);
            }}>
              <option value="">Unassigned</option>
              {vendorChoices.map((vendor) => <option key={vendor} value={vendor}>{vendor}</option>)}
              <option value="Custom">Custom</option>
            </select>
          </label>
          <label>
            Assignee
            <select disabled={!canEdit} value={form.assigned_to} onChange={(event) => updateField('assigned_to', event.target.value)}>
              <option value="">Unassigned</option>
              {members.map((member) => <option key={member.user_id} value={member.user_id}>{member.name}</option>)}
            </select>
          </label>
        </div>

        <div className="four-col">
          <label>
            Security Systems 1
            <select disabled={!canEdit} value={form.security_systems_1} onChange={(event) => {
              const next = event.target.value;
              if (next === 'Custom') {
                const custom = chooseCustom('security systems', setCustomSecurityOptions);
                if (custom) updateField('security_systems_1', custom);
                return;
              }
              updateField('security_systems_1', next);
            }}>
              <option value="">Unassigned</option>
              {securityChoices.map((option) => <option key={option} value={option}>{option}</option>)}
              <option value="Custom">Custom</option>
            </select>
          </label>
          <label>
            Security Systems 2
            <select disabled={!canEdit} value={form.security_systems_2} onChange={(event) => {
              const next = event.target.value;
              if (next === 'Custom') {
                const custom = chooseCustom('security systems', setCustomSecurityOptions);
                if (custom) updateField('security_systems_2', custom);
                return;
              }
              updateField('security_systems_2', next);
            }}>
              <option value="">Unassigned</option>
              {securityChoices.map((option) => <option key={option} value={option}>{option}</option>)}
              <option value="Custom">Custom</option>
            </select>
          </label>
          <label>
            Lock Smiths
            <select disabled={!canEdit} value={form.locksmiths} onChange={(event) => {
              const next = event.target.value;
              if (next === 'Custom') {
                const custom = chooseCustom('locksmiths', setCustomLocksmithOptions);
                if (custom) updateField('locksmiths', custom);
                return;
              }
              updateField('locksmiths', next);
            }}>
              <option value="">Unassigned</option>
              {locksmithChoices.map((option) => <option key={option} value={option}>{option}</option>)}
              <option value="Custom">Custom</option>
            </select>
          </label>
          <label>
            Other
            <select disabled={!canEdit} value={form.other_assignee} onChange={(event) => {
              const next = event.target.value;
              if (next === 'Custom') {
                const custom = chooseCustom('other assignee', setCustomOtherOptions);
                if (custom) updateField('other_assignee', custom);
                return;
              }
              updateField('other_assignee', next);
            }}>
              <option value="">Unassigned</option>
              {otherChoices.map((option) => <option key={option} value={option}>{option}</option>)}
              <option value="Custom">Custom</option>
            </select>
          </label>
        </div>

        <div className="three-col">
          <label>
            PM
            <select disabled={!canEdit} value={form.pm} onChange={(event) => updateField('pm', event.target.value)}>
              <option value="">Unassigned</option>
              {['Austin', 'Kurt'].map((pm) => <option key={pm} value={pm}>{pm}</option>)}
            </select>
          </label>
          <label>
            Parent task
            <select disabled={!canEdit} value={form.parent_task_id} onChange={(event) => updateField('parent_task_id', event.target.value)}>
              <option value="">None</option>
              {parentTaskOptions.map((task) => <option key={task.id} value={task.id}>{task.name}</option>)}
            </select>
          </label>
          <label>
            Sort order
            <input disabled={!canEdit} type="number" value={form.sort_order} onChange={(event) => updateField('sort_order', event.target.value)} placeholder="Auto" />
          </label>
        </div>

        <label>
          Description
          <textarea disabled={!canEdit} value={form.description} onChange={(event) => updateField('description', event.target.value)} placeholder="Scope, constraints, notes, inspection needs" />
        </label>

        <div className="two-col">
          <label>
            Start
            <input disabled={!canEdit} type="text" inputMode="numeric" placeholder="MM-DD-YYYY" value={form.start_date} onChange={(event) => updateField('start_date', event.target.value)} />
          </label>
          <label>
            Finish
            <input disabled={!canEdit} type="text" inputMode="numeric" placeholder="MM-DD-YYYY" value={form.end_date} onChange={(event) => updateField('end_date', event.target.value)} />
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
          <div />
        </div>

        {error && <p className="error-box">{error}</p>}
        <button className="primary-button" disabled={!canEdit || saving}>{saving ? 'Saving...' : editingTask ? 'Update task' : 'Add task'}</button>
      </form>
    </section>
  );
}
