import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';

const DEFAULT_CALCULATOR = {
  sections: [
    { key: 'material_47', title: 'MATERIAL (+4.7%)', rate: 0.047, items: [6557.743, 736.2, null, null, null, null] },
    { key: 'material_50', title: 'MATERIAL (+5.0%)', rate: 0.05, items: [16.32, 2317, null, null, null, null] }
  ]
};

function normalizeNumber(value) {
  if (value === null || value === undefined || value === '') return '';
  const numeric = Number(value);
  return Number.isFinite(numeric) ? String(numeric) : '';
}

function normalizeCalculator(data) {
  const sections = Array.isArray(data?.sections) ? data.sections : DEFAULT_CALCULATOR.sections;
  return {
    sections: DEFAULT_CALCULATOR.sections.map((fallbackSection, index) => {
      const section = sections[index] && typeof sections[index] === 'object' ? sections[index] : fallbackSection;
      const items = Array.isArray(section.items) ? section.items : fallbackSection.items;
      return {
        key: String(section.key || fallbackSection.key),
        title: String(section.title || fallbackSection.title),
        rate: normalizeNumber(section.rate === undefined || section.rate === null || section.rate === '' ? fallbackSection.rate : section.rate),
        items: Array.from({ length: 6 }, (_, itemIndex) => normalizeNumber(items[itemIndex]))
      };
    })
  };
}

function parseNumeric(value) {
  const numeric = Number(String(value ?? '').replace(/,/g, ''));
  return Number.isFinite(numeric) ? numeric : 0;
}

function formatNumber(value) {
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Number.isFinite(value) ? value : 0);
}

function formatPercent(rateValue) {
  const decimal = parseNumeric(rateValue);
  return decimal ? formatNumber(decimal * 100) : '0.00';
}

function CalculatorSection({ section, index, onRateChange, onItemChange }) {
  const rateDecimal = parseNumeric(section.rate);
  const ratePercent = rateDecimal * 100;

  const itemTotals = section.items.map((item) => parseNumeric(item) * rateDecimal);
  const materialsTotal = section.items.reduce((sum, item) => sum + parseNumeric(item), 0);
  const markupTotal = itemTotals.reduce((sum, total) => sum + total, 0);

  return (
    <article className="markup-section panel">
      <div className="panel-heading compact-heading">
        <div>
          <h3>{section.title}</h3>
          <p>Markup is calculated as line item amount multiplied by the rate.</p>
        </div>
      </div>

      <div className="markup-rate-row">
        <label>
          <span>Rate %</span>
          <input
            className="cms-grid-editor markup-rate-input"
            type="number"
            step="0.1"
            min="0"
            value={formatPercent(section.rate)}
            onChange={(event) => onRateChange(index, String(Number(event.target.value || 0) / 100))}
          />
        </label>
        <div className="markup-rate-summary">
          <strong>{ratePercent.toFixed(1)}%</strong>
          <span>Saved as a decimal rate for calculations.</span>
        </div>
      </div>

      <div className="markup-grid-wrap">
        <table className="markup-grid-table">
          <thead>
            <tr>
              <th>Line</th>
              <th>Amount</th>
              <th>Markup</th>
            </tr>
          </thead>
          <tbody>
            {section.items.map((item, itemIndex) => (
              <tr key={`${section.key}-${itemIndex}`}>
                <th>Line {itemIndex + 1}</th>
                <td>
                  <input
                    className="cms-grid-editor markup-input"
                    inputMode="decimal"
                    type="number"
                    step="0.01"
                    value={item}
                    onChange={(event) => onItemChange(index, itemIndex, event.target.value)}
                  />
                </td>
                <td className="markup-value">{formatNumber(itemTotals[itemIndex])}</td>
              </tr>
            ))}
            <tr className="markup-total-row">
              <th>TOTALS</th>
              <td>{formatNumber(materialsTotal)}</td>
              <td>{formatNumber(markupTotal)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </article>
  );
}

export default function MarkupCalculatorPanel() {
  const [calculator, setCalculator] = useState(DEFAULT_CALCULATOR);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [dirty, setDirty] = useState(false);

  const normalized = useMemo(() => normalizeCalculator(calculator), [calculator]);

  const loadCalculator = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api('/owner/markup-calculator');
      setCalculator(normalizeCalculator(data.calculator || data));
      setDirty(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCalculator();
  }, [loadCalculator]);

  const persistCalculator = useCallback(async (nextCalculator) => {
    setSaving(true);
    setError('');
    try {
      const response = await api('/owner/markup-calculator', {
        method: 'PUT',
        body: { data: normalizeCalculator(nextCalculator) }
      });
      setCalculator(normalizeCalculator(response.calculator?.data || response.calculator || nextCalculator));
      setDirty(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }, []);

  useEffect(() => {
    if (!dirty) return undefined;
    const timer = window.setTimeout(() => {
      persistCalculator(calculator);
    }, 700);
    return () => window.clearTimeout(timer);
  }, [calculator, dirty, persistCalculator]);

  const updateRate = useCallback((sectionIndex, rate) => {
    setCalculator((current) => {
      const next = normalizeCalculator(current);
      next.sections = next.sections.map((section, index) => (index === sectionIndex ? { ...section, rate } : section));
      return next;
    });
    setDirty(true);
  }, []);

  const updateItem = useCallback((sectionIndex, itemIndex, value) => {
    setCalculator((current) => {
      const next = normalizeCalculator(current);
      next.sections = next.sections.map((section, index) => {
        if (index !== sectionIndex) return section;
        const items = [...section.items];
        items[itemIndex] = String(value ?? '');
        return { ...section, items };
      });
      return next;
    });
    setDirty(true);
  }, []);

  return (
    <section className="panel owner-cms-panel markup-calculator-panel">
      <div className="panel-heading">
        <div>
          <h2>Markup Calculator</h2>
          <p>Built from the uploaded workbook formulas. Edit the amounts and rates, and the totals update automatically.</p>
        </div>
        <button className="ghost-button compact" type="button" onClick={loadCalculator} disabled={loading || saving}>
          Refresh
        </button>
      </div>

      {error && <p className="error-box dashboard-error">{error}</p>}
      {loading && <p className="muted">Loading markup calculator...</p>}
      {saving && <p className="muted">Saving...</p>}

      {!loading && (
        <div className="markup-calculator-grid">
          {normalized.sections.map((section, index) => (
            <CalculatorSection
              key={section.key}
              section={section}
              index={index}
              onRateChange={updateRate}
              onItemChange={updateItem}
            />
          ))}
        </div>
      )}
    </section>
  );
}
