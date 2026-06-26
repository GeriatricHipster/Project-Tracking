import { useMemo, useState } from 'react';

const DEFAULT_ROWS = ['16.32', '2317', '', '', '', ''];

function toNumber(value) {
  const next = Number(value);
  return Number.isFinite(next) ? next : 0;
}

export default function MarkupCalculatorPanel() {
  const [rows, setRows] = useState(DEFAULT_ROWS);

  const totals = useMemo(() => {
    const materialTotal = rows.reduce((sum, value) => sum + toNumber(value), 0);
    const markupTotal = materialTotal * 0.05;
    return {
      materialTotal,
      markupTotal,
      grandTotal: materialTotal + markupTotal
    };
  }, [rows]);

  function updateRow(index, value) {
    setRows((current) => current.map((entry, rowIndex) => (rowIndex === index ? value : entry)));
  }

  return (
    <section className="dashboard-stack">
      <section className="panel markup-panel">
        <div className="panel-heading">
          <div>
            <h2>Markup calculator</h2>
            <p>5% markup only.</p>
          </div>
        </div>

        <div className="markup-table-wrap">
          <table className="markup-table">
            <thead>
              <tr>
                <th>Material</th>
                <th>5% markup</th>
                <th>Total with markup</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((value, index) => {
                const material = toNumber(value);
                const markup = material * 0.05;
                return (
                  <tr key={`markup-${index}`}>
                    <td>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={value}
                        onChange={(event) => updateRow(index, event.target.value)}
                      />
                    </td>
                    <td>{markup ? markup.toFixed(2) : '—'}</td>
                    <td>{material ? (material + markup).toFixed(2) : '—'}</td>
                  </tr>
                );
              })}
              <tr className="markup-total-row">
                <th>Total</th>
                <th>{totals.markupTotal.toFixed(2)}</th>
                <th>{totals.grandTotal.toFixed(2)}</th>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
