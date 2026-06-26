import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../lib/api';
import {
  buildBlankOwnerCmsGrid,
  normalizeOwnerCmsGrid,
  ownerCmsColumnCount,
  ownerCmsColumns,
  ownerCmsRowCount
} from '../lib/ownerCmsWorkbook';

const SHEETS = [
  { sheet_key: 'kurts_cms_wos', sheet_name: 'Kurts CMS WOs' },
  { sheet_key: 'austins_cms_wos', sheet_name: 'Austins CMS WOs' }
];

function titleize(value) {
  return String(value || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function matchesFilter(column, cellValue, filterValue) {
  const filter = String(filterValue || '').trim();
  if (!filter) return true;
  const value = String(cellValue || '').trim();
  if (column.type === 'select') {
    if (filter === '__unassigned__') return !value;
    return value === filter;
  }
  return value.toLowerCase().includes(filter.toLowerCase());
}

const SpreadsheetCell = memo(function SpreadsheetCell({ sheetKey, rowIndex, column, value, onCellChange, onCellCommit, disabled }) {
  const commonProps = {
    'aria-label': `${column.label} row ${rowIndex + 1}`,
    disabled,
    value: value ?? ''
  };

  if (column.type === 'select') {
    return (
      <td className="cms-grid-cell" style={{ minWidth: column.width, width: column.width }}>
        <select
          className="cms-grid-editor"
          {...commonProps}
          onChange={(event) => {
            const nextValue = event.target.value;
            onCellChange(sheetKey, rowIndex, column.index, nextValue);
            onCellCommit(sheetKey, rowIndex, column.index, nextValue);
          }}
        >
          <option value="">Unassigned</option>
          {column.options.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </td>
    );
  }

  if (column.type === 'date') {
    return (
      <td className="cms-grid-cell" style={{ minWidth: column.width, width: column.width }}>
        <input
          className="cms-grid-editor"
          type="date"
          {...commonProps}
          onChange={(event) => {
            const nextValue = event.target.value;
            onCellChange(sheetKey, rowIndex, column.index, nextValue);
            onCellCommit(sheetKey, rowIndex, column.index, nextValue);
          }}
        />
      </td>
    );
  }

  if (column.type === 'textarea') {
    return (
      <td className="cms-grid-cell" style={{ minWidth: column.width, width: column.width }}>
        <textarea
          className="cms-grid-editor cms-grid-textarea"
          rows={2}
          placeholder={column.placeholder || ''}
          {...commonProps}
          onChange={(event) => onCellChange(sheetKey, rowIndex, column.index, event.target.value)}
          onBlur={(event) => onCellCommit(sheetKey, rowIndex, column.index, event.currentTarget.value)}
        />
      </td>
    );
  }

  return (
    <td className="cms-grid-cell" style={{ minWidth: column.width, width: column.width }}>
      <input
        className="cms-grid-editor"
        placeholder={column.placeholder || ''}
        {...commonProps}
        onBlur={(event) => onCellCommit(sheetKey, rowIndex, column.index, event.currentTarget.value)}
        onChange={(event) => onCellChange(sheetKey, rowIndex, column.index, event.target.value)}
        spellCheck={false}
      />
    </td>
  );
});

function SheetGrid({ sheet, viewMode, filters, savingCell, onCellChange, onCellCommit, onInsertRow, onArchiveRow, onSetFilter }) {
  const rows = viewMode === 'archived' ? (sheet?.archived_rows || []) : (sheet?.cells || buildBlankOwnerCmsGrid());
  const filteredRows = rows
    .map((row, sourceIndex) => ({ row, sourceIndex }))
    .filter(({ row }) => ownerCmsColumns.every((column, index) => matchesFilter(column, row?.[index], filters[column.key])));
  const canEdit = viewMode === 'current';

  return (
    <div className="cms-grid-wrap">
      <table className="cms-grid-table">
        <thead>
          <tr>
            <th className="cms-grid-corner">#</th>
            {ownerCmsColumns.map((column) => (
              <th key={column.key} className="cms-grid-col-header" style={{ minWidth: column.width, width: column.width }}>
                {column.label}
              </th>
            ))}
            <th className="cms-grid-col-header cms-grid-actions-col">Actions</th>
          </tr>
          <tr className="cms-grid-filter-row">
            <th className="cms-grid-filter-header">Filter</th>
            {ownerCmsColumns.map((column) => (
              <th key={`${column.key}-filter`} className="cms-grid-filter-cell" style={{ minWidth: column.width, width: column.width }}>
                {column.type === 'select' ? (
                  <select value={filters[column.key] || ''} onChange={(event) => onSetFilter(column.key, event.target.value)}>
                    <option value="">All</option>
                    <option value="__unassigned__">Unassigned</option>
                    {column.options.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                ) : (
                  <input
                    value={filters[column.key] || ''}
                    onChange={(event) => onSetFilter(column.key, event.target.value)}
                    placeholder={`Search ${column.label}`}
                  />
                )}
              </th>
            ))}
            <th className="cms-grid-filter-cell cms-grid-actions-col">
              <button className="ghost-button compact" disabled={!canEdit} onClick={() => onInsertRow(0)} type="button">
                Insert top
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          {filteredRows.map(({ row, sourceIndex }) => (
            <tr key={sourceIndex}>
              <th className="cms-grid-row-header">{sourceIndex + 1}</th>
              {ownerCmsColumns.map((column, colIndex) => (
                <SpreadsheetCell
                  key={`${sourceIndex}-${column.key}`}
                  sheetKey={sheet.sheet_key}
                  rowIndex={sourceIndex}
                  column={{ ...column, index: colIndex }}
                  value={row[colIndex] ?? ''}
                  onCellChange={onCellChange}
                  onCellCommit={onCellCommit}
                  disabled={!canEdit || savingCell === `${sheet.sheet_key}-${sourceIndex}-${colIndex}`}
                />
              ))}
              <td className="cms-grid-actions-col">
                {canEdit ? (
                  <div className="cms-row-actions">
                    <button className="ghost-button compact" onClick={() => onInsertRow(sourceIndex + 1)} type="button">Insert below</button>
                    <button className="danger-button compact" onClick={() => onArchiveRow(sourceIndex)} type="button">Delete</button>
                  </div>
                ) : (
                  <span className="muted">Archived</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!filteredRows.length && <p className="muted cms-empty-note">No rows match the current filters.</p>}
    </div>
  );
}

export default function OwnerCmsWosPanel({ user }) {
  const [activeSheetKey, setActiveSheetKey] = useState(SHEETS[0].sheet_key);
  const [viewModeBySheet, setViewModeBySheet] = useState({ kurts_cms_wos: 'current', austins_cms_wos: 'current' });
  const [filtersBySheet, setFiltersBySheet] = useState({ kurts_cms_wos: {}, austins_cms_wos: {} });
  const [sheets, setSheets] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingCell, setSavingCell] = useState('');
  const [error, setError] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef(null);

  const canAccess = user?.site_role === 'owner' && !user?.access_revoked;

  const activeSheet = sheets[activeSheetKey] || {
    sheet_key: activeSheetKey,
    sheet_name: SHEETS.find((sheet) => sheet.sheet_key === activeSheetKey)?.sheet_name || titleize(activeSheetKey),
    cells: buildBlankOwnerCmsGrid(),
    archived_rows: []
  };

  const activeView = viewModeBySheet[activeSheetKey] || 'current';
  const activeFilters = filtersBySheet[activeSheetKey] || {};

  const refreshSheets = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api('/owner/cms-wos');
      const nextSheets = {};
      for (const sheet of data.sheets || []) {
        nextSheets[sheet.sheet_key] = {
          ...sheet,
          cells: normalizeOwnerCmsGrid(sheet.cells),
          archived_rows: Array.isArray(sheet.archived_rows) ? sheet.archived_rows : []
        };
      }
      setSheets(nextSheets);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!canAccess) return;
    refreshSheets();
  }, [canAccess, refreshSheets]);

  useEffect(() => {
    function onFullscreenChange() {
      setIsFullscreen(Boolean(document.fullscreenElement));
    }
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  const updateFilter = useCallback((sheetKey, columnKey, value) => {
    setFiltersBySheet((current) => ({
      ...current,
      [sheetKey]: {
        ...(current[sheetKey] || {}),
        [columnKey]: value
      }
    }));
  }, []);

  const updateCell = useCallback((sheetKey, rowIndex, colIndex, value) => {
    setSheets((current) => {
      const next = { ...current };
      const currentSheet = next[sheetKey] || {
        sheet_key: sheetKey,
        sheet_name: SHEETS.find((sheet) => sheet.sheet_key === sheetKey)?.sheet_name || titleize(sheetKey),
        cells: buildBlankOwnerCmsGrid(),
        archived_rows: []
      };
      const nextCells = normalizeOwnerCmsGrid(currentSheet.cells);
      nextCells[rowIndex][colIndex] = value;
      next[sheetKey] = { ...currentSheet, cells: nextCells };
      return next;
    });
  }, []);

  async function saveCell(sheetKey, rowIndex, colIndex, value) {
    const nextValue = String(value ?? '');
    setError('');
    setSavingCell(`${sheetKey}-${rowIndex}-${colIndex}`);
    try {
      await api(`/owner/cms-wos/${sheetKey}/cell`, {
        method: 'PATCH',
        body: {
          row_index: rowIndex,
          col_index: colIndex,
          value: nextValue
        }
      });
    } catch (err) {
      setError(err.message);
      await refreshSheets();
    } finally {
      setSavingCell('');
    }
  }

  async function insertRow(insertAt) {
    setError('');
    try {
      await api(`/owner/cms-wos/${activeSheetKey}/row`, {
        method: 'POST',
        body: { insert_at: insertAt }
      });
      await refreshSheets();
    } catch (err) {
      setError(err.message);
    }
  }

  async function archiveRow(rowIndex) {
    const confirmed = window.confirm('Delete this row? It will move to the archived rows tab.');
    if (!confirmed) return;
    setError('');
    try {
      await api(`/owner/cms-wos/${activeSheetKey}/row/${rowIndex + 1}`, { method: 'DELETE' });
      await refreshSheets();
    } catch (err) {
      setError(err.message);
    }
  }

  async function toggleFullscreen() {
    if (!containerRef.current) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await containerRef.current.requestFullscreen();
      }
    } catch {
      setIsFullscreen((current) => !current);
    }
  }

  if (!canAccess) {
    return (
      <section className="panel owner-cms-panel">
        <div className="panel-heading">
          <div>
            <h2>CMS WOs</h2>
            <p>This area is only visible to owners.</p>
          </div>
        </div>
        <div className="empty-state">
          <h3>Owner access only</h3>
          <p>You do not have permission to view this area.</p>
        </div>
      </section>
    );
  }

  return (
    <section className={`dashboard-stack owner-cms-panel${isFullscreen ? ' is-fullscreen' : ''}`} ref={containerRef}>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>CMS WOs</h2>
            <p>Owner-only work order spreadsheets. Use the dropdowns, date fields, and filters in the table below.</p>
          </div>
        </div>

        <div className="cms-sheet-tabs" role="tablist" aria-label="CMS work order sheets">
          {SHEETS.map((sheet) => (
            <button
              key={sheet.sheet_key}
              className={activeSheetKey === sheet.sheet_key ? 'active' : ''}
              onClick={() => setActiveSheetKey(sheet.sheet_key)}
              type="button"
            >
              {sheet.sheet_name}
            </button>
          ))}
        </div>

        <div className="cms-sheet-toolbar">
          <div className="cms-toolbar-left">
            <button className="ghost-button compact" onClick={toggleFullscreen} type="button">
              {isFullscreen ? 'Exit full screen' : 'Full screen'}
            </button>
            <div className="cms-view-tabs">
              <button
                className={activeView === 'current' ? 'active' : ''}
                onClick={() => setViewModeBySheet((current) => ({ ...current, [activeSheetKey]: 'current' }))}
                type="button"
              >
                Current rows
              </button>
              <button
                className={activeView === 'archived' ? 'active' : ''}
                onClick={() => setViewModeBySheet((current) => ({ ...current, [activeSheetKey]: 'archived' }))}
                type="button"
              >
                Archived rows ({activeSheet.archived_rows?.length || 0})
              </button>
            </div>
          </div>
          <div className="cms-toolbar-actions">
            {activeView === 'current' && <button className="ghost-button compact" onClick={() => insertRow(activeSheet.cells.length)} type="button">Insert row</button>}
            <button className="ghost-button compact" onClick={refreshSheets} type="button">Refresh sheet</button>
          </div>
        </div>

        {error && <p className="error-box dashboard-error">{error}</p>}
        {loading && <p className="muted">Loading owner work orders...</p>}

        <div className="cms-sheet-meta">
          <div>
            <strong>{activeSheet.sheet_name}</strong>
            <p className="muted">
              {ownerCmsRowCount}+ rows, {ownerCmsColumnCount} columns. Blank values stay blank until you choose something.
            </p>
          </div>
        </div>

        <SheetGrid
          sheet={activeSheet}
          viewMode={activeView}
          filters={activeFilters}
          savingCell={savingCell}
          onCellChange={updateCell}
          onCellCommit={saveCell}
          onInsertRow={insertRow}
          onArchiveRow={archiveRow}
          onSetFilter={(columnKey, value) => updateFilter(activeSheetKey, columnKey, value)}
        />
      </section>
    </section>
  );
}
