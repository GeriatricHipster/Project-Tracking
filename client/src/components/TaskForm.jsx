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
].sort((a, b) => a.localeCompare(b));

const tradeBaseOptions = ['CCure', 'Cameras', 'CCure & Cameras', 'Lock smiths'];

const vendorBaseOptions = [
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
  'PTI (Bosch)',
  'S101',
  'Schindler',
  'SMT',
  'Stone Security',
  'Thyssenkrupp',
  'Utah Yamas'
].sort((a, b) => a.localeCompare(b));

const pmBaseOptions = ['Austin', 'Kurt'].sort((a, b) => a.localeCompare(b));

const assigneeSystemSeed = [
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

const locksmithSeed = ['Bill', 'Bennett', 'Chris', 'Jim'].sort((a, b) => a.localeCompare(b));

function readStoredList(key, fallback) {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return fallback;
    return [...new Set(parsed.map((value) => String(value).trim()).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b)
    );
  } catch {
    return fallback;
  }
}

function writeStoredList(key, values) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, JSON.stringify(values));
}

function usePersistentList(storageKey, seed) {
  const [items, setItems] = useState(() => readStoredList(storageKey, seed));

  useEffect(() => {
    writeStoredList(storageKey, items);
  }, [items, storageKey]);

  function addItem(value) {
    const next = String(value || '').trim();
    if (!next) return;
    setItems((current) => [...new Set([...current, next])].sort((a, b) => a.localeCompare(b)));
  }

  return [items, addItem, setItems];
}

function blankTask(project) {
  const start = project?.start_date || todayIso();
  return {
    task_name_choice: '',
    task_name_custom: '',
    description: '',
    trade: '',
    trade_custom: '',
    vendor: '',
    vendor_custom: '',
    vendor_secondary: '',
    vendor_secondary_custom: '',
    assigned_to: '',
    assignee_system_custom: '',
    assignee_secondary: '',
    assignee_secondary_custom: '',
    assignee_tertiary: '',
    assignee_tertiary_custom: '',
    assignee_quaternary: '',
    assignee_quaternary_custom: '',
    pm: '',
    pm_custom: '',
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

function makeChecklistId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `check-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeChecklistItems(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item, index) => {
      if (typeof item === 'string') {
        const text = item.trim();
        if (!text) return null;
        return { id: `${makeChecklistId()}-${index}`, text, done: false };
      }

      if (!item || typeof item !== 'object') return null;

      const text = String(item.text ?? item.label ?? item.name ?? '').trim();
      if (!text) return null;

      return {
        id: String(item.id || makeChecklistId()),
        text,
        done: Boolean(item.done ?? item.completed ?? item.complete ?? false)
      };
    })
    .filter(Boolean);
}

function CustomizableSelect({
  label,
  value,
  options,
  customValue,
  disabled,
  onChange,
  onCustomChange,
  onAddCustom,
  placeholder = 'Unassigned'
}) {
  const isCustom = value === '__custom__';

  return (
    <label>
      {label}
      <select disabled={disabled} value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
        <option value="__custom__">Custom</option>
      </select>

      {isCustom && (
        <div className="inline-custom-entry">
          <input
            disabled={disabled}
            value={customValue}
            onChange={(event) => onCustomChange(event.target.value)}
            placeholder={`Add custom ${label.toLowerCase()}`}
          />
          <button
            className="ghost-button compact"
            disabled={disabled || !String(customValue || '').trim()}
            onClick={onAddCustom}
            type="button"
          >
            Add
          </button>
        </div>
      )}
    </label>
  );
}

export default function TaskForm({ project, members, tasks, editingTask, canEdit, onSave, onCancel }) {
  const [form, setForm] = useState(blankTask(project));
  const [checklistItems, setChecklistItems] = useState([]);
  const [newChecklistText, setNewChecklistText] = useState('');
  const [activeTab, setActiveTab] = useState('details');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [assigneeSystemOptions, addAssigneeSystemOption] = usePersistentList(
    'psg-assignee-systems',
    assigneeSystemSeed
  );
  const [locksmithOptions, addLocksmithOption] = usePersistentList('psg-locksmiths', locksmithSeed);
  const [tradeOptions, addTradeOption] = usePersistentList('psg-trades', tradeBaseOptions);
  const [vendorOptions, addVendorOption] = usePersistentList('psg-vendors', vendorBaseOptions);
  const [pmOptions, addPmOption] = usePersistentList('psg-pms', pmBaseOptions);
  const [otherAssigneeOptions, addOtherAssigneeOption] = usePersistentList('psg-other-assignees', []);

  useEffect(() => {
    if (editingTask) {
      setForm((current) => ({
        ...current,
        task_name_choice: taskNameOptions.includes(editingTask.name || '') ? editingTask.name : 'Other',
        task_name_custom: taskNameOptions.includes(editingTask.name || '') ? '' : (editingTask.name || ''),
        description: editingTask.description || '',
        trade: tradeOptions.includes(editingTask.trade || '') ? editingTask.trade : (editingTask.trade ? '__custom__' : ''),
        trade_custom: tradeOptions.includes(editingTask.trade || '') ? '' : (editingTask.trade || ''),
        vendor: vendorOptions.includes(editingTask.vendor || '') ? editingTask.vendor : (editingTask.vendor ? '__custom__' : ''),
        vendor_custom: vendorOptions.includes(editingTask.vendor || '') ? '' : (editingTask.vendor || ''),
        vendor_secondary: vendorOptions.includes(editingTask.vendor_secondary || '')
          ? editingTask.vendor_secondary
          : (editingTask.vendor_secondary ? '__custom__' : ''),
        vendor_secondary_custom: vendorOptions.includes(editingTask.vendor_secondary || '')
          ? ''
          : (editingTask.vendor_secondary || ''),
        assigned_to: editingTask.assigned_to || '',
        assignee_system_custom: '',
        assignee_secondary: editingTask.assignee_secondary || '',
        assignee_secondary_custom: '',
        assignee_tertiary: editingTask.assignee_tertiary || '',
        assignee_tertiary_custom: '',
        assignee_quaternary: otherAssigneeOptions.includes(editingTask.assignee_quaternary || '')
          ? editingTask.assignee_quaternary
          : (editingTask.assignee_quaternary ? '__custom__' : ''),
        assignee_quaternary_custom: otherAssigneeOptions.includes(editingTask.assignee_quaternary || '')
          ? ''
          : (editingTask.assignee_quaternary || ''),
        pm: pmOptions.includes(editingTask.pm || '') ? editingTask.pm : (editingTask.pm ? '__custom__' : ''),
        pm_custom: pmOptions.includes(editingTask.pm || '') ? '' : (editingTask.pm || ''),
        parent_task_id: editingTask.parent_task_id || '',
        status: editingTask.status || '',
        priority: editingTask.priority || '',
        start_date: editingTask.start_date || project?.start_date || todayIso(),
        end_date: editingTask.end_date || project?.start_date || todayIso(),
        percent_complete: editingTask.percent_complete || 0,
        color: editingTask.color || '#2563eb',
        sort_order: editingTask.sort_order || ''
      }));

      setChecklistItems(
        normalizeChecklistItems(editingTask.checklist_items || editingTask.checklist || editingTask.subtasks || [])
      );
      setNewChecklistText('');
      setActiveTab('details');
    } else {
      setForm(blankTask(project));
      setChecklistItems([]);
      setNewChecklistText('');
      setActiveTab('details');
    }
    setError('');
  }, [editingTask, project, tradeOptions, vendorOptions, pmOptions, otherAssigneeOptions]);

  const parentTaskOptions = useMemo(
    () => tasks.filter((task) => !editingTask || task.id !== editingTask.id),
    [tasks, editingTask]
  );

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function addCustomTrade() {
    const next = String(form.trade_custom || '').trim();
    if (!next) return;
    addTradeOption(next);
    setForm((current) => ({ ...current, trade: next, trade_custom: '' }));
  }

  function addCustomVendor(field, customField, addOption) {
    const next = String(form[customField] || '').trim();
    if (!next) return;
    addOption(next);
    setForm((current) => ({ ...current, [field]: next, [customField]: '' }));
  }

  function addCustomPm() {
    const next = String(form.pm_custom || '').trim();
    if (!next) return;
    addPmOption(next);
    setForm((current) => ({ ...current, pm: next, pm_custom: '' }));
  }

  function addCustomOtherAssignee() {
    const next = String(form.assignee_quaternary_custom || '').trim();
    if (!next) return;
    addOtherAssigneeOption(next);
    setForm((current) => ({ ...current, assignee_quaternary: next, assignee_quaternary_custom: '' }));
  }

  function addCustomTaskName() {
    const next = String(form.task_name_custom || '').trim();
    if (!next) return;
    setForm((current) => ({ ...current, task_name_choice: 'Other', task_name_custom: next }));
  }

  function addChecklistItem() {
    const text = String(newChecklistText || '').trim();
    if (!text) return;
    setChecklistItems((current) => [...current, { id: makeChecklistId(), text, done: false }]);
    setNewChecklistText('');
  }

  function toggleChecklistItem(itemId) {
    setChecklistItems((current) =>
      current.map((item) => (item.id === itemId ? { ...item, done: !item.done } : item))
    );
  }

  function updateChecklistText(itemId, text) {
    setChecklistItems((current) =>
      current.map((item) => (item.id === itemId ? { ...item, text } : item))
    );
  }

  function removeChecklistItem(itemId) {
    setChecklistItems((current) => current.filter((item) => item.id !== itemId));
  }

  async function submit(event) {
    event.preventDefault();
    setError('');
    setSaving(true);

    try {
      const taskName = form.task_name_choice === 'Other' ? form.task_name_custom : form.task_name_choice;
      const cleanedChecklist = checklistItems
        .map((item) => ({
          id: item.id,
          text: String(item.text || '').trim(),
          done: Boolean(item.done)
        }))
        .filter((item) => item.text);

      await onSave({
        name: taskName || '',
        description: form.description || '',
        trade: form.trade === '__custom__' ? form.trade_custom : form.trade || null,
        vendor: form.vendor === '__custom__' ? form.vendor_custom : form.vendor || null,
        vendor_secondary: form.vendor_secondary === '__custom__' ? form.vendor_secondary_custom : form.vendor_secondary || null,
        assigned_to: form.assigned_to || null,
        assignee_secondary: form.assignee_secondary || null,
        assignee_tertiary: form.assignee_tertiary || null,
        assignee_quaternary:
          form.assignee_quaternary === '__custom__'
            ? form.assignee_quaternary_custom
            : form.assignee_quaternary || null,
        pm: form.pm === '__custom__' ? form.pm_custom : form.pm || null,
        parent_task_id: form.parent_task_id || null,
        status: form.status || 'not_started',
        priority: form.priority || 'normal',
        start_date: form.start_date || project?.start_date || todayIso(),
        end_date: form.end_date || form.start_date || project?.start_date || todayIso(),
        percent_complete: Number(form.percent_complete),
        color: form.color,
        sort_order: form.sort_order === '' ? undefined : Number(form.sort_order),
        checklist_items: cleanedChecklist
      });

      if (!editingTask) {
        setForm(blankTask(project));
        setChecklistItems([]);
        setNewChecklistText('');
        setActiveTab('details');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const tabButtonStyle = (active) => ({
    border: active ? '1px solid #7f1d1d' : '1px solid rgba(148, 163, 184, 0.85)',
    background: active
      ? 'linear-gradient(135deg, #dc2626, #991b1b)'
      : 'linear-gradient(180deg, #ffffff, #e5e7eb)',
    color: active ? '#ffffff' : '#111827',
    borderRadius: 999,
    padding: '10px 16px',
    fontSize: 13,
    fontWeight: 800,
    cursor: 'pointer',
    opacity: 1,
    textShadow: 'none',
    boxShadow: active
      ? '0 10px 20px rgba(220, 38, 38, 0.20)'
      : '0 6px 14px rgba(15, 23, 42, 0.10)'
  });

  return (
    <section className="panel task-form-panel">
      <div className="panel-heading">
        <div>
          <h2 className="ui-red-title">{editingTask ? 'Edit task' : 'Add task'}</h2>
          <p>
            {canEdit
              ? 'Update dates, vendor, status, responsibility, and progress.'
              : 'Viewer access is read-only except for project notes.'}
          </p>
        </div>
        {editingTask && (
          <button className="ghost-button" onClick={onCancel} type="button">
            Cancel edit
          </button>
        )}
      </div>

      <div className="task-form-tabs">
        <button type="button" style={tabButtonStyle(activeTab === 'details')} onClick={() => setActiveTab('details')}>
          Details
        </button>
        <button
          type="button"
          style={tabButtonStyle(activeTab === 'checklist')}
          onClick={() => setActiveTab('checklist')}
        >
          Checklist
        </button>
      </div>

      <form className="stack task-form-shell" onSubmit={submit}>
        {activeTab === 'details' && (
          <>
            <section className="panel task-section">
              <div className="panel-heading">
                <div>
                  <h3 className="ui-red-title">Task basics</h3>
                  <p>Core task details and the main vendor fields.</p>
                </div>
              </div>

              <label>
                Task name
                <select
                  disabled={!canEdit}
                  value={form.task_name_choice}
                  onChange={(event) => updateField('task_name_choice', event.target.value)}
                >
                  <option value="">Unassigned</option>
                  {taskNameOptions.map((taskName) => (
                    <option key={taskName} value={taskName}>
                      {taskName}
                    </option>
                  ))}
                  <option value="Other">Other</option>
                </select>
              </label>

              {form.task_name_choice === 'Other' && (
                <label>
                  Custom task name
                  <textarea
                    disabled={!canEdit}
                    value={form.task_name_custom}
                    onChange={(event) => updateField('task_name_custom', event.target.value)}
                    placeholder="Enter a custom task name"
                  />
                  <button
                    className="ghost-button compact"
                    disabled={!canEdit || !String(form.task_name_custom || '').trim()}
                    onClick={addCustomTaskName}
                    type="button"
                  >
                    Use custom task name
                  </button>
                </label>
              )}

              <div className="two-col">
                <CustomizableSelect
                  label="Trade"
                  value={form.trade}
                  options={tradeOptions}
                  customValue={form.trade_custom}
                  disabled={!canEdit}
                  onChange={(value) => updateField('trade', value)}
                  onCustomChange={(value) => updateField('trade_custom', value)}
                  onAddCustom={addCustomTrade}
                />

                <label>
                  Parent task
                  <select
                    disabled={!canEdit}
                    value={form.parent_task_id}
                    onChange={(event) => updateField('parent_task_id', event.target.value)}
                  >
                    <option value="">Unassigned</option>
                    {parentTaskOptions.map((task) => (
                      <option key={task.id} value={task.id}>
                        {task.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="two-col">
                <CustomizableSelect
                  label="Vendor"
                  value={form.vendor}
                  options={vendorOptions}
                  customValue={form.vendor_custom}
                  disabled={!canEdit}
                  onChange={(value) => updateField('vendor', value)}
                  onCustomChange={(value) => updateField('vendor_custom', value)}
                  onAddCustom={() => addCustomVendor('vendor', 'vendor_custom', addVendorOption)}
                />

                <CustomizableSelect
                  label="Vendor 2"
                  value={form.vendor_secondary}
                  options={vendorOptions}
                  customValue={form.vendor_secondary_custom}
                  disabled={!canEdit}
                  onChange={(value) => updateField('vendor_secondary', value)}
                  onCustomChange={(value) => updateField('vendor_secondary_custom', value)}
                  onAddCustom={() => addCustomVendor('vendor_secondary', 'vendor_secondary_custom', addVendorOption)}
                />
              </div>
            </section>

            <section className="panel task-section">
              <div className="panel-heading">
                <div>
                  <h3 className="ui-red-title">People</h3>
                  <p>Assign the team members and the PM for this task.</p>
                </div>
              </div>

              <div className="four-col assignee-grid">
                <CustomizableSelect
                  label="Security Systems Team Member"
                  value={form.assigned_to}
                  options={assigneeSystemOptions}
                  customValue={form.assignee_system_custom || ''}
                  disabled={!canEdit}
                  onChange={(value) => updateField('assigned_to', value)}
                  onCustomChange={(value) => updateField('assignee_system_custom', value)}
                  onAddCustom={() => {
                    const next = String(form.assignee_system_custom || '').trim();
                    if (!next) return;
                    addAssigneeSystemOption(next);
                    setForm((current) => ({ ...current, assigned_to: next, assignee_system_custom: '' }));
                  }}
                />

                <CustomizableSelect
                  label="Security Systems Team Member"
                  value={form.assignee_secondary}
                  options={assigneeSystemOptions}
                  customValue={form.assignee_secondary_custom || ''}
                  disabled={!canEdit}
                  onChange={(value) => updateField('assignee_secondary', value)}
                  onCustomChange={(value) => updateField('assignee_secondary_custom', value)}
                  onAddCustom={() => {
                    const next = String(form.assignee_secondary_custom || '').trim();
                    if (!next) return;
                    addAssigneeSystemOption(next);
                    setForm((current) => ({ ...current, assignee_secondary: next, assignee_secondary_custom: '' }));
                  }}
                />

                <CustomizableSelect
                  label="Lock Smiths"
                  value={form.assignee_tertiary}
                  options={locksmithOptions}
                  customValue={form.assignee_tertiary_custom || ''}
                  disabled={!canEdit}
                  onChange={(value) => updateField('assignee_tertiary', value)}
                  onCustomChange={(value) => updateField('assignee_tertiary_custom', value)}
                  onAddCustom={() => {
                    const next = String(form.assignee_tertiary_custom || '').trim();
                    if (!next) return;
                    addLocksmithOption(next);
                    setForm((current) => ({ ...current, assignee_tertiary: next, assignee_tertiary_custom: '' }));
                  }}
                />

                <CustomizableSelect
                  label="Other"
                  value={form.assignee_quaternary}
                  options={otherAssigneeOptions}
                  customValue={form.assignee_quaternary_custom}
                  disabled={!canEdit}
                  onChange={(value) => updateField('assignee_quaternary', value)}
                  onCustomChange={(value) => updateField('assignee_quaternary_custom', value)}
                  onAddCustom={addCustomOtherAssignee}
                />
              </div>

              <CustomizableSelect
                label="PM"
                value={form.pm}
                options={pmOptions}
                customValue={form.pm_custom || ''}
                disabled={!canEdit}
                onChange={(value) => updateField('pm', value)}
                onCustomChange={(value) => updateField('pm_custom', value)}
                onAddCustom={addCustomPm}
              />
            </section>

            <section className="panel task-section">
              <div className="panel-heading">
                <div>
                  <h3 className="ui-red-title">Schedule</h3>
                  <p>Set the dates for this task.</p>
                </div>
              </div>

              <div className="two-col">
                <label>
                  Start
                  <input
                    disabled={!canEdit}
                    type="date"
                    value={form.start_date}
                    onChange={(event) => updateField('start_date', event.target.value)}
                  />
                </label>
                <label>
                  Finish
                  <input
                    disabled={!canEdit}
                    type="date"
                    value={form.end_date}
                    onChange={(event) => updateField('end_date', event.target.value)}
                  />
                </label>
              </div>
            </section>

            <section className="panel task-section">
              <div className="panel-heading">
                <div>
                  <h3 className="ui-red-title">Tracking</h3>
                  <p>Status, priority, and progress settings.</p>
                </div>
              </div>

              <div className="three-col">
                <label>
                  Status
                  <select
                    disabled={!canEdit}
                    value={form.status}
                    onChange={(event) => updateField('status', event.target.value)}
                  >
                    {statusOptions.map(([value, label]) => (
                      <option value={value} key={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Priority
                  <select
                    disabled={!canEdit}
                    value={form.priority}
                    onChange={(event) => updateField('priority', event.target.value)}
                  >
                    {priorityOptions.map(([value, label]) => (
                      <option value={value} key={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Percent complete
                  <input
                    disabled={!canEdit}
                    type="number"
                    min="0"
                    max="100"
                    value={form.percent_complete}
                    onChange={(event) => updateField('percent_complete', event.target.value)}
                  />
                </label>
              </div>

              <div className="two-col">
                <label>
                  Color
                  <input
                    disabled={!canEdit}
                    type="color"
                    value={form.color}
                    onChange={(event) => updateField('color', event.target.value)}
                  />
                </label>

                <label>
                  Sort order
                  <input
                    disabled={!canEdit}
                    type="number"
                    value={form.sort_order}
                    onChange={(event) => updateField('sort_order', event.target.value)}
                    placeholder="Auto"
                  />
                </label>
              </div>
            </section>

            <section className="panel task-section">
              <div className="panel-heading">
                <div>
                  <h3 className="ui-red-title">Notes</h3>
                  <p>Add the scope, details, and anything else the team should know.</p>
                </div>
              </div>

              <label>
                Description
                <textarea
                  disabled={!canEdit}
                  value={form.description}
                  onChange={(event) => updateField('description', event.target.value)}
                  placeholder="Scope, constraints, notes, inspection needs"
                />
              </label>
            </section>
          </>
        )}

        {activeTab === 'checklist' && (
          <section className="panel task-section">
            <div className="panel-heading">
              <div>
                <h3 className="ui-red-title">Checklist</h3>
                <p>Add as many sub tasks as you need, then mark each one complete with a click.</p>
              </div>
            </div>

            <div className="stack" style={{ gap: 12 }}>
              <label>
                Add checklist item
                <div className="inline-custom-entry">
                  <input
                    disabled={!canEdit}
                    value={newChecklistText}
                    onChange={(event) => setNewChecklistText(event.target.value)}
                    placeholder="Example: Pull permits"
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        addChecklistItem();
                      }
                    }}
                  />
                  <button
                    className="ghost-button compact"
                    disabled={!canEdit || !String(newChecklistText || '').trim()}
                    onClick={addChecklistItem}
                    type="button"
                  >
                    Add item
                  </button>
                </div>
              </label>

              <div className="stack" style={{ gap: 10 }}>
                {checklistItems.length === 0 && (
                  <div className="empty-state table-empty">
                    <h3>No checklist items yet</h3>
                    <p>Add sub tasks here to track them independently.</p>
                  </div>
                )}

                {checklistItems.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '44px minmax(0, 1fr) auto',
                      gap: 10,
                      alignItems: 'center',
                      padding: '10px 12px',
                      border: '1px solid rgba(239, 68, 68, 0.22)',
                      borderRadius: 14,
                      background: '#fff'
                    }}
                  >
                    <button
                      type="button"
                      aria-pressed={item.done}
                      title={item.done ? 'Mark incomplete' : 'Mark complete'}
                      onClick={() => canEdit && toggleChecklistItem(item.id)}
                      disabled={!canEdit}
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        border: 'none',
                        background: item.done ? '#16a34a' : '#dc2626',
                        color: '#fff',
                        fontSize: 20,
                        fontWeight: 800,
                        cursor: canEdit ? 'pointer' : 'not-allowed',
                        boxShadow: '0 6px 14px rgba(15, 23, 42, 0.12)'
                      }}
                    >
                      {item.done ? '✔' : '✖'}
                    </button>

                    <input
                      disabled={!canEdit}
                      value={item.text}
                      onChange={(event) => updateChecklistText(item.id, event.target.value)}
                      placeholder="Checklist item"
                    />

                    <button
                      type="button"
                      className="ghost-button compact"
                      disabled={!canEdit}
                      onClick={() => removeChecklistItem(item.id)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {error && <p className="error-box">{error}</p>}

        <div className="task-form-actions">
          <button className="primary-button" disabled={!canEdit || saving}>
            {saving ? 'Saving...' : editingTask ? 'Update task' : 'Create task'}
          </button>
        </div>
      </form>
    </section>
  );
}
