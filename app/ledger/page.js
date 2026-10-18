// app/ledger/page.js  -  looks like the "IT Accessories" Excel sheet
'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/client';
import { fiscalYearOf, fmt, monthLabel, todayStr } from '@/lib/calc';

const FULL = { position: 'relative', left: '50%', width: '100vw', marginLeft: '-50vw', padding: '0 14px', boxSizing: 'border-box' };
const CSS = `
body{overflow-x:hidden}
.lg-sheet{font-family:'Times New Roman',Times,serif;color:#000;background:#fff}
.lg-scroll{overflow:auto;max-height:82vh;border:1px solid #999;background:#fff}
.lg-t{border-collapse:collapse;width:100%;font-size:13px;min-width:1500px}
.lg-t th,.lg-t td{border:1px solid #000;padding:2px 5px;height:23px;white-space:nowrap}
.lg-t th{background:#d9d9d9;text-align:center;font-weight:700;position:sticky;z-index:3}
.lg-t .h1 th{top:0}.lg-t .h2 th{top:24px}
.lg-t td.sl{text-align:center;width:46px;min-width:46px;position:sticky;left:0;background:#fff;z-index:1}
.lg-t td.nm{min-width:330px;position:sticky;left:46px;background:#fff;z-index:1}
.lg-t th.sl{left:0;z-index:4}.lg-t th.nm{left:46px;z-index:4}
.lg-t td.q{text-align:right;min-width:42px}.lg-t td.a{text-align:right;min-width:84px}
.lg-t tr.hl td{background:#ff0!important}
.lg-t tr.fy td{background:#f2f2f2;font-weight:700}
.lg-t tr.cap td{border-left:0;border-right:0;font-weight:700;background:#fff;text-align:left}
.lg-t tr.tt td{font-weight:700;background:#ececec}
.lg-t tbody tr:not(.hl):not(.fy):not(.cap):not(.tt):hover td{background:#eef5ff}
.lg-head{display:flex;justify-content:space-between;align-items:flex-end;padding:6px 2px;font-size:15px}
@media print{@page{size:A4 landscape;margin:6mm}.lg-full{width:100%!important;left:0!important;margin:0!important;padding:0!important}.lg-scroll{max-height:none;overflow:visible;border:0}.lg-t{font-size:8px;min-width:0}.lg-t th,.lg-t td{padding:1px 2px;height:auto;position:static!important}.lg-t td.nm{min-width:0}}
`;

export default function Ledger() {
  const [month, setMonth] = useState(todayStr().slice(0, 7));
  const [fy, setFy] = useState(fiscalYearOf(todayStr().slice(0, 7)));
  const [L, setL] = useState(null); const [err, setErr] = useState('');
  useEffect(() => { api(`/api/ledger?fy=${fy}&month=${month}`).then(setL).catch((e) => setErr(e.message)); }, [fy, month]);
  const n = (v) => (v ? fmt(v).replace('.00', '') : '');
  return (
    <div style={FULL} className="lg-full">
      <style>{CSS}</style>
      <h1 className="noprint">IT Accessories Sheet</h1>
      <div className="card row noprint">
        <label>Fiscal year<select value={fy} onChange={(e) => { setFy(e.target.value); setMonth(e.target.value.slice(0, 4) + '-07'); }}>
          {(L ? L.fiscalYears : [fy]).map((x) => <option key={x}>{x}</option>)}</select></label>
        <label>Month (highlight)<select value={month} onChange={(e) => setMonth(e.target.value)}>{(L ? L.months : []).map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}</select></label>
        <button onClick={() => window.print()}>Print (landscape)</button>
        <a className="btn" href={`/api/export/ledger?fy=${fy}&month=${month}`}>Export to Excel</a>
      </div>
      {err && <div className="err">{err}</div>}
      {L && (
        <div className="lg-sheet">
          <div className="lg-head">
            <div><b>HKD Outdoor Innovations Limited</b><br />Historical Record of &quot;IT Expenses&quot; - IT Accessories, {monthLabel(month).replace(' ', '_')}</div>
            <div style={{ fontSize: 13 }}>All Figure in BDT</div>
          </div>
          <div className="lg-scroll">
            <table className="lg-t">
              <thead>
                <tr className="h1"><th className="sl" rowSpan={2}>Sl. No.</th><th className="nm" rowSpan={2}>Item&apos;s Name</th>
                  {L.months.map((m) => <th key={m} colSpan={2}>{monthLabel(m)}</th>)}<th colSpan={2}>Year-Total</th></tr>
                <tr className="h2">{[...L.months, 'T'].map((m) => [<th key={m + 'q'}>Qty</th>, <th key={m + 'a'}>Amount</th>])}</tr>
              </thead>
              <tbody>
                {L.fyTotals.map((t) => (
                  <tr key={t.fy} className="fy">
                    <td colSpan={2} style={{ textAlign: 'left' }}>For the Year-{t.fy}</td>
                    {L.months.map((m) => t.fy === L.fy
                      ? [<td key={m + 'q'} className="q">{n(L.totals[m].qty)}</td>, <td key={m + 'a'} className="a">{n(L.totals[m].amount)}</td>]
                      : [<td key={m + 'q'} />, <td key={m + 'a'} />])}
                    <td className="q">{n(t.qty)}</td><td className="a">{n(t.amount)}</td>
                  </tr>))}
                <tr className="cap"><td colSpan={2 + L.months.length * 2 + 2}>Expenses Details-{L.fy}</td></tr>
                {L.rows.map((r, i) => (
                  <tr key={r.id} className={r.highlight ? 'hl' : ''}>
                    <td className="sl">{i + 1}</td><td className="nm">{r.name}</td>
                    {L.months.map((m) => { const c = r.cells[m]; const t = c.bills.length ? 'Bill No: ' + c.bills.join(', ') : ''; return [<td key={m + 'q'} className="q" title={t}>{n(c.qty)}</td>, <td key={m + 'a'} className="a" title={t}>{n(c.amount)}</td>]; })}
                    <td className="q">{n(r.totalQty)}</td><td className="a"><b>{n(r.totalAmount)}</b></td>
                  </tr>))}
                <tr className="tt"><td className="sl" /><td className="nm">Total</td>
                  {L.months.map((m) => [<td key={m + 'q'} className="q">{n(L.totals[m].qty)}</td>, <td key={m + 'a'} className="a">{n(L.totals[m].amount)}</td>])}
                  <td className="q">{n(L.totalQty)}</td><td className="a">{n(L.totalAmount)}</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}