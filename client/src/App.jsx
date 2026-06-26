import { useEffect, useState } from 'react';
import AuthScreen from './components/AuthScreen';
import Dashboard from './components/Dashboard';
import ProjectView from './components/ProjectView';
import SiteBanner from './components/SiteBanner';
import { api, getToken, setToken } from './lib/api';

const backgroundChoices = [
  { id: 'redwood', label: 'Redwood' },
  { id: 'sunset', label: 'Sunset' },
  { id: 'ocean', label: 'Ocean' },
  { id: 'forest', label: 'Forest' },
  { id: 'violet', label: 'Violet' },
  { id: 'slate', label: 'Slate' }
];

export default function App() {
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'light';
    return window.localStorage.getItem('psg-theme') || 'light';
  });
  const [background, setBackground] = useState(() => {
    if (typeof window === 'undefined') return 'redwood';
    return window.localStorage.getItem('psg-background') || 'redwood';
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
    document.documentElement.dataset.background = background;
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

  function logout() {
    setToken(null);
    setTokenState(null);
    setUser(null);
    setProjects([]);
    setSelectedProjectId(null);
  }

  const controls = (
    <div className="site-controls">
      <button className="theme-toggle-button" onClick={toggleTheme} type="button" aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
        {theme === 'dark' ? 'Light mode' : 'Dark mode'}
      </button>
      <details className="background-menu">
        <summary className="theme-toggle-button">Background</summary>
        <div className="background-menu-panel">
          {backgroundChoices.map((choice) => (
            <button key={choice.id} className={background === choice.id ? 'active' : ''} onClick={() => setBackground(choice.id)} type="button">
              {choice.label}
            </button>
          ))}
        </div>
      </details>
    </div>
  );

  if (booting) {
    return <><div className="top-right-controls">{controls}</div><main className="app-page"><SiteBanner /><div className="panel loading-panel">Starting PSG and SS Tracking...</div></main></>;
  }

  if (!token || !user) {
    return <><div className="top-right-controls">{controls}</div><AuthScreen onAuth={handleAuth} /></>;
  }

  if (selectedProjectId) {
    return <><div className="top-right-controls">{controls}</div><ProjectView projectId={selectedProjectId} user={user} onBack={() => { setSelectedProjectId(null); loadProjects(); }} /></>;
  }

  return (
    <>
      <div className="top-right-controls">{controls}</div>
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
