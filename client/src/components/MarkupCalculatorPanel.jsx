import { useMemo, useState } from 'react';

const sections = [
  {
    id: 'markup-47',
    title: 'Mark up report',
    rate: 0.047,
    rateLabel: 'Material (+4.7%)',
    totalLabel: 'Total mark up 4.7%',
    inputs: [6557.743, 736.2, '', '', '', '']
  },
  {
    id: 'markup-50',
    title: 'Mark up report',
    rate: 0.05,
    rateLabel: 'Material (+5.0%)',
    totalLabel: 'Total mark up 5.0%',
    inputs: [16.32, 2317, '', '', '', '']
  }
];

function formatMoney(value) {
  const number = Number(value || 0);
  return Number.isFinite(number)
    ? number.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '0.00';
}

function normalizeInput(value) {
  if (value === '') return '';
  const number = Number(value);
  return Number.isFinite(number) ? number : '';
}

function SectionCard({ section }) {
  const [materials, setMaterials] = useState(section.inputs);

  const totals = useMemo(() => {
    const numeric = materials.map((value) => Number(value || 0));
    const materialTotal = numeric.reduce((sum, value) => sum + value, 0);
    const markupTotal = numeric.reduce((sum, value) => sum + value * section.rate, 0);
    const rows = numeric.map((value) => ({ material: value, markup: value * section.rate }));
    return { materialTotal, markupTotal, rows };
  }, [materials, section.rate]);

  return (
    <article className="panel markup-card">
      <div className="panel-heading">
        <div>
          <h2>{section.title}</h2>
          <p>{section.rateLabel} using the workbook formulas.</p>
        </div>
      </div>

      <div className="markup-grid">
        <div className="markup-grid-head">Material amount</div>
        <div className="markup-grid-head">Markup formula</div>
        {materials.map((value, index) => (
          <div className="markup-row" key={`${section.id}-${index}`}>
            <input
              type="number"
              step="0.01"
              value={value}
              onChange={(event) => {
                const next = [...materials];
                next[index] = normalizeInput(event.target.value);
                setMaterials(next);
              }}
              placeholder="Enter amount"
            />
            <output>${formatMoney(totals.rows[index].markup)}</output>
          </div>
        ))}
        <div className="markup-total-label">Totals</div>
        <div className="markup-total-value">
          <strong>${formatMoney(totals.markupTotal)}</strong>
          <small>Material total: ${formatMoney(totals.materialTotal)}</small>
        </div>
      </div>

      <p className="markup-note">{section.totalLabel} = each material amount × {section.rateLabel.replace('Material (+', '').replace('%)', '%')}.</p>
    </article>
  );
}

export default function MarkupCalculatorPanel() {
  return (
    <section className="panel markup-panel">
      <div className="panel-heading">
        <div>
          <h2>Markup calculator</h2>
          <p>Owner-only workbook formulas translated into a quick calculator.</p>
        </div>
      </div>

      <div className="markup-panel-grid">
        {sections.map((section) => (
          <SectionCard key={section.id} section={section} />
        ))}
      </div>
    </section>
  );
}
