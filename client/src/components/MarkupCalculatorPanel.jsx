import { Fragment, useMemo, useState } from 'react';

const lineLabels = [
  'Material 1',
  'Material 2',
  'Material 3',
  'Material 4',
  'Material 5',
  'Material 6'
];

export default function MarkupCalculatorPanel({ canAccess }) {
  const [values, setValues] = useState(['', '', '', '', '', '']);

  const results = useMemo(() => {
    const numbers = values.map((value) => Number(value || 0));
    const markupRate = 0.05;
    const lines = numbers.map((amount) => Number((amount * markupRate).toFixed(2)));
    const baseTotal = numbers.reduce((sum, amount) => sum + amount, 0);
    const markupTotal = lines.reduce((sum, amount) => sum + amount, 0);
    return { numbers, lines, baseTotal, markupTotal };
  }, [values]);

  if (!canAccess) {
    return (
      <section className="panel">
        <div className="empty-state">
          <h3>Owner access only</h3>
          <p>You do not have permission to view this area.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="panel markup-panel">
      <div className="panel-heading">
        <div>
          <h2>Markup calculator</h2>
          <p>5% markup only, using the workbook formula you provided.</p>
        </div>
      </div>

      <div className="markup-grid">
        <div className="markup-grid-head">Item</div>
        <div className="markup-grid-head">Material</div>
        <div className="markup-grid-head">5% Markup</div>
        {lineLabels.map((label, index) => (
          <Fragment key={label}>
            <div className="markup-grid-cell label">{label}</div>
            <input
              className="markup-grid-cell input"
              type="number"
              min="0"
              step="0.01"
              value={values[index]}
              onChange={(event) => setValues((current) => current.map((item, idx) => (idx === index ? event.target.value : item)))}
            />
            <div className="markup-grid-cell output">${results.lines[index].toFixed(2)}</div>
          </Fragment>
        ))}
        <div className="markup-grid-cell total label">Totals</div>
        <div className="markup-grid-cell total">${results.baseTotal.toFixed(2)}</div>
        <div className="markup-grid-cell total">${results.markupTotal.toFixed(2)}</div>
      </div>
    </section>
  );
}
