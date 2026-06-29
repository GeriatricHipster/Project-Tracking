import { useEffect, useState } from 'react';
import { api } from '../lib/api';

const siteRoles = ['owner', 'manager', 'member'];
const LIST_UPDATED_EVENT = 'psg-persistent-list-updated';
const SECURITY_SYSTEMS_STORAGE_KEY = 'psg-assignee-systems';
const SECURITY_SYSTEMS_DEFAULTS = [
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

function titleCase(value) {
  return String(value || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function readStoredList(key, fallback) {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return fallback;
    return [...new Set(parsed.map((value) => String(value).trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  } catch {
    return fallback;
  }
}

function writeStoredList(key, values) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, JSON.stringify(values));
}

function broadcastListUpdate(storageKey) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(LIST_UPDATED_EVENT, {
    detail: { storageKey }
  }));
}

export default function SiteMembersPanel({ currentUser, onOpenProject }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingUserId, setSavingUserId] = useState(null);
  const [passwordDrafts, setPasswordDrafts] = useState({});
  const [securitySystems, setSecuritySystems] = useState(() => readStoredList(SECURITY_SYSTEMS_STORAGE_KEY, SECURITY_SYSTEMS_DEFAULTS));
  const [newSecuritySystem, setNewSecuritySystem] = useState('');
  const [listNotice, setListNotice] = useState('');

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

  useEffect(() => {
    function handleStorageEvent(event) {
      if (event.key === SECURITY_SYSTEMS_STORAGE_KEY) {
        setSecuritySystems(readStoredList(SECURITY_SYSTEMS_STORAGE_KEY, SECURITY_SYSTEMS_DEFAULTS));
      }
    }

    function handleListUpdate(event) {
      if (!event?.detail || event.detail.storageKey === SECURITY_SYSTEMS_STORAGE_KEY) {
        setSecuritySystems(readStoredList(SECURITY_SYSTEMS_STORAGE_KEY, SECURITY_SYSTEMS_DEFAULTS));
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorageEvent);
      window.addEventListener(LIST_UPDATED_EVENT, handleListUpdate);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', handleStorageEvent);
        window.removeEventListener(LIST_UPDATED_EVENT, handleListUpdate);
      }
    };
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

  function updatePasswordDraft(userId, value) {
    setPasswordDrafts((current) => ({ ...current, [userId]: value }));
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

  function saveSecuritySystems(nextValues) {
    const normalized = [...new Set(nextValues.map((value) => String(value).trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    setSecuritySystems(normalized);
    writeStoredList(SECURITY_SYSTEMS_STORAGE_KEY, normalized);
    broadcastListUpdate(SECURITY_SYSTEMS_STORAGE_KEY);
  }

  function addSecuritySystemOption(event) {
    event.preventDefault();
    const next = String(newSecuritySystem || '').trim();
    if (!next) return;
    saveSecuritySystems([...securitySystems, next]);
    setNewSecuritySystem('');
    setListNotice(`Added "${next}".`);
  }

  function removeSecuritySystemOption(option) {
    const confirmed = window.confirm(`Remove "${option}" from the Security Systems dropdown?`);
    if (!confirmed) return;
    saveSecuritySystems(securitySystems.filter((entry) => entry !== option));
    setListNotice(`Removed "${option}".`);
  }

  function resetSecuritySystems() {
    const confirmed = window.confirm('Restore the default Security Systems dropdown list? This will replace any custom changes in this browser.');
    if (!confirmed) return;
    saveSecuritySystems(SECURITY_SYSTEMS_DEFAULTS);
    setNewSecuritySystem('');
    setListNotice('Restored the default list.');
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
                        Change password
                        <input
                          disabled={!canChange || busy}
                          type="password"
                          value={passwordDrafts[siteUser.id] || ''}
                          onChange={(event) => updatePasswordDraft(siteUser.id, event.target.value)}
                          placeholder="New password"
                        />
                      </label>
                      <button
                        className={siteUser.access_revoked ? 'ghost-button compact' : 'danger-button compact'}
                        disabled={!canChange || busy}
                        onClick={() => updateUser(siteUser, { access_revoked: !siteUser.access_revoked })}
                        type="button"
                      >
                        {siteUser.access_revoked ? 'Restore access' : 'Revoke access'}
                      </button>
                      <button
                        className="primary-button compact"
                        disabled={!canChange || busy || !String(passwordDrafts[siteUser.id] || '').trim()}
                        onClick={() => updateUser(siteUser, { password: passwordDrafts[siteUser.id] })}
                        type="button"
                      >
                        Update password
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

      {currentIsOwner && (
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Security Systems dropdown options</h2>
              <p>Owners can add, remove, or reset the Security Systems team member list used in task forms.</p>
            </div>
            <button className="ghost-button compact" onClick={resetSecuritySystems} type="button">
              Reset defaults
            </button>
          </div>

          <form className="stack compact-form" onSubmit={addSecuritySystemOption}>
            <label>
              Add option
              <input
                value={newSecuritySystem}
                onChange={(event) => setNewSecuritySystem(event.target.value)}
                placeholder="Enter a new dropdown option"
              />
            </label>
            <button className="primary-button compact" type="submit" disabled={!String(newSecuritySystem || '').trim()}>
              Add option
            </button>
          </form>

          {listNotice && <p className="notice-box">{listNotice}</p>}

          <div className="member-list">
            {securitySystems.map((option) => (
              <div className="member-item" key={option}>
                <div>
                  <strong>{option}</strong>
                  <span>Used in the Security Systems dropdown</span>
                </div>
                <div className="member-actions">
                  <button
                    className="danger-button compact"
                    onClick={() => removeSecuritySystemOption(option)}
                    type="button"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
            {!securitySystems.length && <p className="muted">No dropdown options found.</p>}
          </div>
        </section>
      )}
    </section>
  );
}
