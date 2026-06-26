import { useEffect, useMemo, useState } from 'react';
import {
  appendStoredListValue,
  locksmithOptions as defaultLocksmithOptions,
  securitySystemOptions as defaultSecuritySystemOptions,
  sortUnique,
  taskNameOptions,
  tradeOptions as defaultTradeOptions,
  vendorOptions
} from '../lib/options';
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

const STORAGE_KEYS = {
  trade: 'psg-task-trade-options',
  security1: 'psg-task-security-1-options',
  security2: 'psg-task-security-2-options',
  locksmiths: 'psg-task-locksmith-options',
  other: 'psg-task-other-options'
};

function readCustomList(storageKey) {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map((value) => String(value || '').trim()).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function writeCustomList(storageKey, values) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(storageKey, JSON.stringify(sortUnique(values)));
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
    assigned_to: '',
    security_team_member: '',
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

function taskNameChoiceFromValue(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  return taskNameOptions.includes(text) ? text : 'Other';
}

function promptForCustomOption(promptLabel, storageKey, fallbackList, currentList, setCurrentList) {
  const nextValue = window.prompt(`Add a custom ${promptLabel}:`);
  if (nextValue === null) return null;
  const text = String(nextValue || '').trim();
  if (!text) return null;
  const next = appendStoredListValue(storageKey, fallbackList, text);
  setCurrentList(next.filter((value) => !fallbackList.includes(value)));
  return text;
}

function SelectWithCustom({ label, value, onChange, options, storageKey, fallbackList, customList, setCustomList, canEdit }) {
  const allOptions = sortUnique([...fallbackList, ...customList]);

  function handleChange(event) {
    const nextValue = event.target.value;
    if (nextValue !== 'Custom') {
      onChange(nextValue);
      return;
    }
    const customValue = promptForCustomOption(label.toLowerCase(), storageKey, fallbackList, customList, setCustomList);
    if (customValue) onChange(customValue);
    else onChange(value || '');
  }

  return (
    <label>
      {label}
      <select disabled={!canEdit} value={value} onChange={handleChange}>
        <option value="">Unassigned</option>
        {allOptions.map((option) => <option key={option} value={option}>{option}</option>)}
        <option value="Custom">Custom</option>
      </select>
    </label>
  );
}

export default function TaskForm({ project, members, tasks, editingTask, canEdit, onSave, onCancel }) {
  const [form, setForm] = useState(blankTask(project));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [customTrades, setCustomTrades] = useState(() => readCustomList(STORAGE_KEYS.trade));
  const [customSecurity1, setCustomSecurity1] = useState(() => readCustomList(STORAGE_KEYS.security1));
  const [customSecurity2, setCustomSecurity2] = useState(() => readCustomList(STORAGE_KEYS.security2));
  const [customLocksmiths, setCustomLocksmiths] = useState(() => readCustomList(STORAGE_KEYS.locksmiths));
  const [customOther, setCustomOther] = useState(() => readCustomList(STORAGE_KEYS.other));

  useEffect(() => {
    if (editingTask) {
      setForm({
        task_name_choice: taskNameChoiceFromValue(editingTask.name),
        custom_task_name: taskNameOptions.includes(editingTask.name || '') ? '' : (editingTask.name || ''),
        description: editingTask.description || '',
        trade: editingTask.trade || '',
        vendor: editingTask.vendor || '',
        vendor_secondary: editingTask.vendor_secondary || '',
        assigned_to: editingTask.assigned_to ? String(editingTask.assigned_to) : '',
        security_team_member: editingTask.security_team_member || '',
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

  const memberOptions = useMemo(() => {
    return [...members].sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
  }, [members]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleTaskNameChange(nextValue) {
    if (nextValue === 'Other') {
      setForm((current) => ({ ...current, task_name_choice: 'Other', custom_task_name: current.custom_task_name || '' }));
      return;
    }
    setForm((current) => ({
      ...current,
      task_name_choice: nextValue,
      custom_task_name: ''
    }));
  }

  async function submit(event) {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      const taskName = form.task_name_choice === 'Other' ? form.custom_task_name.trim() : form.task_name_choice;
      await onSave({
        name: taskName,
        description: form.description,
        trade: form.trade || null,
        vendor: form.vendor || null,
        vendor_secondary: form.vendor_secondary || null,
        assigned_to: form.assigned_to ? Number(form.assigned_to) : null,
        security_team_member: form.security_team_member || null,
        assignee_secondary: form.assignee_secondary || null,
        assignee_tertiary: form.assignee_tertiary || null,
        assignee_quaternary: form.assignee_quaternary || null,
        parent_task_id: form.parent_task_id || null,
        status: form.status || 'not_started',
        priority: form.priority || 'normal',
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

  function addCustomAndUpdate(storageKey, fallbackList, currentCustom, setter, value) {
    const next = appendStoredListValue(storageKey, fallbackList, value);
    setter(next.filter((entry) => !fallbackList.includes(entry)));
    return next;
  }

  const combinedSecurity1 = sortUnique([...defaultSecuritySystemOptions, ...customSecurity1]);
  const combinedSecurity2 = sortUnique([...defaultSecuritySystemOptions, ...customSecurity2]);
  const combinedLocksmiths = sortUnique([...defaultLocksmithOptions, ...customLocksmiths]);
  const combinedTrades = sortUnique([...defaultTradeOptions, ...customTrades]);
  const combinedOther = sortUnique([...customOther]);

  return (
    <section className="panel task-form-panel">
      <div className="panel-heading">
        <div>
          <h2>{editingTask ? 'Edit task' : 'Add task'}</h2>
          <p>{canEdit ? 'Update task names, dates, vendors, status, and assignment details.' : 'Viewer access is read-only except for project notes.'}</p>
        </div>
        {editingTask && <button className="ghost-button" onClick={onCancel} type="button">Cancel edit</button>}
      </div>

      <form className="stack" onSubmit={submit}>
        <label>
          Task name
          <select disabled={!canEdit} value={form.task_name_choice} onChange={(event) => handleTaskNameChange(event.target.value)}>
            <option value="">Unassigned</option>
            {taskNameOptions.filter((option) => option !== 'Other').map((option) => <option key={option} value={option}>{option}</option>)}
            <option value="Other">Other</option>
          </select>
        </label>

        {form.task_name_choice === 'Other' && (
          <label>
            Custom task name
            <textarea
              disabled={!canEdit}
              value={form.custom_task_name}
              onChange={(event) => updateField('custom_task_name', event.target.value)}
              placeholder="Enter a custom task name"
            />
          </label>
        )}

        <div className="two-col">
          <label>
            Trade
            <select
              disabled={!canEdit}
              value={form.trade}
              onChange={(event) => {
                const next = event.target.value;
                if (next === 'Custom') {
                  const added = promptForCustomOption('trade', STORAGE_KEYS.trade, defaultTradeOptions, customTrades, setCustomTrades);
                  if (added) updateField('trade', added);
                  else updateField('trade', form.trade || '');
                  return;
                }
                updateField('trade', next);
              }}
            >
              <option value="">Unassigned</option>
              {combinedTrades.map((trade) => <option key={trade} value={trade}>{trade}</option>)}
              <option value="Custom">Custom</option>
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
            <select disabled={!canEdit} value={form.assigned_to || ''} onChange={(event) => updateField('assigned_to', event.target.value)}>
              <option value="">Unassigned</option>
              {memberOptions.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
            </select>
          </label>
          <label>
            Security Systems 1
            <select
              disabled={!canEdit}
              value={form.security_team_member}
              onChange={(event) => {
                const next = event.target.value;
                if (next === 'Custom') {
                  const added = promptForCustomOption('security systems 1 value', STORAGE_KEYS.security1, defaultSecuritySystemOptions, customSecurity1, setCustomSecurity1);
                  if (added) updateField('security_team_member', added);
                  else updateField('security_team_member', form.security_team_member || '');
                  return;
                }
                updateField('security_team_member', next);
              }}
            >
              <option value="">Unassigned</option>
              {combinedSecurity1.map((member) => <option key={member} value={member}>{member}</option>)}
              <option value="Custom">Custom</option>
            </select>
          </label>
          <label>
            Security Systems 2
            <select
              disabled={!canEdit}
              value={form.assignee_secondary}
              onChange={(event) => {
                const next = event.target.value;
                if (next === 'Custom') {
                  const added = promptForCustomOption('security systems 2 value', STORAGE_KEYS.security2, defaultSecuritySystemOptions, customSecurity2, setCustomSecurity2);
                  if (added) updateField('assignee_secondary', added);
                  else updateField('assignee_secondary', form.assignee_secondary || '');
                  return;
                }
                updateField('assignee_secondary', next);
              }}
            >
              <option value="">Unassigned</option>
              {combinedSecurity2.map((member) => <option key={member} value={member}>{member}</option>)}
              <option value="Custom">Custom</option>
            </select>
          </label>
          <label>
            Lock Smiths
            <select
              disabled={!canEdit}
              value={form.assignee_tertiary}
              onChange={(event) => {
                const next = event.target.value;
                if (next === 'Custom') {
                  const added = promptForCustomOption('lock smiths value', STORAGE_KEYS.locksmiths, defaultLocksmithOptions, customLocksmiths, setCustomLocksmiths);
                  if (added) updateField('assignee_tertiary', added);
                  else updateField('assignee_tertiary', form.assignee_tertiary || '');
                  return;
                }
                updateField('assignee_tertiary', next);
              }}
            >
              <option value="">Unassigned</option>
              {combinedLocksmiths.map((member) => <option key={member} value={member}>{member}</option>)}
              <option value="Custom">Custom</option>
            </select>
          </label>
        </div>

        <label>
          Other
          <select
            disabled={!canEdit}
            value={form.assignee_quaternary}
            onChange={(event) => {
              const next = event.target.value;
              if (next === 'Custom') {
                const added = promptForCustomOption('other entry', STORAGE_KEYS.other, [], customOther, setCustomOther);
                if (added) updateField('assignee_quaternary', added);
                else updateField('assignee_quaternary', form.assignee_quaternary || '');
                return;
              }
              updateField('assignee_quaternary', next);
            }}
          >
            <option value="">Unassigned</option>
            {combinedOther.map((member) => <option key={member} value={member}>{member}</option>)}
            <option value="Custom">Custom</option>
          </select>
        </label>

        <label>
          PM
          <select disabled={!canEdit} value={form.pm} onChange={(event) => updateField('pm', event.target.value)}>
            <option value="">Unassigned</option>
            {['Austin', 'Kurt'].sort((a, b) => a.localeCompare(b)).map((pm) => <option key={pm} value={pm}>{pm}</option>)}
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
