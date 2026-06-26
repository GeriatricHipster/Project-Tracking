import { useMemo, useState } from 'react';

function currency(value) {
  const number = Number(value || 0);
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(number);
}

function blankRow(id) {
  return { id, item: '', material: '' };
}

export default function MarkupCalculatorPanel() {
  const [rows, setRows] = useState(() => [blankRow(1), blankRow(2), blankRow(3)]);

  const totals = useMemo(() => {
    const materialTotal = rows.reduce((sum, row) => sum + Number(row.material || 0), 0);
    const markupTotal = materialTotal * 0.05;
    return { materialTotal, markupTotal, grandTotal: materialTotal + markupTotal };
  }, [rows]);

  function updateRow(id, field, value) {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
  }

  function addRow() {
    setRows((current) => [...current, blankRow(current.length ? Math.max(...current.map((row) => row.id)) + 1 : 1)]);
  }

  function resetRows() {
    setRows([blankRow(1), blankRow(2), blankRow(3)]);
  }

  return (
    <section className="dashboard-stack">
      <section className="panel markup-panel">
        <div className="panel-heading">
          <div>
            <h2>Markup calculator</h2>
            <p>5% calculation only. Enter material amounts and the calculator will build the 5% markup totals.</p>
          </div>
          <div className="row-actions">
            <button className="ghost-button compact" onClick={addRow} type="button">Add row</button>
            <button className="ghost-button compact" onClick={resetRows} type="button">Reset</button>
          </div>
        </div>

        <div className="table-scroll markup-table-wrap">
          <table className="markup-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Material</th>
                <th>5% Markup</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const material = Number(row.material || 0);
                const markup = material * 0.05;
                return (
                  <tr key={row.id}>
                    <td>
                      <input value={row.item} onChange={(event) => updateRow(row.id, 'item', event.target.value)} placeholder="Description" />
                    </td>
                    <td>
                      <input type="number" min="0" step="0.01" value={row.material} onChange={(event) => updateRow(row.id, 'material', event.target.value)} placeholder="0.00" />
                    </td>
                    <td>{currency(markup)}</td>
                    <td>{currency(material + markup)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <th>Total</th>
                <th>{currency(totals.materialTotal)}</th>
                <th>{currency(totals.markupTotal)}</th>
                <th>{currency(totals.grandTotal)}</th>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    </section>
  );
}
