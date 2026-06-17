import { useState } from 'react';
import { addDays, formatDate, todayIso } from '../lib/dates';

export default function Dashboard({ user, projects, loading, onOpenProject, onCreateProject, onRefresh, onLogout }) {
  const start = todayIso();
  const [form, setForm] = useState({
    name: '',
    location: '',
    description: '',
    start_date: start,
    end_date: addDays(start, 90)
  });
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
      await onCreateProject(form);
      setForm({ name: '', location: '', description: '', start_date: start, end_date: addDays(start, 90) });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="app-page">
      <header className="topbar">
        <div className="brand-lockup small">
          <span className="brand-mark">BT</span>
          <div>
            <strong>BuildTrack Cloud</strong>
            <span>{user?.name}</span>
          </div>
        </div>
        <div className="topbar-actions">
          <button className="ghost-button" onClick={onRefresh} type="button">Refresh</button>
          <button className="ghost-button" onClick={onLogout} type="button">Logout</button>
        </div>
      </header>

      <section className="page-grid">
        <aside className="panel create-panel">
          <h2>Create project</h2>
          <form className="stack" onSubmit={submit}>
            <label>
              Project name
              <input value={form.name} onChange={(event) => updateField('name', event.target.value)} placeholder="Medical office buildout" />
            </label>
            <label>
              Location
              <input value={form.location} onChange={(event) => updateField('location', event.target.value)} placeholder="City, state" />
            </label>
            <label>
              Description
              <textarea value={form.description} onChange={(event) => updateField('description', event.target.value)} placeholder="Scope, client, phase, or notes" />
            </label>
            <div className="two-col">
              <label>
                Start
                <input type="date" value={form.start_date} onChange={(event) => updateField('start_date', event.target.value)} />
              </label>
              <label>
                Finish
                <input type="date" value={form.end_date} onChange={(event) => updateField('end_date', event.target.value)} />
              </label>
            </div>
            {error && <p className="error-box">{error}</p>}
            <button className="primary-button" disabled={saving}>{saving ? 'Creating...' : 'Create project'}</button>
          </form>
        </aside>

        <section className="panel project-list-panel">
          <div className="panel-heading">
            <div>
              <h2>Projects</h2>
              <p>{loading ? 'Loading projects...' : `${projects.length} active project${projects.length === 1 ? '' : 's'}`}</p>
            </div>
          </div>

          <div className="project-card-list">
            {projects.map((project) => (
              <article className="project-card" key={project.id}>
                <div>
                  <div className="project-card-title-row">
                    <h3>{project.name}</h3>
                    <span className={`role-pill role-${project.role}`}>{project.role}</span>
                  </div>
                  <p className="muted">{project.location || 'No location set'}</p>
                  <p>{project.description || 'No project description yet.'}</p>
                </div>
                <div className="project-stats">
                  <span><strong>{project.task_count}</strong> tasks</span>
                  <span><strong>{project.average_progress}%</strong> avg complete</span>
                  <span>{formatDate(project.start_date)} to {formatDate(project.end_date)}</span>
                </div>
                <button className="primary-button compact" onClick={() => onOpenProject(project.id)} type="button">Open project</button>
              </article>
            ))}
            {!loading && projects.length === 0 && (
              <div className="empty-state">
                <h3>No projects yet</h3>
                <p>Create your first project, then add tasks and invite other users.</p>
              </div>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
