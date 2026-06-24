import { useMemo, useState } from 'react';

function toNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function calcTotal(items, rate) {
  const materialTotal = items.reduce((sum, value) => sum + toNumber(value), 0);
  const markupTotal = materialTotal * toNumber(rate);
  return {
    materialTotal,
    markupTotal
  };
}

function currency(value) {
  return Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 3
  });
}

function ReportCard({ title, rateLabel, initialRate, initialItems }) {
  const [rate, setRate] = useState(String(initialRate));
  const [items, setItems] = useState(initialItems.map((item) => String(item)));

  const summary = useMemo(() => calcTotal(items, rate), [items, rate]);

  return (
    <article className="panel markup-report-card">
      <div className="panel-heading">
        <div>
          <h3>{title}</h3>
          <p>{rateLabel}</p>
        </div>
      </div>

      <div className="markup-grid">
        <label>
          Mark up rate
          <input type="number" step="0.001" value={rate} onChange={(event) => setRate(event.target.value)} />
        </label>

        {items.map((item, index) => (
          <label key={index}>
            Material line {index + 1}
            <input
              type="number"
              step="0.001"
              value={item}
              onChange={(event) => {
                const next = [...items];
                next[index] = event.target.value;
                setItems(next);
              }}
            />
          </label>
        ))}
      </div>

      <div className="markup-summary">
        <div>
          <span>Material total</span>
          <strong>{currency(summary.materialTotal)}</strong>
        </div>
        <div>
          <span>Total mark up</span>
          <strong>{currency(summary.markupTotal)}</strong>
        </div>
      </div>
    </article>
  );
}

export default function MarkupCalculatorPanel() {
  return (
    <section className="dashboard-stack markup-calculator-panel">
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Mark up calculator</h2>
            <p>Built from the workbook formulas: total the material lines, then multiply by the mark up rate.</p>
          </div>
        </div>

        <div className="markup-report-grid">
          <ReportCard
            title="MARK UP REPORT"
            rateLabel="Material (+4.7%)"
            initialRate={0.047}
            initialItems={[6557.743, 736.2, 0, 0, 0, 0]}
          />
          <ReportCard
            title="MARK UP REPORT"
            rateLabel="Material (+5.0%)"
            initialRate={0.05}
            initialItems={[16.32, 2317, 0, 0, 0, 0]}
          />
        </div>
      </section>
    </section>
  );
}
