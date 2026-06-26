import { useMemo, useState } from 'react';

const DEFAULT_ROWS = [
  { label: 'Material 1', value: 0 },
  { label: 'Material 2', value: 0 },
  { label: 'Material 3', value: 0 },
  { label: 'Material 4', value: 0 },
  { label: 'Material 5', value: 0 },
  { label: 'Material 6', value: 0 }
];

function money(value) {
  const number = Number(value || 0);
  return number.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function MarkupCalculatorPanel() {
  const [rows, setRows] = useState(DEFAULT_ROWS);

  const totalMaterial = useMemo(
    () => rows.reduce((sum, row) => sum + Number(row.value || 0), 0),
    [rows]
  );
  const markup = totalMaterial * 0.05;
  const grandTotal = totalMaterial + markup;

  function updateRow(index, field, value) {
    setRows((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, [field]: value } : row)));
  }

  return (
    <section className="dashboard-stack">
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Markup calculator</h2>
            <p>5% markup only. Values update automatically as you type.</p>
          </div>
        </div>

        <div className="markup-table-wrap">
          <table className="markup-table">
            <thead>
              <tr>
                <th>Description</th>
                <th>Material</th>
                <th>5% Markup</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                const value = Number(row.value || 0);
                const rowMarkup = value * 0.05;
                return (
                  <tr key={index}>
                    <td>
                      <input value={row.label} onChange={(event) => updateRow(index, 'label', event.target.value)} />
                    </td>
                    <td>
                      <input type="number" min="0" step="0.01" value={row.value} onChange={(event) => updateRow(index, 'value', event.target.value)} />
                    </td>
                    <td>{money(rowMarkup)}</td>
                    <td>{money(value + rowMarkup)}</td>
                  </tr>
                );
              })}
              <tr className="markup-total-row">
                <td>Total</td>
                <td>{money(totalMaterial)}</td>
                <td>{money(markup)}</td>
                <td>{money(grandTotal)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
