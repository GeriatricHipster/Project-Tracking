import { useEffect, useState } from 'react';

import { formatDate } from '../lib/dates';

const statusLabel = {
  not_started: 'Not started',
  in_progress: 'In progress',
  blocked: 'Blocked',
  complete: 'Complete'
};

function getExtraAssignees(task) {
  return [task.assignee_secondary, task.assignee_tertiary, task.assignee_quaternary].filter(Boolean);
}

function clampMenuPosition(event) {
  const menuWidth = 210;
  const menuHeight = 130;
  const padding = 10;

  let left = event.clientX;
  let top = event.clientY;

  if (typeof window !== 'undefined') {
    left = Math.min(left, window.innerWidth - menuWidth - padding);
    top = Math.min(top, window.innerHeight - menuHeight - padding);
  }

  return {
    left: Math.max(padding, left),
    top: Math.max(padding, top)
  };
}

export default function TaskTable({ tasks = [], canEdit, onEdit, onDelete }) {
  const [contextMenu, setContextMenu] = useState(null);

  useEffect(() => {
    function closeMenu() {
      setContextMenu(null);
    }

    function closeOnEscape(event) {
      if (event.key === 'Escape') setContextMenu(null);
    }

    window.addEventListener('click', closeMenu);
    window.addEventListener('scroll', closeMenu, true);
    window.addEventListener('keydown', closeOnEscape);

    return () => {
      window.removeEventListener('click', closeMenu);
      window.removeEventListener('scroll', closeMenu, true);
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  function openContextMenu(event, task) {
    event.preventDefault();
    event.stopPropagation();

    const position = clampMenuPosition(event);
    setContextMenu({ task, ...position });
  }

  function editTask(task) {
    setContextMenu(null);
    onEdit(task);
  }

  function deleteTask(task) {
    setContextMenu(null);
    if (canEdit) onDelete(task);
  }

  return (
    <section className="panel table-panel task-table-panel">
      <div className="panel-heading">
        <div>
          <h2>Schedule tasks</h2>
          <p>
            {tasks.length} task{tasks.length === 1 ? '' : 's'} in this project. Right-click a task row for Edit/Delete.
          </p>
        </div>
      </div>

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Task</th>
              <th>Trade</th>
              <th>Vendor</th>
              <th>More</th>
              <th>Security team</th>
              <th>PM</th>
              <th>Assignee</th>
              <th>Status</th>
              <th>Dates</th>
              <th>Progress</th>
              <th>Priority</th>
              <th aria-label="Actions" />
            </tr>
          </thead>

          <tbody>
            {tasks.map((task) => {
              const extraAssignees = getExtraAssignees(task);

              return (
                <tr className="task-row-context" key={task.id} onContextMenu={(event) => openContextMenu(event, task)}>
                  <td>
                    <strong>{task.name}</strong>
                    {task.description && <span className="table-subtext">{task.description}</span>}
                  </td>

                  <td>{task.trade || '-'}</td>
                  <td>{task.vendor || '-'}</td>

                  <td>
                    <div className="stack gap-tight">
                      <span>{task.vendor_secondary || '-'}</span>
                      <span className="table-subtext">
                        {extraAssignees.length ? extraAssignees.join(' · ') : 'No extra assignees'}
                      </span>
                    </div>
                  </td>

                  <td>{task.security_team_member || '-'}</td>
                  <td>{task.pm || '-'}</td>
                  <td>{task.assigned_to_name || '-'}</td>
                  <td><span className={`status-pill status-${task.status}`}>{statusLabel[task.status] || task.status}</span></td>
                  <td>{formatDate(task.start_date)} - {formatDate(task.end_date)}</td>

                  <td>
                    <div className="mini-progress"><span style={{ width: `${task.percent_complete}%` }} /></div>
                    <small>{task.percent_complete}%</small>
                  </td>

                  <td><span className={`priority-pill priority-${task.priority}`}>{task.priority}</span></td>

                  <td>
                    <div className="row-actions">
                      <button className="ghost-button compact" onClick={() => editTask(task)} type="button">{canEdit ? 'Edit' : 'View'}</button>
                      {canEdit && <button className="danger-button compact" onClick={() => deleteTask(task)} type="button">Delete</button>}
                    </div>
                  </td>
                </tr>
              );
            })}

            {tasks.length === 0 && (
              <tr>
                <td colSpan="12">
                  <div className="empty-state table-empty">
                    <h3>No tasks yet</h3>
                    <p>Add the first schedule item to start building the Gantt chart.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {contextMenu && (
        <div
          className="task-context-menu"
          onClick={(event) => event.stopPropagation()}
          role="menu"
          style={{ left: contextMenu.left, top: contextMenu.top }}
        >
          <div className="task-context-title">{contextMenu.task.name}</div>

          <button className="task-context-item" onClick={() => editTask(contextMenu.task)} role="menuitem" type="button">
            {canEdit ? 'Edit task' : 'View task'}
          </button>

          {canEdit && (
            <button className="task-context-item danger" onClick={() => deleteTask(contextMenu.task)} role="menuitem" type="button">
              Delete task
            </button>
          )}
        </div>
      )}
    </section>
  );
}
