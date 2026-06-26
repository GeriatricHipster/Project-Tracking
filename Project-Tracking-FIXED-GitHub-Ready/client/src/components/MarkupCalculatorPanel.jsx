import { useMemo, useState } from 'react';

function money(value) {
  const num = Number(value || 0);
  return num.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
}

export default function MarkupCalculatorPanel() {
  const [rows, setRows] = useState(Array.from({ length: 6 }, () => ({ material: '', labor: '' })));

  const totals = useMemo(() => {
    const materialTotal = rows.reduce((sum, row) => sum + Number(row.material || 0), 0);
    const laborTotal = rows.reduce((sum, row) => sum + Number(row.labor || 0), 0);
    const subtotal = materialTotal + laborTotal;
    const markup = subtotal * 0.05;
    return { materialTotal, laborTotal, subtotal, markup, grandTotal: subtotal + markup };
  }, [rows]);

  function updateRow(index, field, value) {
    setRows((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, [field]: value } : row)));
  }

  return (
    <section className="dashboard-stack">
      <section className="panel">
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
                <th>#</th>
                <th>Material</th>
                <th>Labor</th>
                <th>Row total</th>
                <th>5% markup</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                const rowTotal = Number(row.material || 0) + Number(row.labor || 0);
                return (
                  <tr key={index}>
                    <td>{index + 1}</td>
                    <td><input type="number" min="0" step="0.01" value={row.material} onChange={(event) => updateRow(index, 'material', event.target.value)} /></td>
                    <td><input type="number" min="0" step="0.01" value={row.labor} onChange={(event) => updateRow(index, 'labor', event.target.value)} /></td>
                    <td>{money(rowTotal)}</td>
                    <td>{money(rowTotal * 0.05)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <th colSpan="3">Totals</th>
                <th>{money(totals.subtotal)}</th>
                <th>{money(totals.markup)}</th>
              </tr>
            </tfoot>
          </table>
        </div>

        <section className="summary-strip markup-summary">
          <article className="metric-card panel"><span>Material total</span><strong>{money(totals.materialTotal)}</strong></article>
          <article className="metric-card panel"><span>Labor total</span><strong>{money(totals.laborTotal)}</strong></article>
          <article className="metric-card panel"><span>5% markup</span><strong>{money(totals.markup)}</strong></article>
          <article className="metric-card panel"><span>Grand total</span><strong>{money(totals.grandTotal)}</strong></article>
        </section>
      </section>
    </section>
  );
}
