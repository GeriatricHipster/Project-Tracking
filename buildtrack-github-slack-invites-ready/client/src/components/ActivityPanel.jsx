function humanizeAction(action) {
  return String(action || '').replaceAll('_', ' ');
}

export default function ActivityPanel({ audit }) {
  return (
    <section className="panel side-panel">
      <div className="panel-heading compact-heading">
        <div>
          <h2>Activity</h2>
          <p>Latest project changes</p>
        </div>
      </div>
      <div className="activity-list">
        {audit.map((entry) => (
          <article className="activity-item" key={entry.id}>
            <strong>{humanizeAction(entry.action)}</strong>
            <span>{entry.user_name || 'System'} · {new Date(entry.created_at).toLocaleString()}</span>
            <small>{entry.entity_type}{entry.task_id ? ` #${entry.task_id}` : ''}</small>
          </article>
        ))}
        {audit.length === 0 && <p className="muted">No activity yet.</p>}
      </div>
    </section>
  );
}
