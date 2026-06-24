import { useEffect, useMemo, useState } from 'react';
import { addDays, formatDate, todayIso } from '../lib/dates';
import { buildingOptions } from '../lib/buildings';
import SiteMembersPanel from './SiteMembersPanel';
import OwnerCmsWosPanel from './OwnerCmsWosPanel';
import MarkupCalculatorPanel from './MarkupCalculatorPanel';
import SiteBanner from './SiteBanner';

const dashboardTabs = [
  { id: 'projects', label: 'Active projects' },
  { id: 'completed', label: 'Completed' },
  { id: 'assignments', label: 'Projects' },
  { id: 'calendar', label: 'Calendar overview' },
  { id: 'site-members', label: 'Site members', managersOnly: true },
  { id: 'owner-cms', label: 'CMS WOs', ownersOnly: true },
  { id: 'markup-calculator', label: 'Mark up calculator', ownersOnly: true }
];

const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const managerRoles = new Set(['owner', 'manager']);

function titleCase(value) {
  return String(value || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getLifecycleStatus(project) {
  return project?.project_status || project?.lifecycle_status || 'active';
}

function getScheduleStatus(project) {
  if (project?.schedule_status) return project.schedule_status;
  if (project?.status && project.status !== 'completed') return project.status;
  if (Number(project?.blocked_task_count || 0) > 0) return 'blocked';
  if (Number(project?.task_count || 0) === 0) return 'not_started';
  if (Number(project?.complete_task_count || 0) === Number(project?.task_count || 0)) return 'complete';
  if (Number(project?.in_progress_task_count || 0) > 0 || Number(project?.average_progress || 0) > 0) return 'in_progress';
  return 'not_started';
}

function getProjectStatus(project) {
  return getLifecycleStatus(project) === 'completed' ? 'completed' : getScheduleStatus(project);
}

function monthParts(monthValue) {
  const [year, month] = String(monthValue).split('-').map(Number);
  return { year, month };
}

function isoDate(year, month, day) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function daysInMonth(monthValue) {
  const { year, month } = monthParts(monthValue);
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function firstDayOfMonth(monthValue) {
  const { year, month } = monthParts(monthValue);
  return new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
}

function monthName(monthValue) {
  const { year, month } = monthParts(monthValue);
  return new Intl.DateTimeFormat(undefined, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

function monthEndIso(monthValue) {
  const { year, month } = monthParts(monthValue);
  return isoDate(year, month, daysInMonth(monthValue));
}

function projectOverlapsRange(project, rangeStart, rangeEnd) {
  return project.start_date <= rangeEnd && project.end_date >= rangeStart;
}

function projectIsActiveOnDate(project, dayIso) {
  return project.start_date <= dayIso && project.end_date >= dayIso;
}

function getProjectSearchText(project) {
  const memberText = Array.isArray(project.members)
    ? project.members.flatMap((member) => [member.name, member.email, member.role]).join(' ')
    : '';
  const projectPm = project.pm_summary || '';
  return [project.name, project.location, project.description, projectPm, memberText].join(' ').toLowerCase();
}

function matchesProjectSearch(project, term) {
  const query = String(term || '').trim().toLowerCase();
  if (!query) return true;
  return getProjectSearchText(project).includes(query);
}

function buildUserAssignments(projects) {
  const users = new Map();

  projects.forEach((project) => {
    const members = Array.isArray(project.members) ? project.members : [];
    members.forEach((member) => {
      const key = member.user_id || member.email;
      if (!users.has(key)) {
        users.set(key, {
          ...member,
          projects: []
        });
      }

      users.get(key).projects.push({
        id: project.id,
        name: project.name,
        location: project.location,
        role: member.role,
        status: getProjectStatus(project),
        project_status: getLifecycleStatus(project),
        start_date: project.start_date,
        end_date: project.end_date,
        average_progress: project.average_progress
      });
    });
  });

  return Array.from(users.values()).sort((a, b) => String(a.name).localeCompare(String(b.name)));
}

export default function Dashboard({
  user,
  projects,
  loading,
  onOpenProject,
  onCreateProject,
  onUpdateProject,
  onDeleteProject,
  onRefresh,
  onLogout
}) {
  const start = todayIso();
  const [activeTab, setActiveTab] = useState('projects');
  const [calendarMonth, setCalendarMonth] = useState(start.slice(0, 7));
  const [searchTerm, setSearchTerm] = useState('');
  const [form, setForm] = useState({
    name: '',
    location: '',
    description: '',
    start_date: start,
    end_date: addDays(start, 90)
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [actionProjectId, setActionProjectId] = useState(null);

  const canManageSite = Boolean(user?.can_manage_site || ['owner', 'manager'].includes(user?.site_role));
  const canAccessOwnerCms = user?.site_role === 'owner' && !user?.access_revoked;
  const visibleTabs = useMemo(
    () => dashboardTabs.filter((tab) => (!tab.managersOnly || canManageSite) && (!tab.ownersOnly || canAccessOwnerCms)),
    [canManageSite, canAccessOwnerCms]
  );

  useEffect(() => {
    if (!visibleTabs.some((tab) => tab.id === activeTab)) {
      setActiveTab(visibleTabs[0]?.id || 'projects');
    }
  }, [activeTab, visibleTabs]);

  const visibleProjects = useMemo(
    () => projects.filter((project) => matchesProjectSearch(project, searchTerm)),
    [projects, searchTerm]
  );

  const activeProjects = useMemo(
    () => visibleProjects.filter((project) => getLifecycleStatus(project) !== 'completed'),
    [visibleProjects]
  );

  const completedProjects = useMemo(
    () => visibleProjects.filter((project) => getLifecycleStatus(project) === 'completed'),
    [visibleProjects]
  );

  const assignmentUsers = useMemo(() => buildUserAssignments(visibleProjects), [visibleProjects]);

  const statusSummary = useMemo(() => {
    return visibleProjects.reduce(
      (summary, project) => {
        const lifecycle = getLifecycleStatus(project);
        const status = getProjectStatus(project);
        summary.total += 1;
        if (lifecycle === 'completed') {
          summary.completed += 1;
        } else {
          summary.active += 1;
          summary[status] = (summary[status] || 0) + 1;
        }
        return summary;
      },
      { total: 0, active: 0, completed: 0, not_started: 0, in_progress: 0, blocked: 0, complete: 0 }
    );
  }, [visibleProjects]);

  const calendarProjects = useMemo(() => {
    const rangeStart = `${calendarMonth}-01`;
    const rangeEnd = monthEndIso(calendarMonth);
    return visibleProjects
      .filter((project) => projectOverlapsRange(project, rangeStart, rangeEnd))
      .sort((a, b) => {
        if (a.start_date !== b.start_date) return a.start_date.localeCompare(b.start_date);
        return String(a.name).localeCompare(String(b.name));
      });
  }, [visibleProjects, calendarMonth]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      await onCreateProject(form);
      setForm({ name: '', location: '', description: '', start_date: start, end_date: addDays(start, 90) });
      setActiveTab('projects');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function moveProject(project, nextStatus) {
    const label = nextStatus === 'completed' ? 'move this project to Completed' : 'move this project back to Active Projects';
    const confirmed = window.confirm(`Are you sure you want to ${label}?`);
    if (!confirmed) return;

    setError('');
    setActionProjectId(project.id);
    try {
      await onUpdateProject(project.id, { project_status: nextStatus });
      setActiveTab(nextStatus === 'completed' ? 'completed' : 'projects');
    } catch (err) {
      setError(err.message);
    } finally {
      setActionProjectId(null);
    }
  }

  async function deleteProject(project) {
    const confirmed = window.confirm(
      `Delete project "${project.name}"? This permanently removes the project, all tasks, dependencies, comments, and members.`
    );
    if (!confirmed) return;

    setError('');
    setActionProjectId(project.id);
    try {
      await onDeleteProject(project.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setActionProjectId(null);
    }
  }

  function renderProjectActions(project) {
    const lifecycle = getLifecycleStatus(project);
    const canManage = managerRoles.has(project.role);
    const canDelete = user?.site_role === 'owner' && !user?.access_revoked;
    const busy = actionProjectId === project.id;

    return (
      <div className="project-action-row">
        <button className="primary-button compact" onClick={() => onOpenProject(project.id)} type="button">Open project</button>
        {canManage && lifecycle !== 'completed' && (
          <button className="ghost-button compact" disabled={busy} onClick={() => moveProject(project, 'completed')} type="button">
            {busy ? 'Saving...' : 'Move to completed'}
          </button>
        )}
        {canManage && lifecycle === 'completed' && (
          <button className="ghost-button compact" disabled={busy} onClick={() => moveProject(project, 'active')} type="button">
            {busy ? 'Saving...' : 'Move back to active'}
          </button>
        )}
        {canDelete && (
          <button className="danger-button compact" disabled={busy} onClick={() => deleteProject(project)} type="button">
            {busy ? 'Deleting...' : 'Delete'}
          </button>
        )}
      </div>
    );
  }

  function renderProjectCards(projectList, emptyTitle, emptyMessage) {
    return (
      <div className="project-card-list">
        {projectList.map((project) => {
          const status = getProjectStatus(project);
          const lifecycle = getLifecycleStatus(project);
          const members = Array.isArray(project.members) ? project.members : [];
          return (
            <article className="project-card" key={project.id}>
              <div>
                <div className="project-card-title-row">
                  <h3>{project.name}</h3>
                  <span className={`role-pill role-${project.role}`}>{titleCase(project.role)}</span>
                  <span className={`status-pill status-${status}`}>{titleCase(status)}</span>
                  {lifecycle === 'completed' && <span className="archive-pill">Completed tab</span>}
                </div>
                <p className="muted">{project.location || 'No location set'}</p>
                <p>{project.description || 'No project description yet.'}</p>
                <div className="member-chip-row">
                  {members.slice(0, 5).map((member) => (
                    <span className="member-chip" key={`${project.id}-${member.user_id}`} title={member.email}>
                      {member.name} · {member.role}
                    </span>
                  ))}
                  {members.length > 5 && <span className="member-chip muted-chip">+{members.length - 5} more</span>}
                </div>
              </div>
              <div className="project-card-side">
                <div className="project-stats">
                  <span><strong>{project.task_count}</strong> tasks</span>
                  <span><strong>{project.average_progress}%</strong> avg complete</span>
                  <span><strong>{project.member_count || members.length}</strong> users</span>
                  {project.pm_summary && <span><strong>PM</strong> {project.pm_summary}</span>}
                  <span>{formatDate(project.start_date)} to {formatDate(project.end_date)}</span>
                </div>
                {renderProjectActions(project)}
              </div>
            </article>
          );
        })}
        {!loading && projectList.length === 0 && (
          <div className="empty-state">
            <h3>{emptyTitle}</h3>
            <p>{emptyMessage}</p>
          </div>
        )}
      </div>
    );
  }

  function renderProjectsTab() {
    return (
      <section className="page-grid">
        <aside className="panel create-panel">
          <h2>Create project</h2>
          <form className="stack" onSubmit={submit}>
            <label>
              Work Order #
              <input value={form.name} onChange={(event) => updateField('name', event.target.value)} placeholder="WO-12345" />
            </label>
            <label>
              Building
              <select value={form.location} onChange={(event) => updateField('location', event.target.value)}>
                <option value=""> </option>
                {buildingOptions.map((building) => (
                  <option key={building} value={building}>{building}</option>
                ))}
              </select>
            </label>
            <label>
              Description
              <textarea value={form.description} onChange={(event) => updateField('description', event.target.value)} placeholder="Scope, client, phase, or notes" />
            </label>
            <div className="two-col">
              <label>
                Start
                <input type="date" value={form.start_date} onChange={(event) => updateField('start_date', event.target.value)} />
              </label>
              <label>
                Finish
                <input type="date" value={form.end_date} onChange={(event) => updateField('end_date', event.target.value)} />
              </label>
            </div>
            {error && <p className="error-box">{error}</p>}
            <button className="primary-button" disabled={saving}>{saving ? 'Creating...' : 'Create project'}</button>
          </form>
        </aside>

        <section className="panel project-list-panel">
          <div className="panel-heading">
            <div>
              <h2>Active projects</h2>
              <p>{loading ? 'Loading projects...' : `${activeProjects.length} active project${activeProjects.length === 1 ? '' : 's'}`}</p>
            </div>
          </div>

          {renderProjectCards(
            activeProjects,
            'No active projects yet',
            'Create your first project, then add tasks and assign other users.'
          )}
        </section>
      </section>
    );
  }

  function renderCompletedTab() {
    return (
      <section className="dashboard-stack">
        <section className="panel project-list-panel">
          <div className="panel-heading">
            <div>
              <h2>Completed projects</h2>
              <p>{loading ? 'Loading completed projects...' : `${completedProjects.length} completed project${completedProjects.length === 1 ? '' : 's'}`}</p>
            </div>
          </div>
          {error && <p className="error-box dashboard-error">{error}</p>}
          {renderProjectCards(
            completedProjects,
            'No completed projects yet',
            'Use Move to completed on an active project when it is ready to file away.'
          )}
        </section>
      </section>
    );
  }

  function renderAssignmentsTab() {
    return (
      <section className="dashboard-stack">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Project assignments</h2>
              <p>See which users are assigned to each active or completed project you can access.</p>
            </div>
          </div>

          <div className="project-assignment-list">
            {visibleProjects.map((project) => {
              const members = Array.isArray(project.members) ? project.members : [];
              const status = getProjectStatus(project);
              return (
                <article className="project-assignment-card" key={project.id}>
                  <div>
                    <div className="project-card-title-row">
                      <h3>{project.name}</h3>
                      <span className={`status-pill status-${status}`}>{titleCase(status)}</span>
                    </div>
                    <p className="muted">{project.location || 'No location set'} · {formatDate(project.start_date)} to {formatDate(project.end_date)}</p>
                  </div>
                  <div className="member-chip-row large">
                    {members.map((member) => (
                      <span className="member-chip" key={`${project.id}-${member.user_id}`} title={member.email}>
                        <strong>{member.name}</strong>
                        <small>{member.role} · {member.email}</small>
                      </span>
                    ))}
                    {!members.length && <span className="muted">No members assigned yet.</span>}
                  </div>
                  <button className="ghost-button compact" onClick={() => onOpenProject(project.id)} type="button">Open</button>
                </article>
              );
            })}
            {!loading && visibleProjects.length === 0 && (
              <div className="empty-state">
                <h3>No assignments yet</h3>
                <p>Create a project first. Then open it and add team members.</p>
              </div>
            )}
          </div>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Users across projects</h2>
              <p>{assignmentUsers.length} user{assignmentUsers.length === 1 ? '' : 's'} assigned across your visible projects.</p>
            </div>
          </div>

          <div className="assignment-user-grid">
            {assignmentUsers.map((assignedUser) => (
              <article className="assignment-user-card" key={assignedUser.user_id || assignedUser.email}>
                <div>
                  <h3>{assignedUser.name}</h3>
                  <p className="muted">{assignedUser.email}</p>
                </div>
                <div className="assigned-project-list">
                  {assignedUser.projects.map((project) => (
                    <button className="assigned-project-chip" key={`${assignedUser.user_id}-${project.id}`} onClick={() => onOpenProject(project.id)} type="button">
                      <strong>{project.name}</strong>
                      <span>{titleCase(project.role)} · {titleCase(project.status)} · {project.average_progress}%</span>
                    </button>
                  ))}
                </div>
              </article>
            ))}
            {!loading && assignmentUsers.length === 0 && (
              <div className="empty-state">
                <h3>No users found</h3>
                <p>Create a project and add members to see user assignments here.</p>
              </div>
            )}
          </div>
        </section>
      </section>
    );
  }

  function renderCalendarDay(dayNumber, monthValue) {
    const { year, month } = monthParts(monthValue);
    const dayIso = isoDate(year, month, dayNumber);
    const dayProjects = calendarProjects.filter((project) => projectIsActiveOnDate(project, dayIso));
    const visibleProjects = dayProjects.slice(0, 3);

    return (
      <div className="calendar-day" key={dayIso}>
        <div className="calendar-date-number">{dayNumber}</div>
        <div className="calendar-events">
          {visibleProjects.map((project) => {
            const status = getProjectStatus(project);
            const dayLabel = project.start_date === dayIso ? 'Start' : project.end_date === dayIso ? 'Finish' : titleCase(status);
            return (
              <button className={`calendar-event status-${status}`} key={`${dayIso}-${project.id}`} onClick={() => onOpenProject(project.id)} type="button" title={`${project.name} · ${dayLabel}`}>
                <span>{project.name}</span>
                <small>{dayLabel}</small>
              </button>
            );
          })}
          {dayProjects.length > visibleProjects.length && (
            <span className="calendar-more">+{dayProjects.length - visibleProjects.length} more</span>
          )}
        </div>
      </div>
    );
  }


  function renderMarkupCalculatorTab() {
    return <MarkupCalculatorPanel />;
  }

  function renderCalendarTab() {
    const firstOffset = firstDayOfMonth(calendarMonth);
    const dayCount = daysInMonth(calendarMonth);
    const totalCells = Math.ceil((firstOffset + dayCount) / 7) * 7;
    const cells = Array.from({ length: totalCells }, (_, index) => index - firstOffset + 1);

    return (
      <section className="dashboard-stack">
        <section className="summary-strip">
          <article className="metric-card panel">
            <span>Total projects</span>
            <strong>{statusSummary.total}</strong>
          </article>
          <article className="metric-card panel">
            <span>Active projects</span>
            <strong>{statusSummary.active}</strong>
          </article>
          <article className="metric-card panel">
            <span>Blocked</span>
            <strong>{statusSummary.blocked}</strong>
          </article>
          <article className="metric-card panel">
            <span>Completed</span>
            <strong>{statusSummary.completed}</strong>
          </article>
        </section>

        <section className="panel calendar-panel">
          <div className="calendar-toolbar">
            <div>
              <h2>{monthName(calendarMonth)}</h2>
              <p>{calendarProjects.length} project{calendarProjects.length === 1 ? '' : 's'} scheduled this month.</p>
            </div>
            <label>
              Month
              <input type="month" value={calendarMonth} onChange={(event) => setCalendarMonth(event.target.value)} />
            </label>
          </div>

          <div className="calendar-grid">
            {weekdays.map((weekday) => (
              <div className="calendar-weekday" key={weekday}>{weekday}</div>
            ))}
            {cells.map((dayNumber, index) => {
              if (dayNumber < 1 || dayNumber > dayCount) {
                return <div className="calendar-day outside" key={`outside-${index}`} />;
              }
              return renderCalendarDay(dayNumber, calendarMonth);
            })}
          </div>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Monthly project status list</h2>
              <p>Projects that overlap the selected month, including completed projects.</p>
            </div>
          </div>
          <div className="calendar-project-list">
            {calendarProjects.map((project) => {
              const status = getProjectStatus(project);
              return (
                <article className="calendar-project-card" key={project.id}>
                  <div>
                    <div className="project-card-title-row">
                      <h3>{project.name}</h3>
                      <span className={`status-pill status-${status}`}>{titleCase(status)}</span>
                    </div>
                    <p className="muted">{formatDate(project.start_date)} to {formatDate(project.end_date)} · {project.average_progress}% average complete</p>
                  </div>
                  <button className="ghost-button compact" onClick={() => onOpenProject(project.id)} type="button">Open</button>
                </article>
              );
            })}
            {!loading && calendarProjects.length === 0 && (
              <div className="empty-state">
                <h3>No projects scheduled this month</h3>
                <p>Change the month or create a project with dates in this period.</p>
              </div>
            )}
          </div>
        </section>
      </section>
    );
  }

  return (
    <main className="app-page">
      <SiteBanner />
      <header className="topbar">
        <div className="brand-lockup small">
          <span className="brand-mark">PSG</span>
          <div>
            <strong>PSG and SS Tracking</strong>
            <span>{user?.name} · {titleCase(user?.site_role || 'member')}</span>
          </div>
        </div>
        <div className="topbar-actions">
          <button className="ghost-button" onClick={onRefresh} type="button">Refresh</button>
          <button className="ghost-button" onClick={onLogout} type="button">Logout</button>
        </div>
      </header>

      <section className="panel dashboard-search-panel">
        <label className="dashboard-search-label">
          Search projects
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by Work Order #, Building, PM, or member"
          />
        </label>
        <button className="ghost-button compact" onClick={() => setSearchTerm('')} disabled={!searchTerm} type="button">
          Clear
        </button>
      </section>

      <nav className="dashboard-tabs" aria-label="Dashboard tabs">
        {visibleTabs.map((tab) => (
          <button
            className={activeTab === tab.id ? 'active' : ''}
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {activeTab !== 'projects' && activeTab !== 'completed' && error && <p className="error-box dashboard-error">{error}</p>}
      {activeTab === 'projects' && renderProjectsTab()}
      {activeTab === 'completed' && renderCompletedTab()}
      {activeTab === 'assignments' && renderAssignmentsTab()}
      {activeTab === 'calendar' && renderCalendarTab()}
      {activeTab === 'site-members' && canManageSite && <SiteMembersPanel currentUser={user} onOpenProject={onOpenProject} />}
      {activeTab === 'owner-cms' && canAccessOwnerCms && <OwnerCmsWosPanel user={user} />}
      {activeTab === 'markup-calculator' && canAccessOwnerCms && <MarkupCalculatorPanel />}
    </main>
  );
}
