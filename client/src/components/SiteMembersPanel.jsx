import { useEffect, useState } from 'react';
import { api } from '../lib/api';

const siteRoles = ['owner', 'manager', 'member'];

function titleCase(value) {
  return String(value || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function SiteMembersPanel({ currentUser, onOpenProject }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingUserId, setSavingUserId] = useState(null);
  const [passwordDrafts, setPasswordDrafts] = useState({});

  const currentSiteRole = currentUser?.site_role || 'member';
  const currentIsOwner = currentSiteRole === 'owner';

  async function loadUsers() {
    setLoading(true);
    setError('');
    try {
      const data = await api('/site/users');
      setUsers(data.users || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  function canChangeUser(user) {
    if (user.id === currentUser?.id) return false;
    if (currentIsOwner) return true;
    return user.site_role !== 'owner';
  }

  function allowedRoleOptions(user) {
    if (currentIsOwner) return siteRoles;
    if (user.site_role === 'owner') return ['owner'];
    return siteRoles.filter((role) => role !== 'owner');
  }

  async function updateUser(user, payload) {
    setSavingUserId(user.id);
    setError('');
    try {
      await api(`/site/users/${user.id}`, { method: 'PATCH', body: payload });
      await loadUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingUserId(null);
    }
  }

  async function changePassword(user) {
    const password = String(passwordDrafts[user.id] || '').trim();
    if (!password) {
      setError('Enter a new password before saving.');
      return;
    }
    setSavingUserId(user.id);
    setError('');
    try {
      await api(`/site/users/${user.id}/password`, { method: 'PATCH', body: { password } });
      setPasswordDrafts((current) => ({ ...current, [user.id]: '' }));
      await loadUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingUserId(null);
    }
  }

  async function deleteUser(user) {
    const confirmed = window.confirm(`Delete ${user.name}? This removes their login and project assignments.`);
    if (!confirmed) return;
    setSavingUserId(user.id);
    setError('');
    try {
      await api(`/site/users/${user.id}`, { method: 'DELETE' });
      await loadUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingUserId(null);
    }
  }

  return (
    <section className="dashboard-stack">
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Site member management</h2>
            <p>Managers and owners can review users, revoke access, delete accounts, and change site role.</p>
          </div>
          <button className="ghost-button compact" onClick={loadUsers} type="button">Refresh users</button>
        </div>

        {error && <p className="error-box dashboard-error">{error}</p>}
        {loading && <div className="panel loading-panel">Loading site members...</div>}

        {!loading && (
          <div className="site-user-list">
            {users.map((siteUser) => {
              const canChange = canChangeUser(siteUser);
              const busy = savingUserId === siteUser.id;
              const projects = Array.isArray(siteUser.projects) ? siteUser.projects : [];
              return (
                <article className={`site-user-card ${siteUser.access_revoked ? 'revoked' : ''}`} key={siteUser.id}>
                  <div className="site-user-main">
                    <div>
                      <div className="project-card-title-row">
                        <h3>{siteUser.name}</h3>
                        <span className={`role-pill role-${siteUser.site_role}`}>{titleCase(siteUser.site_role)}</span>
                        {siteUser.access_revoked && <span className="status-pill status-blocked">Access revoked</span>}
                        {siteUser.id === currentUser?.id && <span className="archive-pill">You</span>}
                      </div>
                      <p className="muted">{siteUser.email}</p>
                      <p>{siteUser.project_count} assigned project{siteUser.project_count === 1 ? '' : 's'}</p>
                      {siteUser.trade && <p className="muted">Trade: {siteUser.trade}</p>}
                    </div>

                    <div className="site-user-actions">
                      <label>
                        Site role
                        <select
                          disabled={!canChange || busy}
                          value={siteUser.site_role}
                          onChange={(event) => updateUser(siteUser, { site_role: event.target.value })}
                        >
                          {allowedRoleOptions(siteUser).map((role) => <option key={role} value={role}>{titleCase(role)}</option>)}
                        </select>
                      </label>
                      <label>
                        Reset password
                        <input
                          disabled={!canChange || busy}
                          type="password"
                          value={passwordDrafts[siteUser.id] || ''}
                          onChange={(event) => setPasswordDrafts((current) => ({ ...current, [siteUser.id]: event.target.value }))}
                          placeholder="New password"
                        />
                      </label>
                      <button
                        className="ghost-button compact"
                        disabled={!canChange || busy || !passwordDrafts[siteUser.id]}
                        onClick={() => changePassword(siteUser)}
                        type="button"
                      >
                        Change password
                      </button>
                      <button
                        className={siteUser.access_revoked ? 'ghost-button compact' : 'danger-button compact'}
                        disabled={!canChange || busy}
                        onClick={() => updateUser(siteUser, { access_revoked: !siteUser.access_revoked })}
                        type="button"
                      >
                        {siteUser.access_revoked ? 'Restore access' : 'Revoke access'}
                      </button>
                      <button
                        className="danger-button compact"
                        disabled={!canChange || busy}
                        onClick={() => deleteUser(siteUser)}
                        type="button"
                      >
                        Delete user
                      </button>
                    </div>
                  </div>

                  <div className="assigned-project-list site-projects">
                    {projects.map((project) => (
                      <button className="assigned-project-chip" key={`${siteUser.id}-${project.id}`} onClick={() => onOpenProject(project.id)} type="button">
                        <strong>{project.name}</strong>
                        <span>{titleCase(project.role)} · {titleCase(project.project_status)} · {project.location || 'No location set'}</span>
                      </button>
                    ))}
                    {!projects.length && <p className="muted">This user is not assigned to any projects yet.</p>}
                  </div>
                </article>
              );
            })}
            {!users.length && <div className="empty-state"><h3>No users found</h3><p>Registered users will appear here.</p></div>}
          </div>
        )}
      </section>
    </section>
  );
}
