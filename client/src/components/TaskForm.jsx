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

const tradeBaseOptions = ['CCure', 'Cameras', 'CCure & Cameras', 'Lock smiths'];
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
  'Utah Yamas'
].sort((a, b) => a.localeCompare(b));

const assigneeOptionsBase = [
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
  'Kyra',
  'Bill',
  'Bennett',
  'Jim',
  'Chris'
].sort((a, b) => a.localeCompare(b));

const locksmithOptions = ['Bill', 'Bennett', 'Chris', 'Jim'].sort((a, b) => a.localeCompare(b));

function blankTask(project) {
  const start = project?.start_date || todayIso();
  return {
    name: '',
    name_choice: '',
    custom_name: '',
    description: '',
    trade: '',
    trade_custom: '',
    vendor: '',
    vendor_2: '',
    assignee_1: '',
    assignee_1_custom: '',
    assignee_2: '',
    assignee_2_custom: '',
    assignee_3: '',
    assignee_3_custom: '',
    assignee_4: '',
    assignee_4_custom: '',
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

function ensureOption(list, value) {
  const text = String(value || '').trim();
  if (!text) return list;
  if (list.includes(text)) return list;
  return [...list, text].sort((a, b) => a.localeCompare(b));
}

function readStoredOptions(key, fallback) {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return fallback;
    return parsed.map((item) => String(item || '').trim()).filter(Boolean).sort((a, b) => a.localeCompare(b));
  } catch {
    return fallback;
  }
}

function writeStoredOptions(key, options) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, JSON.stringify([...new Set(options)].sort((a, b) => a.localeCompare(b))));
}

function LabeledSelect({ label, value, onChange, options, disabled, customValue, onCustomChange, customPlaceholder = 'Enter custom value', allowCustom = true, textarea = false }) {
  return (
    <label>
      {label}
      <select disabled={disabled} value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Unassigned</option>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
        {allowCustom && <option value="__custom__">Custom</option>}
      </select>
      {value === '__custom__' && allowCustom && (
        textarea ? (
          <textarea disabled={disabled} value={customValue} onChange={(event) => onCustomChange(event.target.value)} placeholder={customPlaceholder} />
        ) : (
          <input disabled={disabled} value={customValue} onChange={(event) => onCustomChange(event.target.value)} placeholder={customPlaceholder} />
        )
      )}
    </label>
  );
}

export default function TaskForm({ project, members, tasks, editingTask, canEdit, onSave, onCancel }) {
  const [form, setForm] = useState(blankTask(project));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [assigneeOptions, setAssigneeOptions] = useState(() => readStoredOptions('psg-assignee-options', assigneeOptionsBase));
  const [locksmithOptionsState, setLocksmithOptionsState] = useState(() => readStoredOptions('psg-locksmith-options', locksmithOptions));
  const [tradeOptions, setTradeOptions] = useState(() => readStoredOptions('psg-trade-options', tradeBaseOptions));
  const [taskOptions, setTaskOptions] = useState(taskNameOptions);

  useEffect(() => {
    setAssigneeOptions(readStoredOptions('psg-assignee-options', assigneeOptionsBase));
    setLocksmithOptionsState(readStoredOptions('psg-locksmith-options', locksmithOptions));
    setTradeOptions(readStoredOptions('psg-trade-options', tradeBaseOptions));
  }, []);

  useEffect(() => {
    if (editingTask) {
      const nameInOptions = taskNameOptions.includes(editingTask.name);
      const customName = nameInOptions ? '' : (editingTask.name || '');
      const tradeInOptions = tradeOptions.includes(editingTask.trade);
      const assignee1InOptions = assigneeOptions.includes(editingTask.assignee_1);
      const assignee2InOptions = assigneeOptions.includes(editingTask.assignee_2);
      const assignee3InOptions = locksmithOptionsState.includes(editingTask.assignee_3);
      const assignee4InOptions = false;
      const vendorInOptions = vendorOptions.includes(editingTask.vendor);
      const vendor2InOptions = vendorOptions.includes(editingTask.vendor_2);
      setForm({
        name: nameInOptions ? editingTask.name || '' : 'Other',
        name_choice: nameInOptions ? editingTask.name || '' : '__custom__',
        custom_name: customName,
        description: editingTask.description || '',
        trade: tradeInOptions || !editingTask.trade ? (editingTask.trade || '') : '__custom__',
        trade_custom: tradeInOptions || !editingTask.trade ? '' : (editingTask.trade || ''),
        vendor: editingTask.vendor || '',
        vendor_2: editingTask.vendor_2 || '',
        assignee_1: assignee1InOptions || !editingTask.assignee_1 ? (editingTask.assignee_1 || '') : '__custom__',
        assignee_1_custom: assignee1InOptions || !editingTask.assignee_1 ? '' : (editingTask.assignee_1 || ''),
        assignee_2: assignee2InOptions || !editingTask.assignee_2 ? (editingTask.assignee_2 || '') : '__custom__',
        assignee_2_custom: assignee2InOptions || !editingTask.assignee_2 ? '' : (editingTask.assignee_2 || ''),
        assignee_3: assignee3InOptions || !editingTask.assignee_3 ? (editingTask.assignee_3 || '') : '__custom__',
        assignee_3_custom: assignee3InOptions || !editingTask.assignee_3 ? '' : (editingTask.assignee_3 || ''),
        assignee_4: assignee4InOptions || !editingTask.assignee_4 ? (editingTask.assignee_4 || '') : '__custom__',
        assignee_4_custom: !editingTask.assignee_4 ? '' : (editingTask.assignee_4 || ''),
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

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updateCustomOptions(kind, value) {
    const text = String(value || '').trim();
    if (!text) return;
    if (kind === 'assignee') {
      const next = ensureOption(assigneeOptions, text);
      setAssigneeOptions(next);
      writeStoredOptions('psg-assignee-options', next);
    } else if (kind === 'locksmith') {
      const next = ensureOption(locksmithOptionsState, text);
      setLocksmithOptionsState(next);
      writeStoredOptions('psg-locksmith-options', next);
    } else if (kind === 'trade') {
      const next = ensureOption(tradeOptions, text);
      setTradeOptions(next);
      writeStoredOptions('psg-trade-options', next);
    } else if (kind === 'task') {
      const next = ensureOption(taskOptions, text);
      setTaskOptions(next);
    }
  }

  async function submit(event) {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      const name = form.name_choice === '__custom__' ? form.custom_name : form.name;
      const payload = {
        ...form,
        name,
        trade: form.trade === '__custom__' ? form.trade_custom : form.trade,
        vendor: form.vendor || null,
        vendor_2: form.vendor_2 || null,
        assignee_1: form.assignee_1 === '__custom__' ? form.assignee_1_custom : form.assignee_1,
        assignee_2: form.assignee_2 === '__custom__' ? form.assignee_2_custom : form.assignee_2,
        assignee_3: form.assignee_3 === '__custom__' ? form.assignee_3_custom : form.assignee_3,
        assignee_4: form.assignee_4 === '__custom__' ? form.assignee_4_custom : form.assignee_4,
        assigned_to: form.assigned_to || null,
        parent_task_id: form.parent_task_id || null,
        percent_complete: Number(form.percent_complete),
        sort_order: form.sort_order === '' ? undefined : Number(form.sort_order)
      };
      await onSave(payload);
      if (!editingTask) setForm(blankTask(project));
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const nameValue = form.name_choice === '__custom__' ? '__custom__' : (form.name || '');
  const taskNameSelectOptions = useMemo(() => {
    const existing = taskOptions.filter((option) => option !== 'Other');
    return existing;
  }, [taskOptions]);

  const currentNameOptions = editingTask ? ensureOption(taskNameSelectOptions, editingTask.name || '') : taskNameSelectOptions;
  const currentTradeOptions = form.trade === '__custom__' ? tradeOptions : tradeOptions;

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
          <select disabled={!canEdit} value={nameValue} onChange={(event) => {
            const value = event.target.value;
            if (value === '__custom__') {
              updateField('name_choice', '__custom__');
              updateField('name', 'Other');
            } else {
              updateField('name_choice', value);
              updateField('name', value);
              updateField('custom_name', '');
            }
          }}>
            <option value="">Choose a task</option>
            {taskNameSelectOptions.filter((option) => option !== 'Other').map((task) => <option key={task} value={task}>{task}</option>)}
            <option value="__custom__">Other</option>
          </select>
          {form.name_choice === '__custom__' && (
            <textarea
              disabled={!canEdit}
              value={form.custom_name}
              onChange={(event) => updateField('custom_name', event.target.value)}
              placeholder="Enter a custom task name"
            />
          )}
        </label>

        <div className="task-grid four-col">
          <LabeledSelect
            label="Trade"
            value={form.trade}
            options={currentTradeOptions.filter((option) => option !== 'Custom')}
            disabled={!canEdit}
            customValue={form.trade_custom}
            onChange={(value) => {
              updateField('trade', value);
              if (value === '__custom__') return;
              updateField('trade_custom', '');
            }}
            onCustomChange={(value) => {
              updateField('trade_custom', value);
              updateCustomOptions('trade', value);
            }}
            customPlaceholder="Add custom trade"
          />
          <LabeledSelect
            label="Vendor"
            value={form.vendor}
            options={vendorOptions}
            disabled={!canEdit}
            allowCustom={false}
            onChange={(value) => updateField('vendor', value)}
            onCustomChange={() => {}}
          />
          <LabeledSelect
            label="Vendor 2"
            value={form.vendor_2}
            options={vendorOptions}
            disabled={!canEdit}
            allowCustom={false}
            onChange={(value) => updateField('vendor_2', value)}
            onCustomChange={() => {}}
          />
          <LabeledSelect
            label="Assignee 1 — CCure Team and Camera Team"
            value={form.assignee_1}
            options={assigneeOptions.filter((option) => option !== 'Custom')}
            disabled={!canEdit}
            customValue={form.assignee_1_custom}
            onChange={(value) => {
              updateField('assignee_1', value);
              if (value === '__custom__') return;
              updateField('assignee_1_custom', '');
            }}
            onCustomChange={(value) => {
              updateField('assignee_1_custom', value);
              updateCustomOptions('assignee', value);
            }}
            customPlaceholder="Add custom assignee"
          />
          <LabeledSelect
            label="Assignee 2 — CCure Team and Camera Team"
            value={form.assignee_2}
            options={assigneeOptions.filter((option) => option !== 'Custom')}
            disabled={!canEdit}
            customValue={form.assignee_2_custom}
            onChange={(value) => {
              updateField('assignee_2', value);
              if (value === '__custom__') return;
              updateField('assignee_2_custom', '');
            }}
            onCustomChange={(value) => {
              updateField('assignee_2_custom', value);
              updateCustomOptions('assignee', value);
            }}
            customPlaceholder="Add custom assignee"
          />
          <LabeledSelect
            label="Assignee 3 — Lock Smiths"
            value={form.assignee_3}
            options={locksmithOptionsState.filter((option) => option !== 'Custom')}
            disabled={!canEdit}
            customValue={form.assignee_3_custom}
            onChange={(value) => {
              updateField('assignee_3', value);
              if (value === '__custom__') return;
              updateField('assignee_3_custom', '');
            }}
            onCustomChange={(value) => {
              updateField('assignee_3_custom', value);
              updateCustomOptions('locksmith', value);
            }}
            customPlaceholder="Add custom locksmith"
          />
          <LabeledSelect
            label="Assignee 4 — Other"
            value={form.assignee_4}
            options={[]}
            disabled={!canEdit}
            customValue={form.assignee_4_custom}
            onChange={(value) => {
              updateField('assignee_4', value);
              if (value === '__custom__') return;
              updateField('assignee_4_custom', '');
            }}
            onCustomChange={(value) => {
              updateField('assignee_4_custom', value);
              updateCustomOptions('assignee', value);
            }}
            customPlaceholder="Add custom other assignee"
          />
        </div>

        <div className="two-col">
          <label>
            Project member assigned to task
            <select disabled={!canEdit} value={form.assigned_to} onChange={(event) => updateField('assigned_to', event.target.value)}>
              <option value="">Unassigned</option>
              {members.map((member) => (
                <option key={member.user_id} value={member.user_id}>{member.name}</option>
              ))}
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
