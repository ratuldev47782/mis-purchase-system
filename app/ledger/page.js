'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/client';
import { fiscalYearOf, fmt, monthLabel, todayStr } from '@/lib/calc';

export default function Ledger() {
  const [month, setMonth] = useState(todayStr().slice(0, 7));
  const [fy, setFy] = useState(fiscalYearOf(todayStr().slice(0, 7)));
  const [L, setL] = useState(null); const [err, setErr] = useState('');
  useEffect(() => { api(`/api/ledger?fy=${fy}&month=${month}`).then(setL).catch((e) => setErr(e.message)); }, [fy, month]);
  const y = { background: '#ff0' };
  const n = (v) => (v ? fmt(v).replace('.00', '') : '');
  return (
    <><h1>IT Accessories Sheet</h1>
      <style>{'@media print{@page{size:A4 landscape;margin:6mm}table{font-size:8px}}'}</style>
      <div className="card row noprint">
        <label>Fiscal year<select value={fy} onChange={(e) => { setFy(e.target.value); setMonth(e.target.value.slice(0, 4) + '-07'); }}>
          {(L ? L.fiscalYears : [fy]).map((x) => <option key={x}>{x}</option>)}</select></label>
        <label>Month (highlight)<select value={month} onChange={(e) => setMonth(e.target.value)}>{(L ? L.months : []).map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}</select></label>
        <button onClick={() => window.print()}>Print (landscape)</button>
        <a className="btn" href={`/api/export/ledger?fy=${fy}&month=${month}`}>Export to Excel</a>
      </div>
      {err && <div className="err">{err}</div>}
      {L && (
        <>
          <div style={{ textAlign: 'center' }}>
            <b>HKD Outdoor Innovations Limited</b><br />Historical Record of &quot;IT Expenses&quot; - IT Accessories, {monthLabel(month).replace(' ', '_')}<br />All Figure in BDT
          </div>
          <div className="scroll">
            <table style={{ marginTop: 8 }}>
              <thead>
                <tr><th rowSpan={2}>Sl. No.</th><th rowSpan={2}>Item&apos;s Name</th>
                  {L.months.map((m) => <th key={m} colSpan={2}>{monthLabel(m)}</th>)}<th colSpan={2}>Year-Total</th></tr>
                <tr>{[...L.months, 'T'].map((m) => [<th key={m + 'q'}>Qty</th>, <th key={m + 'a'}>Amount</th>])}</tr>
              </thead>
              <tbody>
                {L.rows.map((r, i) => (
                  <tr key={r.id} style={r.highlight ? y : undefined}>
                    <td>{i + 1}</td><td>{r.name}</td>
                    {L.months.map((m) => { const c = r.cells[m]; const t = c.bills.length ? 'Bill No: ' + c.bills.join(', ') : ''; return [<td key={m + 'q'} className="right" title={t}>{n(c.qty)}</td>, <td key={m + 'a'} className="right" title={t}>{n(c.amount)}</td>]; })}
                    <td className="right">{n(r.totalQty)}</td><td className="right"><b>{n(r.totalAmount)}</b></td>
                  </tr>))}
                <tr><td /><td><b>Total</b></td>
                  {L.months.map((m) => [<td key={m + 'q'} className="right"><b>{n(L.totals[m].qty)}</b></td>, <td key={m + 'a'} className="right"><b>{n(L.totals[m].amount)}</b></td>])}
                  <td className="right"><b>{n(L.totalQty)}</b></td><td className="right"><b>{n(L.totalAmount)}</b></td></tr>
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
