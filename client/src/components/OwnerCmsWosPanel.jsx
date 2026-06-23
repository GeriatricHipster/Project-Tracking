import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../lib/api';
import {
  buildBlankOwnerCmsGrid,
  normalizeOwnerCmsArchivedRows,
  normalizeOwnerCmsGrid,
  ownerCmsColumnCount,
  ownerCmsColumns,
  ownerCmsRowCount
} from '../lib/ownerCmsWorkbook';

const SHEETS = [
  { sheet_key: 'kurts_cms_wos', sheet_name: 'Kurts CMS WOs' },
  { sheet_key: 'austins_cms_wos', sheet_name: 'Austins CMS WOs' }
];

const VIEW_TABS = [
  { id: 'active', label: 'Active rows' },
  { id: 'archived', label: 'Archived rows' }
];

function titleize(value) {
  return String(value || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function rowHasValue(row) {
  return Array.isArray(row) && row.some((value) => String(value || '').trim().length > 0);
}

function rowMatchesFilters(row, filters) {
  return ownerCmsColumns.every((column, columnIndex) => {
    const query = String(filters?.[column.key] || '').trim().toLowerCase();
    if (!query) return true;
    const value = String(row[columnIndex] ?? '').toLowerCase();
    return value.includes(query);
  });
}

function archiveRowMatchesFilters(archiveRow, filters) {
  return rowMatchesFilters(archiveRow.cells, filters);
}

function buildFilterOptions(rows) {
  const optionsByColumn = {};
  ownerCmsColumns.forEach((column, columnIndex) => {
    if (column.type !== 'select') return;
    const seen = new Map();
    (column.options || []).forEach((option) => {
      const normalized = String(option || '').trim();
      if (!normalized) return;
      seen.set(normalized.toLowerCase(), normalized);
    });
    rows.forEach((row) => {
      const value = String(row[columnIndex] ?? '').trim();
      if (!value) return;
      const key = value.toLowerCase();
      if (!seen.has(key)) seen.set(key, value);
    });
    optionsByColumn[column.key] = [...seen.values()].sort((a, b) => a.localeCompare(b));
  });
  return optionsByColumn;
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
          <option value=""> </option>
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

function FilterCell({ column, value, options = [], onChange }) {
  if (column.type === 'date') {
    return (
      <th className="cms-grid-filter-cell" style={{ minWidth: column.width, width: column.width }}>
        <input
          className="cms-grid-filter-input"
          type="date"
          value={value || ''}
          onChange={(event) => onChange(event.target.value)}
        />
      </th>
    );
  }

  if (column.type === 'select') {
    const listId = `cms-filter-${column.key}`;
    return (
      <th className="cms-grid-filter-cell" style={{ minWidth: column.width, width: column.width }}>
        <input
          className="cms-grid-filter-input"
          list={listId}
          placeholder={`Filter ${column.label}`}
          value={value || ''}
          onChange={(event) => onChange(event.target.value)}
        />
        <datalist id={listId}>
          {options.map((option) => (
            <option key={option} value={option} />
          ))}
        </datalist>
      </th>
    );
  }

  return (
    <th className="cms-grid-filter-cell" style={{ minWidth: column.width, width: column.width }}>
      <input
        className="cms-grid-filter-input"
        placeholder={`Filter ${column.label}`}
        value={value || ''}
        onChange={(event) => onChange(event.target.value)}
      />
    </th>
  );
}

function GridHeaderRow() {
  return (
    <tr>
      <th className="cms-grid-corner">#</th>
      {ownerCmsColumns.map((column) => (
        <th key={column.key} className="cms-grid-col-header" style={{ minWidth: column.width, width: column.width }}>
          {column.label}
        </th>
      ))}
      <th className="cms-grid-col-header cms-grid-actions-header">Actions</th>
    </tr>
  );
}

function GridFilterRow({ filters, filterOptionsByColumn, onFilterChange }) {
  return (
    <tr className="cms-grid-filter-row">
      <th className="cms-grid-corner cms-grid-filter-corner">Filter</th>
      {ownerCmsColumns.map((column) => (
        <FilterCell
          key={column.key}
          column={column}
          value={filters[column.key]}
          options={filterOptionsByColumn[column.key] || []}
          onChange={(nextValue) => onFilterChange(column.key, nextValue)}
        />
      ))}
      <th className="cms-grid-filter-cell cms-grid-actions-header">
        <button className="ghost-button compact" type="button" onClick={() => onFilterChange('__clear__', '')}>Clear</button>
      </th>
    </tr>
  );
}

function ActiveSheetGrid({ sheetKey, rows, filters, filterOptionsByColumn, savingCell, onCellChange, onCellCommit, onArchiveRow, onInsertRow, onFilterChange }) {
  const visibleRows = rows
    .map((row, rowIndex) => ({ row, rowIndex }))
    .filter(({ row }) => rowMatchesFilters(row, filters));

  return (
    <div className="cms-grid-wrap">
      <table className="cms-grid-table cms-grid-table-sticky">
        <thead>
          <GridHeaderRow />
          <GridFilterRow filters={filters} filterOptionsByColumn={filterOptionsByColumn} onFilterChange={onFilterChange} />
        </thead>
        <tbody>
          {visibleRows.map(({ row, rowIndex }) => (
            <tr key={rowIndex}>
              <th className="cms-grid-row-header">
                <div className="cms-row-header-inner">
                  <span>{rowIndex + 1}</span>
                  <div className="row-actions cms-row-header-actions">
                    <button
                      className="primary-button compact"
                      disabled={savingCell === `${sheetKey}-insert-${rowIndex}`}
                      type="button"
                      onClick={() => onInsertRow(rowIndex)}
                    >
                      Insert row
                    </button>
                    <button className="danger-button compact" type="button" onClick={() => onArchiveRow(rowIndex)}>
                      Delete / archive
                    </button>
                  </div>
                </div>
              </th>
              {ownerCmsColumns.map((column, colIndex) => (
                <SpreadsheetCell
                  key={`${rowIndex}-${column.key}`}
                  sheetKey={sheetKey}
                  rowIndex={rowIndex}
                  column={{ ...column, index: colIndex }}
                  value={row[colIndex] ?? ''}
                  onCellChange={onCellChange}
                  onCellCommit={onCellCommit}
                  disabled={savingCell === `${sheetKey}-active-${rowIndex}-${colIndex}`}
                />
              ))}
              <td className="cms-grid-cell cms-grid-actions-cell">
                <span className="muted">Active</span>
              </td>
            </tr>
          ))}
          {!visibleRows.length && (
            <tr>
              <td colSpan={ownerCmsColumnCount + 2}>
                <div className="empty-state table-empty">
                  <h3>No matching active rows</h3>
                  <p>Clear filters to see the full spreadsheet.</p>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function ArchivedSheetGrid({ sheetKey, archivedRows, filters, filterOptionsByColumn, savingCell, onRestoreRow, onDeleteArchivedRow, onFilterChange }) {
  const visibleRows = archivedRows
    .map((row, archiveIndex) => ({ row, archiveIndex }))
    .filter(({ row }) => archiveRowMatchesFilters(row, filters));

  return (
    <div className="cms-grid-wrap">
      <table className="cms-grid-table cms-grid-table-sticky archived-grid">
        <thead>
          <GridHeaderRow />
          <GridFilterRow filters={filters} filterOptionsByColumn={filterOptionsByColumn} onFilterChange={onFilterChange} />
        </thead>
        <tbody>
          {visibleRows.map(({ row, archiveIndex }) => (
            <tr key={`${row.row_number || archiveIndex}-${archiveIndex}`}>
              <th className="cms-grid-row-header archived-row-header">
                <span>{row.row_number || archiveIndex + 1}</span>
                <small>{row.archived_at ? new Date(row.archived_at).toLocaleDateString() : 'Archived row'}</small>
              </th>
              {ownerCmsColumns.map((column, colIndex) => (
                <td key={`${archiveIndex}-${column.key}`} className="cms-grid-cell" style={{ minWidth: column.width, width: column.width }}>
                  {column.type === 'textarea' ? (
                    <textarea className="cms-grid-editor cms-grid-textarea" disabled value={row.cells[colIndex] ?? ''} readOnly />
                  ) : column.type === 'select' || column.type === 'date' ? (
                    <input className="cms-grid-editor" disabled value={row.cells[colIndex] ?? ''} readOnly />
                  ) : (
                    <input className="cms-grid-editor" disabled value={row.cells[colIndex] ?? ''} readOnly spellCheck={false} />
                  )}
                </td>
              ))}
              <td className="cms-grid-cell cms-grid-actions-cell">
                <div className="row-actions">
                  <button className="primary-button compact" disabled={savingCell === `${sheetKey}-restore-${archiveIndex}`} type="button" onClick={() => onRestoreRow(archiveIndex)}>
                    Restore
                  </button>
                  <button className="danger-button compact" disabled={savingCell === `${sheetKey}-delete-${archiveIndex}`} type="button" onClick={() => onDeleteArchivedRow(archiveIndex)}>
                    Delete forever
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {!visibleRows.length && (
            <tr>
              <td colSpan={ownerCmsColumnCount + 2}>
                <div className="empty-state table-empty">
                  <h3>No archived rows yet</h3>
                  <p>Deleted rows will appear here so they can be restored later.</p>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function OwnerCmsWosPanel({ user }) {
  const canAccess = user?.site_role === 'owner' && !user?.access_revoked;
  const [activeSheetKey, setActiveSheetKey] = useState(SHEETS[0].sheet_key);
  const [activeView, setActiveView] = useState('active');
  const [sheets, setSheets] = useState({});
  const [filters, setFilters] = useState({});
  const [loading, setLoading] = useState(false);
  const [savingCell, setSavingCell] = useState('');
  const [error, setError] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const panelRef = useRef(null);

  const activeSheet = sheets[activeSheetKey] || {
    sheet_key: activeSheetKey,
    sheet_name: SHEETS.find((sheet) => sheet.sheet_key === activeSheetKey)?.sheet_name || titleize(activeSheetKey),
    cells: buildBlankOwnerCmsGrid(),
    archived_rows: []
  };

  const activeRows = useMemo(() => normalizeOwnerCmsGrid(activeSheet.cells), [activeSheet.cells]);
  const archivedRows = useMemo(() => normalizeOwnerCmsArchivedRows(activeSheet.archived_rows), [activeSheet.archived_rows]);
  const currentFilters = filters[`${activeSheetKey}:${activeView}`] || {};
  const filterRows = activeView === 'active' ? activeRows : archivedRows.map((row) => row.cells);
  const filterOptionsByColumn = useMemo(() => buildFilterOptions(filterRows), [filterRows]);

  useEffect(() => {
    if (!canAccess) return;
    refreshSheets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canAccess]);

  useEffect(() => {
    const sync = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, []);

  useEffect(() => {
    if (!isFullscreen) return undefined;
    document.body.classList.add('owner-cms-body-fullscreen');
    return () => document.body.classList.remove('owner-cms-body-fullscreen');
  }, [isFullscreen]);

  async function refreshSheets() {
    setLoading(true);
    setError('');
    try {
      const result = await api('/owner/cms-wos');
      const nextSheets = {};
      (result.sheets || []).forEach((sheet) => {
        nextSheets[sheet.sheet_key] = {
          ...sheet,
          cells: normalizeOwnerCmsGrid(sheet.cells),
          archived_rows: normalizeOwnerCmsArchivedRows(sheet.archived_rows)
        };
      });
      setSheets(nextSheets);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function saveCell(sheetKey, rowIndex, colIndex, value) {
    const nextValue = String(value ?? '');
    setError('');
    setSavingCell(`${sheetKey}-active-${rowIndex}-${colIndex}`);
    try {
      await api(`/owner/cms-wos/${sheetKey}/cell`, {
        method: 'PATCH',
        body: { row_index: rowIndex, col_index: colIndex, value: nextValue }
      });
      setSheets((current) => {
        const next = { ...current };
        const sheet = next[sheetKey] || { sheet_key: sheetKey, sheet_name: titleize(sheetKey), cells: buildBlankOwnerCmsGrid(), archived_rows: [] };
        const cells = normalizeOwnerCmsGrid(sheet.cells);
        cells[rowIndex][colIndex] = nextValue;
        next[sheetKey] = { ...sheet, cells };
        return next;
      });
    } catch (err) {
      setError(err.message);
      await refreshSheets();
    } finally {
      setSavingCell('');
    }
  }

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

  async function insertRow(rowIndex = -1) {
    setError('');
    setSavingCell(`${activeSheetKey}-insert-${rowIndex}`);
    try {
      await api(`/owner/cms-wos/${activeSheetKey}/rows/insert`, { method: 'POST', body: { row_index: rowIndex } });
      await refreshSheets();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingCell('');
    }
  }

  async function archiveRow(rowIndex) {
    setError('');
    setSavingCell(`${activeSheetKey}-archive-${rowIndex}`);
    try {
      await api(`/owner/cms-wos/${activeSheetKey}/rows/${rowIndex}/archive`, { method: 'POST' });
      await refreshSheets();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingCell('');
    }
  }

  async function restoreRow(archiveIndex) {
    setError('');
    setSavingCell(`${activeSheetKey}-restore-${archiveIndex}`);
    try {
      await api(`/owner/cms-wos/${activeSheetKey}/archived/${archiveIndex}/restore`, { method: 'POST' });
      await refreshSheets();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingCell('');
    }
  }

  async function deleteArchivedRow(archiveIndex) {
    const confirmed = window.confirm('Delete this archived row forever?');
    if (!confirmed) return;
    setError('');
    setSavingCell(`${activeSheetKey}-delete-${archiveIndex}`);
    try {
      await api(`/owner/cms-wos/${activeSheetKey}/archived/${archiveIndex}`, { method: 'DELETE' });
      await refreshSheets();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingCell('');
    }
  }

  function updateFilter(columnKey, value) {
    setFilters((current) => {
      const next = { ...current };
      const filterKey = `${activeSheetKey}:${activeView}`;
      const currentFilters = { ...(next[filterKey] || {}) };
      if (columnKey === '__clear__') {
        next[filterKey] = {};
        return next;
      }
      currentFilters[columnKey] = value;
      next[filterKey] = currentFilters;
      return next;
    });
  }

  async function toggleFullscreen() {
    const node = panelRef.current;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return;
      }
      if (node?.requestFullscreen) {
        await node.requestFullscreen();
        return;
      }
    } catch (err) {
      // Fall back to the CSS-based fullscreen state below.
    }
    setIsFullscreen((current) => !current);
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
    <section ref={panelRef} className={`dashboard-stack owner-cms-panel ${isFullscreen ? 'is-fullscreen' : ''}`}>
      <section className="panel owner-cms-shell">
        <div className="panel-heading">
          <div>
            <h2>CMS WOs</h2>
            <p>Owner-only work order spreadsheets. Use filters, insert rows, archive rows, and restore them later if needed.</p>
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

        <div className="cms-sheet-tabs secondary" role="tablist" aria-label="CMS work order row tabs">
          {VIEW_TABS.map((tab) => (
            <button
              key={tab.id}
              className={activeView === tab.id ? 'active' : ''}
              onClick={() => setActiveView(tab.id)}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </div>

        {error && <p className="error-box dashboard-error">{error}</p>}
        {loading && <p className="muted">Loading owner work orders...</p>}

        <div className="cms-sheet-meta">
          <div>
            <strong>{activeSheet.sheet_name}</strong>
            <p className="muted">
              {activeRows.length} active rows · {ownerCmsColumnCount} columns. Deleted rows are archived in the second tab. You can grow beyond {ownerCmsRowCount} rows by inserting more.
            </p>
          </div>
          <div className="row-actions cms-sheet-meta-actions">
            <button className="primary-button compact" disabled={savingCell === `${activeSheetKey}-insert--1`} onClick={() => insertRow(-1)} type="button">
              Add row
            </button>
            <button className="ghost-button compact" onClick={toggleFullscreen} type="button">
              {isFullscreen ? 'Exit full screen' : 'Full screen'}
            </button>
            <button className="ghost-button compact" onClick={refreshSheets} type="button">
              Refresh sheet
            </button>
          </div>
        </div>

        {activeView === 'active' ? (
          <ActiveSheetGrid
            sheetKey={activeSheetKey}
            rows={activeRows}
            filters={currentFilters}
            filterOptionsByColumn={filterOptionsByColumn}
            savingCell={savingCell}
            onCellChange={updateCell}
            onCellCommit={saveCell}
            onArchiveRow={archiveRow}
            onInsertRow={insertRow}
            onFilterChange={updateFilter}
          />
        ) : (
          <ArchivedSheetGrid
            sheetKey={activeSheetKey}
            archivedRows={archivedRows}
            filters={currentFilters}
            filterOptionsByColumn={filterOptionsByColumn}
            savingCell={savingCell}
            onRestoreRow={restoreRow}
            onDeleteArchivedRow={deleteArchivedRow}
            onFilterChange={updateFilter}
          />
        )}
      </section>
    </section>
  );
}
