import { useState } from 'react';

export default function GanttChecklist({ checklist, canEdit, onToggle }) {
  const [savingKey, setSavingKey] = useState('');
  const [error, setError] = useState('');

  async function toggleItem(item) {
    if (!canEdit || savingKey) return;
    setSavingKey(item.item_key);
    setError('');
    try {
      await onToggle(item, !item.is_checked);
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingKey('');
    }
  }

  return (
    <section className="panel gantt-checklist-panel">
      <div className="panel-heading compact-heading">
        <div>
          <h2>Project Milestones</h2>
          <p>Access-control and turnover milestones for this project.</p>
        </div>
      </div>

      {error && <p className="error-box">{error}</p>}
      <div className="gantt-checklist-grid">
        {checklist.map((item) => (
          <label className={`checklist-card ${item.is_checked ? 'checked' : ''}`} key={item.item_key}>
            <input
              checked={Boolean(item.is_checked)}
              disabled={!canEdit || savingKey === item.item_key}
              onChange={() => toggleItem(item)}
              type="checkbox"
            />
            <span>{item.label}</span>
          </label>
        ))}
        {!checklist.length && <p className="muted">No checklist items found.</p>}
      </div>
    </section>
  );
}
