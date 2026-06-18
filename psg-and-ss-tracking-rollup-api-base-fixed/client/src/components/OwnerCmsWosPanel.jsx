import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';

const SHEETS = [
  { sheet_key: 'kurts_cms_wos', sheet_name: 'Kurts CMS WOs' },
  { sheet_key: 'austins_cms_wos', sheet_name: 'Austins CMS WOs' }
];

const ROW_COUNT = 60;
const COL_COUNT = 60;

function buildBlankGrid() {
  return Array.from({ length: ROW_COUNT }, () => Array.from({ length: COL_COUNT }, () => ''));
}

function normalizeGrid(cells) {
  const grid = buildBlankGrid();
  if (!Array.isArray(cells)) return grid;

  for (let rowIndex = 0; rowIndex < Math.min(cells.length, ROW_COUNT); rowIndex += 1) {
    const row = cells[rowIndex];
    if (!Array.isArray(row)) continue;
    for (let colIndex = 0; colIndex < Math.min(row.length, COL_COUNT); colIndex += 1) {
      const value = row[colIndex];
      grid[rowIndex][colIndex] = value === null || value === undefined ? '' : String(value);
    }
  }

  return grid;
}

function titleize(value) {
  return String(value || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

const SpreadsheetCell = memo(function SpreadsheetCell({ sheetKey, rowIndex, colIndex, value, onChange, onCommit, disabled }) {
  return (
    <td className="cms-grid-cell">
      <input
        aria-label={`${sheetKey} row ${rowIndex + 1} column ${colIndex + 1}`}
        className="cms-grid-input"
        disabled={disabled}
        value={value}
        onBlur={() => onCommit(sheetKey, rowIndex, colIndex, value)}
        onChange={(event) => onChange(sheetKey, rowIndex, colIndex, event.target.value)}
        spellCheck={false}
      />
    </td>
  );
});

function SheetGrid({ sheet, savingCell, onCellChange, onCellCommit }) {
  const columnLabels = useMemo(() => Array.from({ length: COL_COUNT }, (_, index) => index + 1), []);
  const rows = sheet?.cells || buildBlankGrid();

  return (
    <div className="cms-grid-wrap">
      <table className="cms-grid-table">
        <thead>
          <tr>
            <th className="cms-grid-corner">Row / Col</th>
            {columnLabels.map((label) => (
              <th key={label} className="cms-grid-col-header">{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              <th className="cms-grid-row-header">{rowIndex + 1}</th>
              {Array.from({ length: COL_COUNT }, (_, colIndex) => (
                <SpreadsheetCell
                  key={`${rowIndex}-${colIndex}`}
                  sheetKey={sheet.sheet_key}
                  rowIndex={rowIndex}
                  colIndex={colIndex}
                  value={row[colIndex] ?? ''}
                  onChange={onCellChange}
                  onCommit={onCellCommit}
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

  const canAccess = user?.site_role === 'owner' && !user?.access_revoked;

  const activeSheet = sheets[activeSheetKey] || {
    sheet_key: activeSheetKey,
    sheet_name: SHEETS.find((sheet) => sheet.sheet_key === activeSheetKey)?.sheet_name || titleize(activeSheetKey),
    cells: buildBlankGrid()
  };

  const refreshSheets = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api('/owner/cms-wos');
      const nextSheets = {};
      for (const sheet of data.sheets || []) {
        nextSheets[sheet.sheet_key] = {
          ...sheet,
          cells: normalizeGrid(sheet.cells)
        };
      }
      setSheets(nextSheets);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [activeSheetKey]);

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

  const updateCell = useCallback((sheetKey, rowIndex, colIndex, value) => {
    setSheets((current) => {
      const next = { ...current };
      const currentSheet = next[sheetKey] || {
        sheet_key: sheetKey,
        sheet_name: SHEETS.find((sheet) => sheet.sheet_key === sheetKey)?.sheet_name || titleize(sheetKey),
        cells: buildBlankGrid()
      };
      const nextCells = normalizeGrid(currentSheet.cells);
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
    <section className="dashboard-stack owner-cms-panel">
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>CMS WOs</h2>
            <p>Owner-only work order spreadsheets. Changes save when you leave a cell.</p>
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
          <div>
            <strong>{activeSheet.sheet_name}</strong>
            <p className="muted">60 rows and 60 columns. Use horizontal scroll to move across the sheet.</p>
          </div>
          <button className="ghost-button compact" onClick={refreshSheets} type="button">
            Refresh sheet
          </button>
        </div>

        <SheetGrid
          sheet={activeSheet}
          savingCell={savingCell}
          onCellChange={updateCell}
          onCellCommit={saveCell}
        />
      </section>
    </section>
  );
}
