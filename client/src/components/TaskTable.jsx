import { formatDate } from '../lib/dates';

const statusLabel = {
  not_started: 'Not started',
  in_progress: 'In progress',
  blocked: 'Blocked',
  complete: 'Complete'
};

export default function TaskTable({ tasks, canEdit, onEdit, onDelete }) {
  return (
    <section className="panel table-panel">
      <div className="panel-heading">
        <div>
          <h2>Schedule tasks</h2>
          <p>{tasks.length} task{tasks.length === 1 ? '' : 's'} in this project</p>
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
            {tasks.map((task) => (
              <tr key={task.id}>
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
                      {[task.assignee_secondary, task.assignee_tertiary].filter(Boolean).length
                        ? [task.assignee_secondary, task.assignee_tertiary].filter(Boolean).join(' · ')
                        : 'No extra assignees'}
                    </span>
                  </div>
                </td>
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
                    <button className="ghost-button compact" onClick={() => onEdit(task)} type="button">{canEdit ? 'Edit' : 'View'}</button>
                    {canEdit && <button className="danger-button compact" onClick={() => onDelete(task)} type="button">Delete</button>}
                  </div>
                </td>
              </tr>
            ))}
            {tasks.length === 0 && (
              <tr>
                <td colSpan="11">
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
    </section>
  );
}
