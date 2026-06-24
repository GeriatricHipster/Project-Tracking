import { memo, useCallback, useEffect, useState } from 'react';
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

function SheetGrid({ sheet, savingCell, filters, onFilterChange, onCellChange, onCellCommit }) {
  const rows = sheet?.cells || buildBlankOwnerCmsGrid();

  const filteredRows = rows.map((row, rowIndex) => ({ row, rowIndex })).filter(({ row }) => {
    return Object.entries(filters || {}).every(([colKey, filterValue]) => {
      const query = String(filterValue || '').trim().toLowerCase();
      if (!query) return true;
      const column = ownerCmsColumns.find((item) => item.key === colKey);
      const columnIndex = column ? ownerCmsColumns.indexOf(column) : -1;
      if (columnIndex < 0) return true;
      const cellValue = String(row[columnIndex] ?? '').trim().toLowerCase();
      if (!cellValue) return false;
      if (column?.type === 'select') return cellValue.includes(query);
      return cellValue.includes(query);
    });
  });

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
          </tr>
          <tr className="cms-grid-filter-row">
            <th className="cms-grid-corner cms-grid-filter-sticky">Filter</th>
            {ownerCmsColumns.map((column) => {
              const filterId = `cms-filter-${sheet.sheet_key}-${column.key}`;
              const currentFilter = filters?.[column.key] || '';
              return (
                <th key={`${sheet.sheet_key}-${column.key}-filter`} className="cms-grid-filter-cell" style={{ minWidth: column.width, width: column.width }}>
                  {column.type === 'select' && Array.isArray(column.options) ? (
                    <>
                      <input
                        className="cms-grid-filter-input"
                        list={filterId}
                        placeholder="Filter"
                        value={currentFilter}
                        onChange={(event) => onFilterChange(sheet.sheet_key, column.key, event.target.value)}
                      />
                      <datalist id={filterId}>
                        {column.options.map((option) => <option key={option} value={option} />)}
                      </datalist>
                    </>
                  ) : (
                    <input
                      className="cms-grid-filter-input"
                      placeholder="Filter"
                      value={currentFilter}
                      onChange={(event) => onFilterChange(sheet.sheet_key, column.key, event.target.value)}
                    />
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {filteredRows.map(({ row, rowIndex }) => (
            <tr key={rowIndex}>
              <th className="cms-grid-row-header">{rowIndex + 1}</th>
              {ownerCmsColumns.map((column, colIndex) => (
                <SpreadsheetCell
                  key={`${rowIndex}-${column.key}`}
                  sheetKey={sheet.sheet_key}
                  rowIndex={rowIndex}
                  column={{ ...column, index: colIndex }}
                  value={row[colIndex] ?? ''}
                  onCellChange={onCellChange}
                  onCellCommit={onCellCommit}
                  disabled={savingCell === `${sheet.sheet_key}-${rowIndex}-${colIndex}`}
                />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function OwnerCmsWosPanel({ user }) {
  const [activeSheetKey, setActiveSheetKey] = useState(SHEETS[0].sheet_key);
  const [sheets, setSheets] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingCell, setSavingCell] = useState('');
  const [error, setError] = useState('');
  const [fullscreenSheetKey, setFullscreenSheetKey] = useState('');
  const [filters, setFilters] = useState({});

  const canAccess = user?.site_role === 'owner' && !user?.access_revoked;

  const activeSheet = sheets[activeSheetKey] || {
    sheet_key: activeSheetKey,
    sheet_name: SHEETS.find((sheet) => sheet.sheet_key === activeSheetKey)?.sheet_name || titleize(activeSheetKey),
    cells: buildBlankOwnerCmsGrid()
  };

  const activeFilters = filters[activeSheetKey] || {};
  const isFullscreen = fullscreenSheetKey === activeSheetKey;

  const refreshSheets = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api('/owner/cms-wos');
      const nextSheets = {};
      for (const sheet of data.sheets || []) {
        nextSheets[sheet.sheet_key] = {
          ...sheet,
          cells: normalizeOwnerCmsGrid(sheet.cells)
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

  async function insertRow(sheetKey) {
    setError('');
    try {
      await api(`/owner/cms-wos/${sheetKey}/rows`, { method: 'POST' });
      await refreshSheets();
    } catch (err) {
      setError(err.message);
    }
  }

  function updateFilter(sheetKey, columnKey, value) {
    setFilters((current) => ({
      ...current,
      [sheetKey]: {
        ...(current[sheetKey] || {}),
        [columnKey]: value
      }
    }));
  }

  function toggleFullscreen(sheetKey) {
    setFullscreenSheetKey((current) => (current === sheetKey ? '' : sheetKey));
  }

  const updateCell = useCallback((sheetKey, rowIndex, colIndex, value) => {
    setSheets((current) => {
      const next = { ...current };
      const currentSheet = next[sheetKey] || {
        sheet_key: sheetKey,
        sheet_name: SHEETS.find((sheet) => sheet.sheet_key === sheetKey)?.sheet_name || titleize(sheetKey),
        cells: buildBlankOwnerCmsGrid()
      };
      const nextCells = normalizeOwnerCmsGrid(currentSheet.cells);
      nextCells[rowIndex][colIndex] = value;
      next[sheetKey] = { ...currentSheet, cells: nextCells };
      return next;
    });
  }, []);

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
    <section className={`dashboard-stack owner-cms-panel ${isFullscreen ? 'cms-fullscreen' : ''}`}>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>CMS WOs</h2>
            <p>Owner-only work order spreadsheets. Use the dropdowns and date fields in the table below.</p>
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

        {error && <p className="error-box dashboard-error">{error}</p>}
        {loading && <p className="muted">Loading owner work orders...</p>}

        <div className="cms-sheet-meta">
          <div className="cms-sheet-meta-left">
            <button className="ghost-button compact" onClick={() => toggleFullscreen(activeSheet.sheet_key)} type="button">
              {isFullscreen ? 'Exit full screen' : 'Full screen'}
            </button>
            <div>
              <strong>{activeSheet.sheet_name}</strong>
              <p className="muted">
                {activeSheet.cells?.length || ownerCmsRowCount} rows, {ownerCmsColumnCount} columns. Blank values stay blank until you choose something.
              </p>
            </div>
          </div>
          <div className="cms-sheet-actions">
            <button className="ghost-button compact" onClick={() => insertRow(activeSheet.sheet_key)} type="button">Insert row</button>
            <button className="ghost-button compact" onClick={refreshSheets} type="button">Refresh sheet</button>
          </div>
        </div>

        <SheetGrid
          sheet={activeSheet}
          savingCell={savingCell}
          filters={activeFilters}
          onFilterChange={updateFilter}
          onCellChange={updateCell}
          onCellCommit={saveCell}
        />
      </section>
    </section>
  );
}
