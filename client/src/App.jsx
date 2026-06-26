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
  const [background, setBackground] = useState(() => {
    if (typeof window === 'undefined') return 'aurora';
    return window.localStorage.getItem('psg-background') || 'aurora';
  });
  const [token, setTokenState] = useState(getToken());
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [booting, setBooting] = useState(Boolean(getToken()));

  function projectIdFromUrl() {
    const value = new URLSearchParams(window.location.search).get('project');
    const id = Number(value);
    return Number.isInteger(id) && id > 0 ? id : null;
  }

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.bg = background;
    document.documentElement.style.colorScheme = theme;
    window.localStorage.setItem('psg-theme', theme);
    window.localStorage.setItem('psg-background', background);
  }, [theme, background]);

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
  function routeAfterAuth(nextProjects) {
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

  async function handleAuth(data, rememberMe = true) {
    setToken(data.token, rememberMe);
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

  function changeBackground(event) {
    setBackground(event.target.value);
  }

  function logout() {
    setToken(null);
    setTokenState(null);
    setUser(null);
    setProjects([]);
    setSelectedProjectId(null);
  }

  const themeToggle = (
    <div className="theme-controls">
      <select className="background-select" value={background} onChange={changeBackground} aria-label="Background theme">
        <option value="aurora">Aurora</option>
        <option value="sunset">Sunset</option>
        <option value="ocean">Ocean</option>
        <option value="forest">Forest</option>
        <option value="violet">Violet</option>
        <option value="ember">Ember</option>
      </select>
      <button className="theme-toggle-button" onClick={toggleTheme} type="button" aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
        {theme === 'dark' ? 'Light mode' : 'Dark mode'}
      </button>
    </div>
  );

  if (booting) {
    return <>{themeToggle}<main className="app-page"><SiteBanner /><div className="panel loading-panel">Starting PSG and SS Tracking...</div></main></>;
  }

  if (!token || !user) {
    return <>{themeToggle}<AuthScreen onAuth={handleAuth} /></>;
  }

  if (selectedProjectId) {
    return <>{themeToggle}<ProjectView projectId={selectedProjectId} user={user} onBack={() => { setSelectedProjectId(null); loadProjects(); }} /></>;
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
        onRefresh={loadProjects}
        onLogout={logout}
      />
    </>
  );
}
