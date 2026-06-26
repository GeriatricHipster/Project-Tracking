import React, { useEffect, useState } from 'react';
import AuthScreen from './components/AuthScreen';
import Dashboard from './components/Dashboard';
import ProjectView from './components/ProjectView';
import SiteBanner from './components/SiteBanner';
import { api, getToken, setToken } from './lib/api';

const backgroundOptions = ['aurora', 'sunset', 'mint', 'indigo', 'ember', 'ocean'];


class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidUpdate(prevProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.error) {
      // Clear recoverable errors when the route or tab context changes.
      // This keeps a single bad render from blanking the whole app.
      // eslint-disable-next-line react/no-did-update-set-state
      this.setState({ error: null });
    }
  }

  render() {
    if (this.state.error) {
      return (
        <main className="app-page">
          <SiteBanner />
          <div className="panel loading-panel">
            <h2>Something went wrong</h2>
            <p>{this.state.error?.message || 'The page hit a rendering problem. Reloading usually clears it.'}</p>
            <div className="row-actions">
              <button className="primary-button" type="button" onClick={() => window.location.reload()}>Reload</button>
            </div>
          </div>
        </main>
      );
    }
    return this.props.children;
  }
}

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

  function cycleBackground() {
    setBackground((current) => {
      const index = backgroundOptions.indexOf(current);
      return backgroundOptions[(index + 1) % backgroundOptions.length];
    });
  }

  function logout() {
    setToken(null);
    setTokenState(null);
    setUser(null);
    setProjects([]);
    setSelectedProjectId(null);
  }

  const topControls = (
    <div className="top-right-controls">
      <button className="theme-toggle-button" onClick={toggleTheme} type="button" aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
        {theme === 'dark' ? 'Light mode' : 'Dark mode'}
      </button>
      <button className="theme-toggle-button background-toggle" onClick={cycleBackground} type="button" aria-label="Change app background">
        Background: {background}
      </button>
    </div>
  );

  if (booting) {
    return <>{topControls}<main className="app-page"><SiteBanner /><div className="panel loading-panel">Starting PSG and SS Tracking...</div></main></>;
  }

  if (!token || !user) {
    return <>{topControls}<AuthScreen onAuth={handleAuth} /></>;
  }

  return (
    <AppErrorBoundary resetKey={selectedProjectId ? `project-${selectedProjectId}` : 'dashboard'}>
      {topControls}
      {selectedProjectId ? (
        <ProjectView projectId={selectedProjectId} user={user} onBack={() => { setSelectedProjectId(null); loadProjects(); }} />
      ) : (
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
      )}
    </AppErrorBoundary>
  );
}
