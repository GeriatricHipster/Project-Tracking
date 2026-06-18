import { useState } from 'react';

const dependencyLabels = {
  FS: 'Finish to start',
  SS: 'Start to start',
  FF: 'Finish to finish',
  SF: 'Start to finish'
};

export default function DependencyPanel({ tasks, dependencies, canEdit, onAddDependency, onDeleteDependency }) {
  const [form, setForm] = useState({ predecessor_task_id: '', successor_task_id: '', type: 'FS', lag_days: 0 });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      await onAddDependency({
        ...form,
        predecessor_task_id: Number(form.predecessor_task_id),
        successor_task_id: Number(form.successor_task_id),
        lag_days: Number(form.lag_days || 0)
      });
      setForm({ predecessor_task_id: '', successor_task_id: '', type: 'FS', lag_days: 0 });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="panel side-panel">
      <div className="panel-heading compact-heading">
        <div>
          <h2>Dependencies</h2>
          <p>{dependencies.length} link{dependencies.length === 1 ? '' : 's'}</p>
        </div>
      </div>

      <form className="stack compact-form" onSubmit={submit}>
        <label>
          Predecessor
          <select disabled={!canEdit || tasks.length < 2} value={form.predecessor_task_id} onChange={(event) => updateField('predecessor_task_id', event.target.value)}>
            <option value="">Select task</option>
            {tasks.map((task) => <option key={task.id} value={task.id}>{task.name}</option>)}
          </select>
        </label>
        <label>
          Successor
          <select disabled={!canEdit || tasks.length < 2} value={form.successor_task_id} onChange={(event) => updateField('successor_task_id', event.target.value)}>
            <option value="">Select task</option>
            {tasks.map((task) => <option key={task.id} value={task.id}>{task.name}</option>)}
          </select>
        </label>
        <div className="two-col">
          <label>
            Type
            <select disabled={!canEdit} value={form.type} onChange={(event) => updateField('type', event.target.value)}>
              {Object.entries(dependencyLabels).map(([value, label]) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
          <label>
            Lag days
            <input disabled={!canEdit} type="number" value={form.lag_days} onChange={(event) => updateField('lag_days', event.target.value)} />
          </label>
        </div>
        {error && <p className="error-box">{error}</p>}
        <button className="primary-button compact" disabled={!canEdit || saving || tasks.length < 2}>{saving ? 'Adding...' : 'Add dependency'}</button>
      </form>

      <div className="dependency-list">
        {dependencies.map((dependency) => (
          <div className="dependency-item" key={dependency.id}>
            <div>
              <strong>{dependency.predecessor_name}</strong>
              <span>{dependency.type} {dependency.lag_days ? `+ ${dependency.lag_days}d` : ''}</span>
              <strong>{dependency.successor_name}</strong>
            </div>
            {canEdit && <button className="danger-button compact" onClick={() => onDeleteDependency(dependency)} type="button">Remove</button>}
          </div>
        ))}
        {dependencies.length === 0 && <p className="muted">No dependencies yet. Add links to show arrows on the Gantt chart.</p>}
      </div>
    </section>
  );
}
