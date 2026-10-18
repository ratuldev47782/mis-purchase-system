// app/ledger/page.js

// /ledger            -> old behavior (month highlight)
// /ledger?bill=2164  -> highlights ONLY the category rows of bill 2164
'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/client';
import { fmt, monthLabel } from '@/lib/calc';

const FULL = { position: 'relative', left: '50%', width: '100vw', marginLeft: '-50vw', padding: '0 14px', boxSizing: 'border-box' };
const CSS = `
body{overflow-x:hidden}
.lg-sheet{font-family:'Times New Roman',Times,serif;color:#000;background:#fff}
.lg-scroll{overflow:auto;max-height:82vh;border:1px solid #999;background:#fff}
.lg-t{border-collapse:collapse;width:100%;font-size:13px;min-width:1500px}
.lg-t th,.lg-t td{border:1px solid #000;padding:2px 5px;height:23px;white-space:nowrap}
.lg-t th{background:#d9d9d9;color:#000;text-align:center;font-weight:700;position:sticky;z-index:3}
.lg-t th,.lg-t td{color:#000}
.lg-t .h1 th{top:0}.lg-t .h2 th{top:24px}
.lg-t td.sl{text-align:center;width:46px;min-width:46px;position:sticky;left:0;background:#fff;z-index:1}
.lg-t td.nm{min-width:330px;position:sticky;left:46px;background:#fff;z-index:1}
.lg-t th.sl{left:0;z-index:4}.lg-t th.nm{left:46px;z-index:4}
.lg-t td.q{text-align:right;min-width:42px}.lg-t td.a{text-align:right;min-width:84px}
.lg-t tr.hl td{background:#ff0!important;font-weight:700}
.lg-t tr.fy td{background:#f2f2f2;font-weight:700}
.lg-t tr.cap td{border-left:0;border-right:0;font-weight:700;background:#fff;text-align:left}
.lg-t tr.tt td{font-weight:700;background:#ececec}
.lg-t tbody tr:not(.hl):not(.fy):not(.cap):not(.tt):hover td{background:#eef5ff}
.lg-head{display:flex;justify-content:space-between;align-items:flex-end;padding:6px 2px;font-size:15px}
/* Print: the whole sheet must fit the page width at 100% scale - fixed layout,
   all min-widths reset and column widths pinned, so no scaling in the preview is needed. */
@media print{
  @page{size:A4 landscape;margin:6mm}
  .lg-full{width:100%!important;left:0!important;margin:0!important;padding:0!important}
  .lg-scroll{max-height:none;overflow:visible;border:0}
  .lg-head{padding:4px 2px}
  .lg-t,.lg-t *{-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .lg-t{table-layout:fixed;width:100%;font-size:7px;min-width:0}
  .lg-t th,.lg-t td{padding:0 2px;height:auto;position:static!important;color:#000}
  .lg-t td.sl,.lg-t td.nm,.lg-t td.q,.lg-t td.a{min-width:0}
  .lg-t th.sl,.lg-t td.sl{width:3%}
  .lg-t th.nm,.lg-t td.nm{width:14%;white-space:normal;overflow-wrap:anywhere}
}
`;

export default function Ledger() {
  const [ready, setReady] = useState(false);
  const [bill, setBill] = useState('');
  const [month, setMonth] = useState(null);
  const [fy, setFy] = useState(null);
  const [L, setL] = useState(null); const [err, setErr] = useState('');

  useEffect(() => {
    setBill(new URLSearchParams(window.location.search).get('bill') || '');
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const qs = new URLSearchParams();
    if (fy) qs.set('fy', fy);
    if (month) qs.set('month', month);
    if (bill) qs.set('bill', bill);
    api('/api/ledger?' + qs.toString())
      .then((r) => { setL(r); if (!fy) setFy(r.fy); if (!month) setMonth(r.month); })
      .catch((e) => setErr(e.message));
  }, [ready, fy, month, bill]);

  const exportQs = () => {
    const q = new URLSearchParams();
    if (fy) q.set('fy', fy); if (month) q.set('month', month); if (bill) q.set('bill', bill);
    return q.toString();
  };
  const n = (v) => (v ? fmt(v).replace('.00', '') : '');

  if (!L) return <div style={FULL} className="lg-full">{err ? <div className="err">{err}</div> : 'Loading...'}</div>;

  return (
    <div style={FULL} className="lg-full">
      <style>{CSS}</style>
      <h1 className="noprint">IT Accessories Sheet</h1>
      <div className="card row noprint">
        <label>Fiscal year<select value={fy || L.fy} onChange={(e) => { setFy(e.target.value); setMonth(e.target.value.slice(0, 4) + '-07'); }}>
          {L.fiscalYears.map((x) => <option key={x}>{x}</option>)}</select></label>
        <label>Month<select value={month || L.month} onChange={(e) => setMonth(e.target.value)}>{L.months.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}</select></label>
        {bill && <span className="text-sm">Highlighting Bill MIS-{bill} <a className="btn sec" href="/ledger">Clear</a></span>}
        <button onClick={() => window.print()}>Print (landscape)</button>
        <a className="btn" href={`/api/export/ledger?${exportQs()}`}>Export to Excel</a>
      </div>
      {err && <div className="err">{err}</div>}
      <div className="lg-sheet">
        <div className="lg-head">
          <div><b>HKD Outdoor Innovations Limited</b><br />Historical Record of &quot;IT Expenses&quot; - IT Accessories, {monthLabel(month || L.month).replace(' ', '_')}</div>
          <div style={{ fontSize: 13 }}>All Figure in BDT</div>
        </div>
        <div className="lg-scroll">
          <table className="lg-t">
            {/* fixed % widths: Qty and Amount stay equal-looking but Amount gets room for big totals */}
            <colgroup>
              <col style={{ width: '3%' }} /><col style={{ width: '14%' }} />
              {[...Array(L.months.length + 1)].map((_, i) => [
                <col key={'q' + i} style={{ width: '2.1%' }} />,
                <col key={'a' + i} style={{ width: '4.28%' }} />,
              ])}
            </colgroup>
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
    </div>
  );
}