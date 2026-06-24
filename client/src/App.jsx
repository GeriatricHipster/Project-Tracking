import { useEffect, useState } from 'react';
import AuthScreen from './components/AuthScreen';
import Dashboard from './components/Dashboard';
import ProjectView from './components/ProjectView';
import SiteBanner from './components/SiteBanner';
import { api, getToken, setToken } from './lib/api';

const backgroundOptions = [
  { value: 'midnight', label: 'Midnight' },
  { value: 'ember', label: 'Ember' },
  { value: 'slate', label: 'Slate' },
  { value: 'steel', label: 'Steel' },
  { value: 'aurora', label: 'Aurora' },
  { value: 'forest', label: 'Forest' },
  { value: 'plum', label: 'Plum' },
  { value: 'sunset', label: 'Sunset' }
];

function backgroundStorageKey(userId) {
  return userId ? `psg-background:${userId}` : 'psg-background:guest';
}

function readBackgroundPreference(userId) {
  if (typeof window === 'undefined') return 'midnight';
  const userKey = backgroundStorageKey(userId);
  return window.localStorage.getItem(userKey)
    || window.localStorage.getItem('psg-background:guest')
    || backgroundOptions[0].value;
}

export default function App() {
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'light';
    return window.localStorage.getItem('psg-theme') || 'light';
  });
  const [background, setBackground] = useState(() => readBackgroundPreference(null));
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
    document.documentElement.style.colorScheme = theme;
    window.localStorage.setItem('psg-theme', theme);
  }, [theme]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.dataset.background = background;
    if (user?.id) {
      window.localStorage.setItem(backgroundStorageKey(user.id), background);
    } else {
      window.localStorage.setItem('psg-background:guest', background);
    }
  }, [background, user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    setBackground(readBackgroundPreference(user.id));
  }, [user?.id]);

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
        setBackground(readBackgroundPreference(me.user.id));
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
    setBackground(readBackgroundPreference(data.user.id));
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

  function changeBackground(value) {
    setBackground(value);
  }

  function logout() {
    setToken(null);
    setTokenState(null);
    setUser(null);
    setProjects([]);
    setSelectedProjectId(null);
  }

  const floatingControls = (
    <div className="floating-controls" aria-label="Display controls">
      <button className="theme-toggle-button" onClick={toggleTheme} type="button" aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
        {theme === 'dark' ? 'Light mode' : 'Dark mode'}
      </button>
      <label className="background-select-wrap">
        <span className="sr-only">Background</span>
        <select className="background-select" value={background} onChange={(event) => changeBackground(event.target.value)} aria-label="Change app background">
          {backgroundOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </label>
    </div>
  );

  if (booting) {
    return <>{floatingControls}<main className="app-page"><SiteBanner /><div className="panel loading-panel">Starting PSG and SS Tracking...</div></main></>;
  }

  if (!token || !user) {
    return <>{floatingControls}<AuthScreen onAuth={handleAuth} /></>;
  }

  if (selectedProjectId) {
    return <>{floatingControls}<ProjectView projectId={selectedProjectId} user={user} onBack={() => { setSelectedProjectId(null); loadProjects(); }} /></>;
  }

  return (
    <>
      {floatingControls}
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
