import { useMemo, useState } from 'react';

const workbookSections = [
  {
    id: '47',
    title: 'MARK UP REPORT',
    subtitle: 'MATERIAL (+4.7%)',
    rateLabel: 'TOTAL MARK UP 4.7%',
    rate: 0.047,
    sample: [6557.743, 736.2, '', '', '', '']
  },
  {
    id: '50',
    title: 'MARK UP REPORT',
    subtitle: 'MATERIAL (+5.0%)',
    rateLabel: 'TOTAL MARK UP 5.0%',
    rate: 0.05,
    sample: [16.32, 2317, '', '', '', '']
  }
];

function formatCurrency(value) {
  if (!Number.isFinite(value)) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

function parseAmount(value) {
  const number = Number(String(value).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(number) ? number : 0;
}

export default function MarkupCalculatorPanel() {
  const [sections, setSections] = useState(() => (
    workbookSections.map((section) => ({
      ...section,
      rows: [...section.sample]
    }))
  ));

  const summary = useMemo(() => sections.map((section) => {
    const values = section.rows.map(parseAmount);
    const baseTotal = values.reduce((total, value) => total + value, 0);
    const markupTotal = values.reduce((total, value) => total + (value * section.rate), 0);
    return {
      ...section,
      baseTotal,
      markupTotal,
      lineItems: values.map((value) => ({
        material: value,
        markup: value * section.rate
      }))
    };
  }), [sections]);

  function updateRow(sectionId, rowIndex, value) {
    setSections((current) => current.map((section) => {
      if (section.id !== sectionId) return section;
      const rows = [...section.rows];
      rows[rowIndex] = value;
      return { ...section, rows };
    }));
  }

  function resetSection(sectionId) {
    setSections((current) => current.map((section) => (
      section.id === sectionId ? { ...section, rows: [...section.sample] } : section
    )));
  }

  return (
    <section className="dashboard-stack markup-calculator-panel">
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Markup calculator</h2>
            <p>Mirrors the formulas in the uploaded Mark Up Calc workbook.</p>
          </div>
        </div>

        <div className="markup-grid">
          {summary.map((section) => (
            <article className="markup-card panel" key={section.id}>
              <div className="panel-heading compact-heading">
                <div>
                  <h3>{section.title}</h3>
                  <p>{section.subtitle}</p>
                </div>
                <button className="ghost-button compact" type="button" onClick={() => resetSection(section.id)}>
                  Reset values
                </button>
              </div>

              <div className="markup-table-wrap">
                <table className="markup-table">
                  <thead>
                    <tr>
                      <th>Line</th>
                      <th>Material</th>
                      <th>Formula</th>
                      <th>Markup</th>
                    </tr>
                  </thead>
                  <tbody>
                    {section.lineItems.map((line, index) => (
                      <tr key={`${section.id}-${index}`}>
                        <td>{index + 1}</td>
                        <td>
                          <input
                            type="number"
                            step="0.01"
                            value={section.rows[index]}
                            onChange={(event) => updateRow(section.id, index, event.target.value)}
                            placeholder="0.00"
                          />
                        </td>
                        <td className="markup-formula">= material × {section.rateLabel.replace('TOTAL MARK UP ', '')}</td>
                        <td>{formatCurrency(line.markup)}</td>
                      </tr>
                    ))}
                    <tr className="markup-total-row">
                      <td>Total</td>
                      <td>{formatCurrency(section.baseTotal)}</td>
                      <td>{section.rateLabel}</td>
                      <td>{formatCurrency(section.markupTotal)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
