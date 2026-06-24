import { useEffect, useMemo, useRef, useState } from 'react';

const MATERIAL_ROWS = 6;
const SECTION_DEFINITIONS = [
  {
    id: 'markup-47',
    title: 'MARK UP REPORT',
    rate: 0.047,
    materialLabel: 'MATERIAL (+4.7%)',
    totalLabel: 'TOTAL MARK UP 4.7%'
  },
  {
    id: 'markup-50',
    title: 'MARK UP REPORT',
    rate: 0.05,
    materialLabel: 'MATERIAL (+5.0%)',
    totalLabel: 'TOTAL MARK UP 5.0%'
  }
];

function blankSectionValues() {
  return Array.from({ length: MATERIAL_ROWS }, () => '');
}

function formatMoney(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '0.00';
  return number.toFixed(2);
}

function FullscreenButton({ targetRef }) {
  const [isFullscreen, setIsFullscreen] = useState(Boolean(document.fullscreenElement));

  useEffect(() => {
    const handleChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', handleChange);
    return () => document.removeEventListener('fullscreenchange', handleChange);
  }, []);

  function toggleFullscreen() {
    const target = targetRef.current;
    if (!target) return;
    if (document.fullscreenElement) {
      document.exitFullscreen?.();
      return;
    }
    target.requestFullscreen?.();
  }

  return (
    <button className="ghost-button compact fullscreen-button" onClick={toggleFullscreen} type="button">
      {isFullscreen ? 'Exit full screen' : 'Full screen'}
    </button>
  );
}

function MarkupSection({ definition, values, onChange }) {
  const totals = useMemo(() => {
    const materials = values.map((value) => Number(value) || 0);
    const markups = materials.map((amount) => amount * definition.rate);
    return {
      materials,
      markups,
      materialTotal: materials.reduce((sum, amount) => sum + amount, 0),
      markupTotal: markups.reduce((sum, amount) => sum + amount, 0)
    };
  }, [definition.rate, values]);

  return (
    <article className="panel markup-section-card">
      <div className="markup-section-header">
        <div>
          <h3>{definition.title}</h3>
          <p>{definition.materialLabel}</p>
        </div>
        <span className="status-pill">Rate {Math.round(definition.rate * 1000) / 10}%</span>
      </div>

      <div className="table-scroll markup-table-wrap">
        <table className="markup-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Material</th>
              <th>{definition.totalLabel}</th>
            </tr>
          </thead>
          <tbody>
            {values.map((value, index) => (
              <tr key={`${definition.id}-${index}`}>
                <td>{index + 1}</td>
                <td>
                  <input
                    className="markup-input"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    type="number"
                    value={value}
                    onChange={(event) => onChange(index, event.target.value)}
                    aria-label={`${definition.materialLabel} row ${index + 1}`}
                  />
                </td>
                <td>{formatMoney(totals.markups[index])}</td>
              </tr>
            ))}
            <tr className="markup-total-row">
              <td colSpan="1">Totals</td>
              <td>{formatMoney(totals.materialTotal)}</td>
              <td>{formatMoney(totals.markupTotal)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </article>
  );
}

export default function MarkupCalculatorPanel() {
  const panelRef = useRef(null);
  const [sections, setSections] = useState(() => SECTION_DEFINITIONS.map(() => blankSectionValues()));

  function updateSection(sectionIndex, rowIndex, value) {
    setSections((current) => {
      const next = current.map((sectionValues) => [...sectionValues]);
      next[sectionIndex][rowIndex] = value;
      return next;
    });
  }

  return (
    <section className="dashboard-stack owner-markup-panel" ref={panelRef}>
      <section className="panel">
        <div className="panel-heading">
          <div className="panel-heading-left">
            <FullscreenButton targetRef={panelRef} />
            <div>
              <h2>Mark up calculator</h2>
              <p>Based on the workbook formulas: enter up to 6 material amounts for each report and the markup total updates automatically.</p>
            </div>
          </div>
        </div>

        <div className="markup-calc-grid">
          {SECTION_DEFINITIONS.map((definition, sectionIndex) => (
            <MarkupSection
              key={definition.id}
              definition={definition}
              values={sections[sectionIndex]}
              onChange={(rowIndex, value) => updateSection(sectionIndex, rowIndex, value)}
            />
          ))}
        </div>
      </section>
    </section>
  );
}
