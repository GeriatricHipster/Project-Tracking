import { useEffect, useState } from 'react';
import { api } from '../lib/api';

const siteRoles = ['owner', 'manager', 'member'];
const SECURITY_SYSTEM_STORAGE_KEY = 'psg-assignee-systems';
const VENDOR_STORAGE_KEY = 'psg-vendors';

const securitySystemSeed = [
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

const vendorSeed = [
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

function titleCase(value) {
  return String(value || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function normalizeList(values) {
  return [...new Set((values || []).map((value) => String(value || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function readStoredSecuritySystems() {
  if (typeof window === 'undefined') return [...securitySystemSeed];
  try {
    const raw = window.localStorage.getItem(SECURITY_SYSTEM_STORAGE_KEY);
    if (!raw) return [...securitySystemSeed];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [...securitySystemSeed];
    return normalizeList(parsed);
  } catch {
    return [...securitySystemSeed];
  }
}

function writeStoredSecuritySystems(values) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(SECURITY_SYSTEM_STORAGE_KEY, JSON.stringify(normalizeList(values)));
}

function readStoredVendorOptions() {
  if (typeof window === 'undefined') return [...vendorSeed];
  try {
    const raw = window.localStorage.getItem(VENDOR_STORAGE_KEY);
    if (!raw) return [...vendorSeed];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [...vendorSeed];
    return normalizeList([...vendorSeed, ...parsed]);
  } catch {
    return [...vendorSeed];
  }
}

function writeStoredVendorOptions(values) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(VENDOR_STORAGE_KEY, JSON.stringify(normalizeList(values)));
}

function notifyDropdownOptionsUpdated(storageKey) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('dropdown-options-updated', { detail: { storageKey } }));
}

export default function SiteMembersPanel({ currentUser, onOpenProject }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingUserId, setSavingUserId] = useState(null);
  const [passwordDrafts, setPasswordDrafts] = useState({});
  const [securitySystems, setSecuritySystems] = useState(() => readStoredSecuritySystems());
  const [vendorOptions, setVendorOptions] = useState(() => readStoredVendorOptions());

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
    writeStoredSecuritySystems(securitySystems);
  }, [securitySystems]);

  useEffect(() => {
    writeStoredVendorOptions(vendorOptions);
  }, [vendorOptions]);

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

  function deleteSecuritySystemOption(option) {
    const confirmed = window.confirm(`Delete "${option}" from the Security Systems dropdown?`);
    if (!confirmed) return;
    const next = normalizeList(securitySystems.filter((item) => item !== option));
    setSecuritySystems(next);
    writeStoredSecuritySystems(next);
    notifyDropdownOptionsUpdated(SECURITY_SYSTEM_STORAGE_KEY);
  }

  function resetSecuritySystemOptions() {
    const confirmed = window.confirm('Restore the Security Systems dropdown to the default list?');
    if (!confirmed) return;
    const next = [...securitySystemSeed];
    setSecuritySystems(next);
    writeStoredSecuritySystems(next);
    notifyDropdownOptionsUpdated(SECURITY_SYSTEM_STORAGE_KEY);
  }


  function deleteVendorOption(option) {
    const confirmed = window.confirm(`Delete "${option}" from the Vendor dropdown?`);
    if (!confirmed) return;
    const next = normalizeList(vendorOptions.filter((item) => item !== option));
    setVendorOptions(next);
    writeStoredVendorOptions(next);
    notifyDropdownOptionsUpdated(VENDOR_STORAGE_KEY);
  }

  function resetVendorOptions() {
    const confirmed = window.confirm('Restore the default Vendor dropdown options?');
    if (!confirmed) return;
    const next = [...vendorSeed];
    setVendorOptions(next);
    writeStoredVendorOptions(next);
    notifyDropdownOptionsUpdated(VENDOR_STORAGE_KEY);
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
                        <span>{titleCase(project.role)} ¬∑ {titleCase(project.project_status)} ¬∑ {project.location || 'No location set'}</span>
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
        <>
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>Security Systems dropdown options</h2>
                <p>Owners can remove options that appear in both Security Systems dropdowns on task forms.</p>
              </div>
              <button className="ghost-button compact" onClick={resetSecuritySystemOptions} type="button">Reset defaults</button>
            </div>

            <p className="muted" style={{ marginTop: 0 }}>
              Removing an option updates this browser&apos;s saved list. Open the task form again to see the change.
            </p>

            <div className="site-user-list">
              {securitySystems.map((option) => (
                <article className="site-user-card" key={option}>
                  <div className="site-user-main">
                    <div>
                      <h3>{option}</h3>
                      <p className="muted">Used by the Security Systems team member dropdowns.</p>
                    </div>
                    <div className="site-user-actions">
                      <button className="danger-button compact" onClick={() => deleteSecuritySystemOption(option)} type="button">
                        Delete option
                      </button>
                    </div>
                  </div>
                </article>
              ))}
              {!securitySystems.length && (
                <div className="empty-state">
                  <h3>No options found</h3>
                  <p>Reset the defaults to restore the list.</p>
                </div>
              )}
            </div>
          </section>

          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>Vendor dropdown options</h2>
                <p>Owners can remove options from the Vendor and Vendor 2 dropdowns on task forms.</p>
              </div>
              <button className="ghost-button compact" onClick={resetVendorOptions} type="button">Reset defaults</button>
            </div>

            <p className="muted" style={{ marginTop: 0 }}>
              Removing an option updates this browser&apos;s saved list. Open the task form again to see the change.
            </p>

            <div className="site-user-list">
              {vendorOptions.map((option) => (
                <article className="site-user-card" key={option}>
                  <div className="site-user-main">
                    <div>
                      <h3>{option}</h3>
                      <p className="muted">Used by the Vendor dropdowns.</p>
                    </div>
                    <div className="site-user-actions">
                      <button className="danger-button compact" onClick={() => deleteVendorOption(option)} type="button">
                        Delete option
                      </button>
                    </div>
                  </div>
                </article>
              ))}
              {!vendorOptions.length && (
                <div className="empty-state">
                  <h3>No options found</h3>
                  <p>Reset the defaults to restore the list.</p>
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </section>
  );
}
