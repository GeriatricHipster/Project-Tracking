import { useEffect, useState } from 'react';

export default function ProjectNotesPanel({ project, canEdit, onSave }) {
  const [notes, setNotes] = useState(project?.notes || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    setNotes(project?.notes || '');
    setError('');
    setNotice('');
  }, [project?.id, project?.notes]);

  async function submit(event) {
    event.preventDefault();
    setError('');
    setNotice('');
    setSaving(true);
    try {
      await onSave(notes);
      setNotice('Project notes saved.');
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
          <p>{canEdit ? 'All assigned project roles can update this field. Viewers can edit this section only.' : 'Notes are read-only unless you are assigned to this project.'}</p>
        </div>
      </div>
      <form className="stack" onSubmit={submit}>
        <label>
          Notes
          <textarea
            className="project-notes-textarea"
            disabled={!canEdit}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Add project notes, customer updates, blockers, site access details, or coordination items."
          />
        </label>
        {error && <p className="error-box">{error}</p>}
        {notice && <p className="notice-box">{notice}</p>}
        <button className="primary-button compact notes-save-button" disabled={!canEdit || saving} type="submit">
          {saving ? 'Saving notes...' : 'Save notes'}
        </button>
      </form>
    </section>
  );
}
