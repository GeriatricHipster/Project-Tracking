import { useMemo, useState } from 'react';

const REPORTS = [
  {
    id: 'four-seven',
    title: 'Material (+4.7%)',
    percent: 0.047,
    subtitle: 'Based on the first workbook report.'
  },
  {
    id: 'five-zero',
    title: 'Material (+5.0%)',
    percent: 0.05,
    subtitle: 'Based on the second workbook report.'
  }
];

const initialValues = {
  'four-seven': [6557.743, 736.2, '', '', '', ''],
  'five-zero': [16.32, 2317, '', '', '', '']
};

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function currency(value) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(toNumber(value));
}

function ReportCard({ report, values, onChange }) {
  const totals = useMemo(() => {
    const lineValues = values.map(toNumber);
    const totalBase = lineValues.reduce((sum, value) => sum + value, 0);
    const totalMarkup = lineValues.reduce((sum, value) => sum + (value * report.percent), 0);
    return { totalBase, totalMarkup };
  }, [report.percent, values]);

  return (
    <article className="panel markup-report-card">
      <div className="panel-heading compact-heading">
        <div>
          <h2>{report.title}</h2>
          <p>{report.subtitle}</p>
        </div>
      </div>

      <div className="markup-report-grid">
        <div className="markup-report-grid-header">
          <span>Line item</span>
          <span>Base amount</span>
          <span>Markup</span>
        </div>
        {values.map((value, index) => {
          const markup = toNumber(value) * report.percent;
          return (
            <div className="markup-report-row" key={`${report.id}-${index}`}>
              <label>
                <span className="sr-only">Line item {index + 1}</span>
                <input
                  value={value}
                  onChange={(event) => onChange(index, event.target.value)}
                  placeholder={`Line item ${index + 1}`}
                  type="text"
                />
              </label>
              <div className="markup-report-value">{currency(value)}</div>
              <div className="markup-report-value">{currency(markup)}</div>
            </div>
          );
        })}
        <div className="markup-report-total">
          <strong>Total</strong>
          <strong>{currency(totals.totalBase)}</strong>
          <strong>{currency(totals.totalMarkup)}</strong>
        </div>
      </div>
    </article>
  );
}

export default function MarkupCalculatorPanel() {
  const [reports, setReports] = useState(initialValues);

  function updateValue(reportId, index, value) {
    setReports((current) => {
      const nextValues = [...(current[reportId] || [])];
      nextValues[index] = value;
      return {
        ...current,
        [reportId]: nextValues
      };
    });
  }

  return (
    <section className="dashboard-stack markup-calculator-panel">
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Markup calculator</h2>
            <p>Editable markup worksheet based on the workbook formulas.</p>
          </div>
        </div>

        <div className="markup-report-layout">
          {REPORTS.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              values={reports[report.id] || []}
              onChange={(index, value) => updateValue(report.id, index, value)}
            />
          ))}
        </div>
      </section>
    </section>
  );
}
