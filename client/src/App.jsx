import { useEffect, useState } from 'react';
import AuthScreen from './components/AuthScreen';
import Dashboard from './components/Dashboard';
import ProjectView from './components/ProjectView';
import SiteBanner from './components/SiteBanner';
import { api, getToken, setToken } from './lib/api';

export default function App() {
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'light';
    return window.localStorage.getItem('psg-theme') || 'light';
  });
  const [token, setTokenState] = useState(getToken());
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [inviteNotice, setInviteNotice] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [booting, setBooting] = useState(Boolean(getToken()));

  function projectIdFromUrl() {
    const value = new URLSearchParams(window.location.search).get('project');
    const id = Number(value);
    return Number.isInteger(id) && id > 0 ? id : null;
  }


  function inviteCodeFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('invite') || params.get('code') || '';
  }

  function clearInviteFromUrl() {
    const params = new URLSearchParams(window.location.search);
    params.delete('invite');
    params.delete('code');
    const query = params.toString();
    const nextUrl = `${window.location.pathname}${query ? `?${query}` : ''}`;
    window.history.replaceState(null, '', nextUrl);
  }

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    window.localStorage.setItem('psg-theme', theme);
  }, [theme]);

  function openProjectFromUrl(nextProjects) {
    const requestedProjectId = projectIdFromUrl();
    if (!requestedProjectId) return;
    if (nextProjects.some((project) => project.id === requestedProjectId)) {
      setSelectedProjectId(requestedProjectId);
      window.history.replaceState(null, '', window.location.pathname);
    }
  }

  async function loadProjects() {
    setLoadingProjects(true);
    try {
      const data = await api('/projects');
      setProjects(data.projects);
      return data.projects;
    } finally {
      setLoadingProjects(false);
    }
  }


  async function acceptInviteCode(code) {
    const inviteCode = String(code || '').trim();
    if (!inviteCode) throw new Error('Enter an invitation code first.');

    const data = await api(`/invites/${encodeURIComponent(inviteCode)}/accept`, { method: 'POST' });
    await loadProjects();
    setSelectedProjectId(data.project.id);
    setInviteNotice(`Invitation accepted. You now have ${data.membership.role} access to ${data.project.name}.`);
    setInviteError('');
    clearInviteFromUrl();
    return data;
  }

  async function routeAfterAuth(nextProjects) {
    const inviteCode = inviteCodeFromUrl();
    if (inviteCode) {
      try {
        await acceptInviteCode(inviteCode);
      } catch (err) {
        setInviteNotice('');
        setInviteError(`Invitation code could not be accepted: ${err.message}`);
        clearInviteFromUrl();
        openProjectFromUrl(nextProjects);
      }
      return;
    }
    openProjectFromUrl(nextProjects);
  }

  useEffect(() => {
    async function boot() {
      const storedToken = getToken();
      if (!storedToken) {
        setBooting(false);
        return;
      }

      try {
        const me = await api('/me');
        setUser(me.user);
        const nextProjects = await loadProjects();
        await routeAfterAuth(nextProjects);
      } catch (error) {
        setToken(null);
        setTokenState(null);
      } finally {
        setBooting(false);
      }
    }
    boot();
  }, []);

  async function handleAuth(data) {
    setToken(data.token);
    setTokenState(data.token);
    setUser(data.user);
    const nextProjects = await loadProjects();
    await routeAfterAuth(nextProjects);
  }

  async function createProject(payload) {
    await api('/projects', { method: 'POST', body: payload });
    await loadProjects();
  }

  async function updateProject(projectId, payload) {
    await api(`/projects/${projectId}`, { method: 'PATCH', body: payload });
    await loadProjects();
  }

  async function deleteProject(projectId) {
    await api(`/projects/${projectId}`, { method: 'DELETE' });
    await loadProjects();
  }

  function toggleTheme() {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'));
  }

  function logout() {
    setToken(null);
    setTokenState(null);
    setUser(null);
    setProjects([]);
    setSelectedProjectId(null);
  }

  const themeToggle = (
    <button className="theme-toggle-button" onClick={toggleTheme} type="button" aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
      {theme === 'dark' ? 'Light mode' : 'Dark mode'}
    </button>
  );

  if (booting) {
    return <><button className="theme-toggle-button" onClick={toggleTheme} type="button" aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</button><main className="app-page"><SiteBanner /><div className="panel loading-panel">Starting PSG and SS Tracking...</div></main></>;
  }

  if (!token || !user) {
    return <><button className="theme-toggle-button" onClick={toggleTheme} type="button" aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</button><AuthScreen onAuth={handleAuth} pendingInviteCode={inviteCodeFromUrl()} /></>;
  }

  if (selectedProjectId) {
    return <><button className="theme-toggle-button" onClick={toggleTheme} type="button" aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</button><ProjectView projectId={selectedProjectId} user={user} onBack={() => { setSelectedProjectId(null); loadProjects(); }} /></>;
  }

  return (
    <>
      {themeToggle}
      <Dashboard
        user={user}
        projects={projects}
        loading={loadingProjects}
        onOpenProject={setSelectedProjectId}
        onCreateProject={createProject}
        onUpdateProject={updateProject}
        onDeleteProject={deleteProject}
        onAcceptInvite={acceptInviteCode}
        inviteNotice={inviteNotice}
        inviteError={inviteError}
        onRefresh={loadProjects}
        onLogout={logout}
      />
    </>
  );
}
