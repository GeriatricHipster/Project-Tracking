import { useEffect, useState } from 'react';
import { api } from '../lib/api';

const siteRoles = ['owner', 'manager', 'editor', 'viewer'];
const accessStatuses = ['active', 'revoked'];

function titleCase(value) {
  return String(value || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function SiteMembersPanel({ currentUser }) {
  const [users, setUsers] = useState([]);
  const [access, setAccess] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyUserId, setBusyUserId] = useState(null);

  async function loadUsers() {
    setLoading(true);
    setError('');
    try {
      const data = await api('/site/users');
      setUsers(data.users || []);
      setAccess(data.access || null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function patchUser(user, payload) {
    setBusyUserId(user.id);
    setError('');
    try {
      const data = await api(`/site/users/${user.id}`, { method: 'PATCH', body: payload });
      setUsers((current) => current.map((candidate) => (candidate.id === user.id ? { ...candidate, ...data.user } : candidate)));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyUserId(null);
    }
  }

  async function deleteUser(user) {
    const confirmed = window.confirm(`Delete ${user.name}? This removes their login and project assignments. Tasks they were assigned to will remain but become unassigned.`);
    if (!confirmed) return;
    setBusyUserId(user.id);
    setError('');
    try {
      await api(`/site/users/${user.id}`, { method: 'DELETE' });
      setUsers((current) => current.filter((candidate) => candidate.id !== user.id));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyUserId(null);
    }
  }

  function canChangeOwnerLevel(user) {
    return access?.is_site_owner || user.site_role !== 'owner';
  }

  return (
    <section className="dashboard-stack">
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Site members</h2>
            <p>Manage site access, global roles, revoked access, and user deletion.</p>
          </div>
          <button className="ghost-button compact" onClick={loadUsers} type="button">Refresh users</button>
        </div>
        {loading && <p className="muted">Loading site members...</p>}
        {error && <p className="error-box">{error}</p>}

        <div className="site-member-list">
          {users.map((siteUser) => {
            const isSelf = siteUser.id === currentUser?.id;
            const busy = busyUserId === siteUser.id;
            const projects = Array.isArray(siteUser.projects) ? siteUser.projects : [];
            const lockOwner = !canChangeOwnerLevel(siteUser);
            return (
              <article className={`site-member-card ${siteUser.access_status === 'revoked' ? 'revoked' : ''}`} key={siteUser.id}>
                <div className="site-member-main">
                  <div>
                    <div className="project-card-title-row">
                      <h3>{siteUser.name}</h3>
                      {isSelf && <span className="archive-pill">You</span>}
                      <span className={`role-pill role-${siteUser.site_role}`}>Site {siteUser.site_role}</span>
                      <span className={`status-pill status-${siteUser.access_status === 'active' ? 'in_progress' : 'blocked'}`}>{titleCase(siteUser.access_status)}</span>
                    </div>
                    <p className="muted">{siteUser.email}</p>
                  </div>
                  <div className="site-member-controls">
                    <label>
                      Site role
                      <select
                        disabled={busy || lockOwner}
                        value={siteUser.site_role}
                        onChange={(event) => patchUser(siteUser, { site_role: event.target.value })}
                      >
                        {siteRoles.map((role) => <option key={role} value={role}>{role}</option>)}
                      </select>
                    </label>
                    <label>
                      Access
                      <select
                        disabled={busy || isSelf || lockOwner}
                        value={siteUser.access_status}
                        onChange={(event) => patchUser(siteUser, { access_status: event.target.value })}
                      >
                        {accessStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                      </select>
                    </label>
                    <button className="danger-button compact" disabled={busy || isSelf || lockOwner} onClick={() => deleteUser(siteUser)} type="button">
                      {busy ? 'Saving...' : 'Delete user'}
                    </button>
                  </div>
                </div>

                <div className="assigned-project-list site-project-list">
                  {projects.map((project) => (
                    <span className="assigned-project-chip static" key={`${siteUser.id}-${project.project_id}`}>
                      <strong>{project.project_name}</strong>
                      <span>{titleCase(project.role)} · {titleCase(project.project_status)}</span>
                    </span>
                  ))}
                  {!projects.length && <span className="muted">No project assignments.</span>}
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </section>
  );
}
