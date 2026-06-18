import { useRef, useState } from 'react';
import { downloadFile } from '../lib/api';

function formatBytes(value) {
  const bytes = Number(value || 0);
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDateTime(value) {
  if (!value) return 'Unknown date';
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(value));
  } catch (error) {
    return String(value);
  }
}

export default function BlueprintPanel({ blueprints = [], canUpload = false, canDelete = false, onUploadBlueprints, onDeleteBlueprint }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  async function uploadFiles(fileList) {
    const files = Array.from(fileList || []).filter(Boolean);
    if (!files.length) return;
    setError('');
    setUploading(true);
    try {
      await onUploadBlueprints?.(files);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  function handleDrop(event) {
    event.preventDefault();
    setDragOver(false);
    if (!canUpload) return;
    uploadFiles(event.dataTransfer.files);
  }

  async function downloadBlueprint(blueprint) {
    setError('');
    try {
      await downloadFile(`/blueprints/${blueprint.id}/download`, blueprint.file_name);
    } catch (err) {
      setError(err.message);
    }
  }

  async function deleteBlueprint(blueprint) {
    const confirmed = window.confirm(`Delete blueprint "${blueprint.file_name}"?`);
    if (!confirmed) return;
    setError('');
    try {
      await onDeleteBlueprint?.(blueprint);
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
        className={`drop-zone ${dragOver ? 'drag-over' : ''} ${!canUpload ? 'disabled' : ''}`}
        onDragEnter={(event) => { event.preventDefault(); setDragOver(true); }}
        onDragLeave={(event) => { event.preventDefault(); setDragOver(false); }}
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
        role="button"
        tabIndex={canUpload ? 0 : -1}
        onClick={() => canUpload && inputRef.current?.click()}
        onKeyDown={(event) => {
          if (canUpload && (event.key === 'Enter' || event.key === ' ')) inputRef.current?.click();
        }}
      >
        <strong>{uploading ? 'Uploading...' : 'Drag and drop blueprints here'}</strong>
        <span>PDF, image, DWG, or DXF files up to the configured upload limit.</span>
        <button className="ghost-button compact" disabled={!canUpload || uploading} type="button">Choose files</button>
        <input
          accept=".pdf,.png,.jpg,.jpeg,.webp,.dwg,.dxf"
          hidden
          multiple
          onChange={(event) => uploadFiles(event.target.files)}
          ref={inputRef}
          type="file"
        />
      </div>
      {!canUpload && <p className="form-help">Blueprint upload is read-only for viewer access.</p>}
      {error && <p className="error-box">{error}</p>}

      <div className="blueprint-list">
        {blueprints.map((blueprint) => (
          <article className="blueprint-item" key={blueprint.id}>
            <div>
              <strong>{blueprint.file_name}</strong>
              <span>{formatBytes(blueprint.file_size)} · Uploaded by {blueprint.uploaded_by_name || 'Unknown'} · {formatDateTime(blueprint.created_at)}</span>
            </div>
            <div className="blueprint-actions">
              <button className="ghost-button compact" onClick={() => downloadBlueprint(blueprint)} type="button">Download</button>
              {canDelete && <button className="danger-button compact" onClick={() => deleteBlueprint(blueprint)} type="button">Delete</button>}
            </div>
          </article>
        ))}
        {blueprints.length === 0 && <p className="muted">No blueprints uploaded yet.</p>}
      </div>
    </section>
  );
}
