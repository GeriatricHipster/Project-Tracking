import { useEffect, useMemo, useState } from 'react';
import { api, getToken } from '../lib/api';
import { createProjectSocket } from '../lib/socket';
import { formatDate } from '../lib/dates';
import ActivityPanel from './ActivityPanel';
import BlueprintsPanel from './BlueprintsPanel';
import DependencyPanel from './DependencyPanel';
import GanttChart from './GanttChart';
import GanttChecklist from './GanttChecklist';
import MembersPanel from './MembersPanel';
import SiteBanner from './SiteBanner';
import TaskForm from './TaskForm';
import TaskTable from './TaskTable';

const roleRank = {
  portfolio_viewer: 0,
  viewer: 0,
  editor: 1,
  manager: 2,
  owner: 3
};

function titleCase(value) {
  return String(value || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function ProjectView({ projectId, user, onBack }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [editingTask, setEditingTask] = useState(null);

  const canEdit = roleRank[data?.project?.role || 'viewer'] >= roleRank.editor;
  const canManage = roleRank[data?.project?.role || 'viewer'] >= roleRank.manager;

  async function loadProject({ quiet = false } = {}) {
    if (!quiet) setLoading(true);
    setError('');
    try {
      const payload = await api(`/projects/${projectId}`);
      setData(payload);
      if (editingTask) {
        const refreshed = payload.tasks.find((task) => task.id === editingTask.id);
        setEditingTask(refreshed || null);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      if (!quiet) setLoading(false);
    }
  }

  useEffect(() => {
    loadProject();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  useEffect(() => {
    const token = getToken();
    if (!token) return undefined;

    const socket = createProjectSocket({
      token,
      projectId,
      onChange: (payload) => {
        setToast(payload.message || 'Project updated by another user.');
        loadProject({ quiet: true });
      },
      onError: (message) => setToast(message)
    });

    return () => socket.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(''), 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const orderedTasks = useMemo(() => {
    return [...(data?.tasks || [])].sort((a, b) => {
      if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
      if (a.start_date !== b.start_date) return a.start_date.localeCompare(b.start_date);
      return a.id - b.id;
    });
  }, [data]);

  async function saveTask(payload) {
    if (editingTask) {
      await api(`/tasks/${editingTask.id}`, { method: 'PATCH', body: payload });
    } else {
      await api(`/projects/${projectId}/tasks`, { method: 'POST', body: payload });
    }
    setEditingTask(null);
    await loadProject({ quiet: true });
  }

  async function deleteTask(task) {
    const confirmed = window.confirm(`Delete task "${task.name}"? This also removes its dependencies and comments.`);
    if (!confirmed) return;
    await api(`/tasks/${task.id}`, { method: 'DELETE' });
    if (editingTask?.id === task.id) setEditingTask(null);
    await loadProject({ quiet: true });
  }

  async function addDependency(payload) {
    await api(`/projects/${projectId}/dependencies`, { method: 'POST', body: payload });
    await loadProject({ quiet: true });
  }

  async function deleteDependency(dependency) {
    await api(`/dependencies/${dependency.id}`, { method: 'DELETE' });
    await loadProject({ quiet: true });
  }

  async function addMember(payload) {
    const result = await api(`/projects/${projectId}/members`, { method: 'POST', body: payload });
    await loadProject({ quiet: true });
    return result;
  }

  async function updateMember(member, role) {
    const result = await api(`/projects/${projectId}/members/${member.user_id}`, { method: 'PATCH', body: { role } });
    await loadProject({ quiet: true });
    return result;
  }

  async function removeMember(member) {
    const confirmed = window.confirm(`Remove ${member.name} from this project?`);
    if (!confirmed) return;
    await api(`/projects/${projectId}/members/${member.user_id}`, { method: 'DELETE' });
    await loadProject({ quiet: true });
  }

  async function updateChecklistItem(item, isChecked) {
    await api(`/projects/${projectId}/checklist/${item.item_key}`, {
      method: 'PATCH',
      body: { is_checked: isChecked }
    });
    await loadProject({ quiet: true });
  }

  async function uploadBlueprint(file) {
    const formData = new FormData();
    formData.append('blueprint', file);
    await api(`/projects/${projectId}/blueprints`, { method: 'POST', body: formData });
    await loadProject({ quiet: true });
  }

  async function deleteBlueprint(blueprint) {
    await api(`/blueprints/${blueprint.id}`, { method: 'DELETE' });
    await loadProject({ quiet: true });
  }




  if (loading && !data) {
    return (
      <main className="app-page">
        <SiteBanner />
        <button className="ghost-button" onClick={onBack} type="button">Back to projects</button>
        <div className="panel loading-panel">Loading project...</div>
      </main>
    );
  }

  if (error && !data) {
    return (
      <main className="app-page">
        <SiteBanner />
        <button className="ghost-button" onClick={onBack} type="button">Back to projects</button>
        <div className="error-box">{error}</div>
      </main>
    );
  }

  const { project, members, dependencies, checklist, blueprints, audit } = data;

  return (
    <main className="app-page project-view">
      <SiteBanner />
      <header className="project-header panel">
        <button className="ghost-button" onClick={onBack} type="button">Back to projects</button>
        <div className="project-title-block">
          <div className="project-title-row">
            <h1>{project.name}</h1>
            <span className={`role-pill role-${project.role}`}>{titleCase(project.role)}</span>
            {project.project_status === 'completed' && <span className="status-pill status-completed">Completed</span>}
          </div>
          <p>{project.location || 'No location set'} · {formatDate(project.start_date)} to {formatDate(project.end_date)}</p>
          {project.description && <p className="project-description">{project.description}</p>}
        </div>
        <button className="ghost-button" onClick={() => loadProject({ quiet: true })} type="button">Refresh</button>
      </header>

      {toast && <div className="toast">{toast}</div>}
      {error && <div className="error-box">{error}</div>}

      <GanttChart project={project} tasks={orderedTasks} dependencies={dependencies} onEditTask={setEditingTask} />
      <GanttChecklist checklist={checklist || []} canEdit={canEdit} onToggle={updateChecklistItem} />

      <section className="project-workspace">
        <div className="workspace-main">
          <TaskForm
            project={project}
            members={members}
            tasks={orderedTasks}
            editingTask={editingTask}
            canEdit={canEdit}
            onSave={saveTask}
            onCancel={() => setEditingTask(null)}
          />
          <TaskTable tasks={orderedTasks} canEdit={canEdit} onEdit={setEditingTask} onDelete={deleteTask} />
        </div>

        <aside className="workspace-side">
          <DependencyPanel
            tasks={orderedTasks}
            dependencies={dependencies}
            canEdit={canEdit}
            onAddDependency={addDependency}
            onDeleteDependency={deleteDependency}
          />
          <BlueprintsPanel
            blueprints={blueprints || []}
            canEdit={canEdit}
            onUpload={uploadBlueprint}
            onDelete={deleteBlueprint}
          />
          <MembersPanel
            currentUser={user}
            projectRole={project.role}
            members={members}
            canManage={canManage}
            onAddMember={addMember}
            onUpdateMember={updateMember}
            onRemoveMember={removeMember}
          />
          <ActivityPanel audit={audit} />
        </aside>
      </section>
    </main>
  );
}
