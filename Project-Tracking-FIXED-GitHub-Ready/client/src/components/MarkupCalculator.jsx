import { useMemo, useState } from 'react';

const initialReports = [
  {
    title: 'MARK UP REPORT',
    rate: 4.7,
    label: 'MATERIAL (+4.7%)',
    rows: [6557.743, 736.2, '', '', '', '']
  },
  {
    title: 'MARK UP REPORT',
    rate: 5.0,
    label: 'MATERIAL (+5.0%)',
    rows: [16.32, 2317, '', '', '', '']
  }
];

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function currency(value) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD'
  }).format(toNumber(value));
}

function MarkupReport({ report, onChange }) {
  const totalMaterial = useMemo(
    () => report.rows.reduce((sum, row) => sum + toNumber(row), 0),
    [report.rows]
  );

  const lineTotals = report.rows.map((value) => toNumber(value) * (report.rate / 100));
  const totalMarkup = lineTotals.reduce((sum, value) => sum + value, 0);

  return (
    <article className="panel markup-report-card">
      <div className="panel-heading compact-heading">
        <div>
          <h2>{report.title}</h2>
          <p>{report.label}</p>
        </div>
      </div>

      <div className="markup-grid">
        <div className="markup-grid-header">Material</div>
        <div className="markup-grid-header">Line markup</div>
        {report.rows.map((row, index) => (
          <div className="markup-grid-row" key={`${report.label}-${index}`}>
            <input
              className="markup-input"
              type="number"
              step="0.01"
              value={row}
              placeholder="0.00"
              onChange={(event) => onChange(index, event.target.value)}
            />
            <span>{currency(lineTotals[index])}</span>
          </div>
        ))}
        <div className="markup-grid-total-label">Totals</div>
        <div className="markup-grid-total-value">{currency(totalMarkup)}</div>
      </div>

      <div className="markup-summary">
        <div>
          <span>Total material</span>
          <strong>{currency(totalMaterial)}</strong>
        </div>
        <div>
          <span>Markup rate</span>
          <strong>{report.rate.toFixed(1)}%</strong>
        </div>
        <div>
          <span>Total markup</span>
          <strong>{currency(totalMarkup)}</strong>
        </div>
      </div>
    </article>
  );
}

export default function MarkupCalculator() {
  const [reports, setReports] = useState(initialReports);

  function updateReport(reportIndex, rowIndex, value) {
    setReports((current) => {
      const next = [...current];
      const report = next[reportIndex];
      const rows = [...report.rows];
      rows[rowIndex] = value;
      next[reportIndex] = { ...report, rows };
      return next;
    });
  }

  return (
    <section className="dashboard-stack markup-calculator-panel">
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Markup calculator</h2>
            <p>Based on the spreadsheet formulas from your workbook.</p>
          </div>
        </div>

        <div className="markup-calculator-grid">
          {reports.map((report, reportIndex) => (
            <MarkupReport
              key={report.label}
              report={report}
              onChange={(rowIndex, value) => updateReport(reportIndex, rowIndex, value)}
            />
          ))}
        </div>
      </section>
    </section>
  );
}
