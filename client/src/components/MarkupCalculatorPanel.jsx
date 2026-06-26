import React, { useMemo, useState } from 'react';

const defaultRows = [16.32, 2317, 0, 0, 0, 0];

export default function MarkupCalculatorPanel() {
  const [rows, setRows] = useState(defaultRows);

  const totals = useMemo(() => {
    const material = rows.reduce((sum, value) => sum + Number(value || 0), 0);
    const markup = material * 0.05;
    return {
      material,
      markup,
      total: material + markup
    };
  }, [rows]);

  function updateRow(index, value) {
    setRows((current) => {
      const next = [...current];
      next[index] = value;
      return next;
    });
  }

  return (
    <section className="dashboard-stack">
      <section className="panel markup-panel">
        <div className="panel-heading">
          <div>
            <h2>Markup calculator</h2>
            <p>Simple 5% markup worksheet based on the spreadsheet formulas.</p>
          </div>
        </div>

        <div className="markup-grid">
          <div className="markup-column-title">Material</div>
          <div className="markup-column-title">5% Markup</div>
          <div className="markup-column-title">Total</div>
          {rows.map((value, index) => {
            const markup = Number(value || 0) * 0.05;
            const total = Number(value || 0) + markup;
            return (
              <React.Fragment key={index}>
                <input
                  type="number"
                  step="0.01"
                  value={value}
                  onChange={(event) => updateRow(index, event.target.value)}
                />
                <input type="text" value={markup.toFixed(2)} readOnly />
                <input type="text" value={total.toFixed(2)} readOnly />
              </React.Fragment>
            );
          })}
          <div className="markup-total-label">Totals</div>
          <input type="text" value={totals.material.toFixed(2)} readOnly />
          <input type="text" value={totals.markup.toFixed(2)} readOnly />
          <input type="text" value={totals.total.toFixed(2)} readOnly />
        </div>
      </section>
    </section>
  );
}
