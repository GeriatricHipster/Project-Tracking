import { useEffect, useMemo, useState } from 'react';
import AppErrorBoundary from './components/AppErrorBoundary';
import AuthScreen from './components/AuthScreen';
import Dashboard from './components/Dashboard';
import ProjectView from './components/ProjectView';
import SiteBanner from './components/SiteBanner';
import { api, getToken, setToken } from './lib/api';

const backgroundOptions = [
  { value: 'classic', label: 'Classic' },
  { value: 'aurora', label: 'Aurora' },
  { value: 'ocean', label: 'Ocean' },
  { value: 'forest', label: 'Forest' },
  { value: 'sunset', label: 'Sunset' },
  { value: 'slate', label: 'Slate' },
  { value: 'plum', label: 'Plum' },
  { value: 'graphite', label: 'Graphite' }
];

function useStoredBackground() {
  return useMemo(() => {
    if (typeof window === 'undefined') return 'classic';
    return window.localStorage.getItem('psg-background') || 'classic';
  }, []);
}

export default function App() {
  const storedBackground = useStoredBackground();
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'light';
    return window.localStorage.getItem('psg-theme') || 'light';
  });
  const [backgroundChoice, setBackgroundChoice] = useState(storedBackground);
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
    document.documentElement.dataset.background = backgroundChoice;
    window.localStorage.setItem('psg-background', backgroundChoice);
  }, [backgroundChoice]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem('psg-background');
    if (stored) setBackgroundChoice(stored);
  }, []);

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

  const shellControls = (
    <div className="app-shell-controls">
      <button className="theme-toggle-button" onClick={toggleTheme} type="button" aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
        {theme === 'dark' ? 'Light mode' : 'Dark mode'}
      </button>
      <label className="background-picker">
        <span>Background</span>
        <select value={backgroundChoice} onChange={(event) => setBackgroundChoice(event.target.value)}>
          {backgroundOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </label>
    </div>
  );

  if (booting) {
    return (
      <>
        {shellControls}
        <main className="app-page">
          <SiteBanner />
          <div className="panel loading-panel">Starting PSG and SS Tracking...</div>
        </main>
      </>
    );
  }

  if (!token || !user) {
    return (
      <>
        {shellControls}
        <AuthScreen onAuth={handleAuth} />
      </>
    );
  }

  if (selectedProjectId) {
    return (
      <>
        {shellControls}
        <AppErrorBoundary controls={shellControls}>
          <ProjectView
            key={selectedProjectId}
            projectId={selectedProjectId}
            user={user}
            onBack={() => setSelectedProjectId(null)}
          />
        </AppErrorBoundary>
      </>
    );
  }

  return (
    <>
      {shellControls}
      <AppErrorBoundary controls={shellControls}>
        <Dashboard
          user={user}
          projects={projects}
          loading={loadingProjects}
          onOpenProject={(projectId) => setSelectedProjectId(projectId)}
          onCreateProject={createProject}
          onUpdateProject={updateProject}
          onDeleteProject={deleteProject}
          onRefresh={loadProjects}
          onLogout={logout}
        />
      </AppErrorBoundary>
    </>
  );
}
