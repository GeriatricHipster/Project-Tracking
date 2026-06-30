import { useEffect, useMemo, useState } from "react";

function formatNoteDate(value) {
  if (!value) return 'Unknown date';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));
}

export default function ProjectNotesPanel({ project, entries = [], canEdit, onCreateEntry, onUpdateEntry, onDeleteEntry }) {
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingDraft, setEditingDraft] = useState('');

  const orderedEntries = useMemo(() => [...entries].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)) || (b.id - a.id)), [entries]);

  useEffect(() => {
    setDraft('');
    setError('');
    setNotice('');
    setEditingId(null);
    setEditingDraft('');
  }, [project?.id]);

  async function submit(event) {
    event.preventDefault();
    setError('');
    setNotice('');
    setSaving(true);
    try {
      await onCreateEntry(draft);
      setDraft('');
      setNotice('Note saved.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function submitEdit(event, noteId) {
    event.preventDefault();
    setError('');
    setNotice('');
    setSaving(true);
    try {
      await onUpdateEntry(noteId, editingDraft);
      setEditingId(null);
      setEditingDraft('');
      setNotice('Note updated.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteEntry(noteId) {
    const confirmed = window.confirm('Delete this note entry?');
    if (!confirmed) return;
    setError('');
    setNotice('');
    setSaving(true);
    try {
      await onDeleteEntry(noteId);
      if (editingId === noteId) {
        setEditingId(null);
        setEditingDraft('');
      }
      setNotice('Note deleted.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="panel project-notes-panel">
      <div className="panel-heading">
        <div>
          <h2>Project notes</h2>
          <p>{canEdit ? 'Add dated note entries here. Viewers can edit this section only.' : 'Notes are read-only unless you are assigned to this project.'}</p>
        </div>
      </div>

      {canEdit && (
        <form className="stack project-notes-form" onSubmit={submit}>
          <label>
            Add a dated note
            <textarea
              className="project-notes-textarea"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Add a new note entry with the date automatically saved."
            />
          </label>
          {error && <p className="error-box">{error}</p>}
          {notice && <p className="notice-box">{notice}</p>}
          <button className="primary-button compact notes-save-button" disabled={saving || !draft.trim()} type="submit">
            {saving ? 'Saving...' : 'Add note'}
          </button>
        </form>
      )}

      <div className="project-notes-list">
        {orderedEntries.map((entry) => {
          const isEditing = editingId === entry.id;
          return (
            <article className="project-note-entry" key={entry.id}>
              <div className="project-note-entry-header">
                <div>
                  <strong>{entry.created_by_name || 'System'}</strong>
                  <span>{formatNoteDate(entry.created_at)}</span>
                </div>
                {canEdit && (
                  <div className="row-actions">
                    <button className="ghost-button compact" onClick={() => { setEditingId(isEditing ? null : entry.id); setEditingDraft(entry.body); }} type="button">
                      {isEditing ? 'Close' : 'Edit'}
                    </button>
                    <button className="danger-button compact" disabled={saving} onClick={() => deleteEntry(entry.id)} type="button">
                      Delete
                    </button>
                  </div>
                )}
              </div>

              {isEditing ? (
                <form className="stack project-note-edit-form" onSubmit={(event) => submitEdit(event, entry.id)}>
                  <textarea value={editingDraft} onChange={(event) => setEditingDraft(event.target.value)} />
                  <div className="row-actions">
                    <button className="primary-button compact" disabled={saving || !editingDraft.trim()} type="submit">
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                    <button className="ghost-button compact" onClick={() => { setEditingId(null); setEditingDraft(''); }} type="button">
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
        {!orderedEntries.length && <p className="muted">No project notes yet.</p>}
      </div>
    </section>
  );
}
