import { useEffect, useMemo, useState } from 'react';

function formatNoteDate(value) {
  if (!value) return 'Unknown date';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown date';

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
}

export default function ProjectNotesPanel({
  project,
  entries = [],
  canEdit,
  onCreateEntry,
  onUpdateEntry,
  onDeleteEntry
}) {
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingDraft, setEditingDraft] = useState('');

  const orderedEntries = useMemo(() => {
    return [...entries].sort((a, b) => {
      const createdCompare = String(b.created_at || '').localeCompare(String(a.created_at || ''));
      if (createdCompare) return createdCompare;
      return Number(b.id || 0) - Number(a.id || 0);
    });
  }, [entries]);

  useEffect(() => {
    setDraft('');
    setError('');
    setNotice('');
    setEditingId(null);
    setEditingDraft('');
  }, [project?.id]);

  async function submit(event) {
    event.preventDefault();

    const body = draft.trim();
    if (!body || !canEdit) return;

    setError('');
    setNotice('');
    setSaving(true);

    try {
      await onCreateEntry(body);
      setDraft('');
      setNotice('Project update note saved.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function submitEdit(event, noteId) {
    event.preventDefault();

    const body = editingDraft.trim();
    if (!body || !canEdit) return;

    setError('');
    setNotice('');
    setSaving(true);

    try {
      await onUpdateEntry(noteId, body);
      setEditingId(null);
      setEditingDraft('');
      setNotice('Project update note updated.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteEntry(noteId) {
    const confirmed = window.confirm('Delete this project update note?');
    if (!confirmed || !canEdit) return;

    setError('');
    setNotice('');
    setSaving(true);

    try {
      await onDeleteEntry(noteId);

      if (editingId === noteId) {
        setEditingId(null);
        setEditingDraft('');
      }

      setNotice('Project update note deleted.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="panel project-notes-panel project-update-notes-panel">
      <div className="panel-heading">
        <div>
          <h2>Project Update Notes</h2>
          <p>
            {canEdit
              ? 'Add project updates here. Each entry keeps its own date and time stamp.'
              : 'Project update notes are read-only unless you are assigned to this project.'}
          </p>
        </div>
      </div>

      {canEdit && (
        <form className="project-notes-form" onSubmit={submit}>
          <label>
            <span>Add a project update</span>
            <textarea
              className="project-notes-textarea"
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Type a project update. The date and time will be saved automatically."
              value={draft}
            />
          </label>

          {error && <p className="error-box">{error}</p>}
          {notice && <p className="notice-box">{notice}</p>}

          <button className="primary-button compact notes-save-button" disabled={saving || !draft.trim()} type="submit">
            {saving ? 'Saving...' : 'Add update note'}
          </button>
        </form>
      )}

      {!canEdit && error && <p className="error-box">{error}</p>}
      {!canEdit && notice && <p className="notice-box">{notice}</p>}

      <div className="project-notes-list">
        {orderedEntries.map((entry) => {
          const isEditing = editingId === entry.id;

          return (
            <article className="project-note-entry project-update-note-entry" key={entry.id}>
              <div className="project-note-entry-header">
                <div>
                  <strong>{entry.created_by_name || 'System'}</strong>
                  <span>{formatNoteDate(entry.created_at)}</span>
                </div>

                {canEdit && (
                  <div className="row-actions">
                    <button
                      className="ghost-button compact"
                      onClick={() => {
                        setEditingId(isEditing ? null : entry.id);
                        setEditingDraft(isEditing ? '' : entry.body);
                      }}
                      type="button"
                    >
                      {isEditing ? 'Close' : 'Edit'}
                    </button>

                    <button
                      className="danger-button compact"
                      disabled={saving}
                      onClick={() => deleteEntry(entry.id)}
                      type="button"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>

              {isEditing ? (
                <form className="stack project-note-edit-form" onSubmit={(event) => submitEdit(event, entry.id)}>
                  <textarea
                    className="project-notes-textarea"
                    onChange={(event) => setEditingDraft(event.target.value)}
                    value={editingDraft}
                  />

                  <div className="row-actions">
                    <button className="primary-button compact" disabled={saving || !editingDraft.trim()} type="submit">
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      className="ghost-button compact"
                      onClick={() => {
                        setEditingId(null);
                        setEditingDraft('');
                      }}
                      type="button"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <p className="project-note-body">{entry.body}</p>
              )}
            </article>
          );
        })}

        {!orderedEntries.length && <p className="muted">No project update notes yet.</p>}
      </div>
    </section>
  );
}
