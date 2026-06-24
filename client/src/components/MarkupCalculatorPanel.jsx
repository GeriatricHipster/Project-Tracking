import { useMemo, useState } from 'react';

const sections = [
  { key: 'markup_47', title: 'Material (+4.7%)', rate: 0.047, suffix: '4.7%' },
  { key: 'markup_50', title: 'Material (+5.0%)', rate: 0.05, suffix: '5.0%' }
];

function currency(value) {
  const num = Number(value || 0);
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2
  }).format(Number.isFinite(num) ? num : 0);
}

function blankSection() {
  return Array.from({ length: 6 }, () => '');
}

function calcTotals(values, rate) {
  const amounts = values.map((value) => Number(value || 0));
  const materialTotal = amounts.reduce((sum, value) => sum + value, 0);
  const markupTotal = amounts.reduce((sum, value) => sum + value * rate, 0);
  return {
    materialTotal,
    markupTotal,
    grandTotal: materialTotal + markupTotal,
    lineMarkups: amounts.map((value) => value * rate)
  };
}

export default function MarkupCalculatorPanel() {
  const [sectionsState, setSectionsState] = useState({
    markup_47: blankSection(),
    markup_50: blankSection()
  });

  const totals = useMemo(() => {
    return sections.reduce((acc, section) => {
      acc[section.key] = calcTotals(sectionsState[section.key], section.rate);
      return acc;
    }, {});
  }, [sectionsState]);

  function updateValue(sectionKey, index, value) {
    setSectionsState((current) => {
      const next = { ...current };
      const sectionValues = [...next[sectionKey]];
      sectionValues[index] = value;
      next[sectionKey] = sectionValues;
      return next;
    });
  }

  function resetSection(sectionKey) {
    setSectionsState((current) => ({
      ...current,
      [sectionKey]: blankSection()
    }));
  }

  return (
    <section className="dashboard-stack">
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Markup calculator</h2>
            <p>Built from the workbook formulas: material amount multiplied by 4.7% and 5.0%, then totaled.</p>
          </div>
        </div>

        <div className="markup-grid">
          {sections.map((section) => {
            const totalsForSection = totals[section.key] || calcTotals(sectionsState[section.key], section.rate);
            return (
              <article className="markup-card" key={section.key}>
                <div className="markup-card-header">
                  <div>
                    <h3>{section.title}</h3>
                    <p>Rate: {section.suffix}</p>
                  </div>
                  <button className="ghost-button compact" type="button" onClick={() => resetSection(section.key)}>Clear</button>
                </div>

                <div className="markup-lines">
                  {sectionsState[section.key].map((value, index) => (
                    <label className="markup-line" key={`${section.key}-${index}`}>
                      <span>Line {index + 1}</span>
                      <input
                        inputMode="decimal"
                        placeholder="0.00"
                        value={value}
                        onChange={(event) => updateValue(section.key, index, event.target.value)}
                      />
                      <small>{currency(totalsForSection.lineMarkups[index])}</small>
                    </label>
                  ))}
                </div>

                <div className="markup-totals">
                  <div>
                    <span>Material total</span>
                    <strong>{currency(totalsForSection.materialTotal)}</strong>
                  </div>
                  <div>
                    <span>Markup total</span>
                    <strong>{currency(totalsForSection.markupTotal)}</strong>
                  </div>
                  <div>
                    <span>Grand total</span>
                    <strong>{currency(totalsForSection.grandTotal)}</strong>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </section>
  );
}
