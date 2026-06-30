import { useRef, useState } from 'react';
import { downloadFromApi } from '../lib/api';

function formatBytes(bytes) {
  const number = Number(bytes || 0);
  if (number < 1024) return `${number} B`;
  if (number < 1024 * 1024) return `${(number / 1024).toFixed(1)} KB`;
  return `${(number / (1024 * 1024)).toFixed(1)} MB`;
}

const acceptedBlueprintTypes = [
  '.pdf', '.png', '.jpg', '.jpeg', '.webp', '.dwg', '.doc', '.docx', '.xls', '.xlsx',
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/vnd.dwg',
  'application/acad',
  'application/x-acad',
  'application/dwg',
  'application/x-dwg',
  'application/octet-stream',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
].join(',');

export default function BlueprintsPanel({ blueprints, canEdit, onUpload, onDelete }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function uploadFiles(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length || !canEdit) return;
    setSaving(true);
    setError('');
    try {
      for (const file of files) {
        await onUpload(file);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function downloadBlueprint(blueprint) {
    setError('');
    try {
      await downloadFromApi(`/blueprints/${blueprint.id}/download`, blueprint.original_name);
    } catch (err) {
      setError(err.message);
    }
  }

  async function deleteBlueprint(blueprint) {
    const confirmed = window.confirm(`Delete blueprint "${blueprint.original_name}"?`);
    if (!confirmed) return;
    setError('');
    try {
      await onDelete(blueprint);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section className="panel side-panel blueprint-panel">
      <div className="panel-heading compact-heading">
        <div>
          <h2>Blueprints</h2>
          <p>{blueprints.length} file{blueprints.length === 1 ? '' : 's'} attached</p>
        </div>
      </div>

      <div
        className={`drop-zone ${dragging ? 'dragging' : ''} ${!canEdit ? 'disabled' : ''}`}
        onClick={() => canEdit && inputRef.current?.click()}
        onDragEnter={(event) => { event.preventDefault(); if (canEdit) setDragging(true); }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => { event.preventDefault(); setDragging(false); }}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          uploadFiles(event.dataTransfer.files);
        }}
        role="button"
        tabIndex={canEdit ? 0 : -1}
      >
        <strong>{saving ? 'Uploading...' : 'Drag and drop blueprints here'}</strong>
        <span>{canEdit ? 'PDF, image, DWG, Word, or Excel files' : 'You need edit access to upload files.'}</span>
        <input
          hidden
          multiple
          accept={acceptedBlueprintTypes}
          onChange={(event) => uploadFiles(event.target.files)}
          ref={inputRef}
          type="file"
        />
      </div>

      {error && <p className="error-box">{error}</p>}

      <div className="blueprint-list">
        {blueprints.map((blueprint) => (
          <article className="blueprint-item" key={blueprint.id}>
            <div>
              <strong>{blueprint.original_name}</strong>
              <span>{formatBytes(blueprint.size_bytes)} · uploaded by {blueprint.uploaded_by_name || 'Unknown'}</span>
            </div>
            <div className="row-actions">
              <button className="ghost-button compact" onClick={() => downloadBlueprint(blueprint)} type="button">Download</button>
              {canEdit && <button className="danger-button compact" onClick={() => deleteBlueprint(blueprint)} type="button">Delete</button>}
            </div>
          </article>
        ))}
        {!blueprints.length && <p className="muted">No blueprints have been uploaded yet.</p>}
      </div>
    </section>
  );
}
