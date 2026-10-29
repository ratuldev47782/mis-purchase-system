// app/ledger/page.js

// /ledger            -> old behavior (month highlight)
// /ledger?bill=2164  -> highlights ONLY the category rows of bill 2164
'use client';
import { useEffect, useState } from 'react';
import { Download, Printer } from 'lucide-react';
import { api } from '@/lib/client';
import { fmt, monthLabel } from '@/lib/calc';

/* ---------------- Tailwind class sets ---------------- */
// controls (compact, one row)
const CTRL = 'h-8 min-w-0 rounded-lg border border-slate-300 bg-white px-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200';
const BTN = 'inline-flex h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border px-3 text-xs font-semibold leading-none transition';
const BTN_PRI = `${BTN} border-slate-900 bg-slate-900 text-white hover:bg-slate-800`;
const BTN_SEC = `${BTN} border-slate-300 bg-white text-slate-900 hover:bg-slate-100`;

// sheet cells (black grid like the paper sheet)
const CELL = 'border-b border-r border-black px-1 py-2 text-black print:px-0.5 print:py-0';
const TH = 'border-b border-r border-black bg-neutral-300 px-1 py-1 text-center font-bold leading-tight text-black print:static print:px-0.5 print:py-0';
// sticky header: row 1 = 44px (h-11), row 2 = 28px (h-7), then the "For the Year" row
const STK1 = 'sticky top-0 z-20 h-11';
const STK2 = 'sticky top-11 z-20 h-7';
const NUM = `${CELL} text-right tabular-nums`;

// column widths (sum ~100%) so all 12 months + year total always fit the screen: no scroll
const FIRST_COLS = ['w-[3%]', 'w-[14%]'];
const QTY_COL = 'w-[2.1%]';
const AMT_COL = 'w-[4.28%]';

export default function Ledger() {
  const [ready, setReady] = useState(false);
  const [bill, setBill] = useState('');
  const [month, setMonth] = useState(null);
  const [fy, setFy] = useState(null);
  const [L, setL] = useState(null);
  const [err, setErr] = useState('');

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
    if (fy) q.set('fy', fy);
    if (month) q.set('month', month);
    if (bill) q.set('bill', bill);
    return q.toString();
  };
  const n = (v) => (v ? fmt(v).replace('.00', '') : '');

  if (!L) {
    return (
      <div className="w-full">
        {err
          ? <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>
          : <p className="text-sm text-slate-500">Loading...</p>}
      </div>
    );
  }

  const m = month || L.month;
  const colCount = 2 + L.months.length * 2 + 2;

  return (
    <div className="ledger-print w-full min-w-0 [&_*]:font-[family-name:var(--font-poppins)]">
      {/* paper size + 90% print scale (the one thing Tailwind cannot do) */}
      <style>{'@page{size:A4 landscape;margin:6mm}@media print{.ledger-print{zoom:0.9}}'}</style>

      {/* Title + controls in one compact row */}
      <div className="mb-2 flex flex-wrap items-center gap-2 print:hidden">
        <h1 className="!m-0 mr-auto text-lg font-bold tracking-tight text-slate-900">IT Accessories Sheet</h1>

        <select
          className={CTRL}
          aria-label="Fiscal year"
          value={fy || L.fy}
          onChange={(e) => { setFy(e.target.value); setMonth(e.target.value.slice(0, 4) + '-07'); }}
        >
          {L.fiscalYears.map((x) => <option key={x} value={x}>FY {x}</option>)}
        </select>

        <select className={CTRL} aria-label="Month" value={m} onChange={(e) => setMonth(e.target.value)}>
          {L.months.map((x) => <option key={x} value={x}>{monthLabel(x)}</option>)}
        </select>

        {bill && (
          <span className="inline-flex items-center gap-2 rounded-lg bg-yellow-100 px-2.5 py-1 text-xs font-semibold text-yellow-900">
            Highlighting Bill MIS-{bill}
            <a className="underline hover:no-underline" href="/ledger">Clear</a>
          </span>
        )}

        <button type="button" className={BTN_SEC} onClick={() => window.print()}>
          <Printer size={14} /> Print (landscape)
        </button>
        <a className={BTN_PRI} href={`/api/export/ledger?${exportQs()}`}>
          <Download size={14} /> Export to Excel
        </a>
      </div>

      {err && (
        <div className="mb-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>
      )}

      {/* Sheet heading: logo + company name centered, same look as the Excel export */}
      <div className="mb-1.5 overflow-hidden rounded-t-md border-b-2 border-[#1F3864] [print-color-adjust:exact] print:mb-1 print:rounded-none">
        <div className="flex items-center justify-center gap-2 bg-[#DCE6F1] py-1 print:py-0.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/HKD_LOGO.png" alt="HKD" className="h-9 w-auto print:h-8" />
          <span className="text-base font-bold leading-tight text-[#1F3864] print:text-[14px]">
            HKD Outdoor Innovations Limited
          </span>
        </div>
        <div className="bg-[#EEF3F9] px-2 py-0.5 text-center text-xs leading-tight text-black print:text-[10px]">
          Historical Record of &quot;IT Expenses&quot; - IT Accessories, {monthLabel(m).replace(' ', '_')}
        </div>
        <div className="px-2 py-0.5 text-right text-[10px] italic leading-tight text-slate-600 print:text-[8px]">
          All Figure in BDT
        </div>
      </div>

      {/* ===== Desktop / print: full 12-month sheet, always fits the screen ===== */}
      <div className="hidden border border-slate-400 bg-white text-black [print-color-adjust:exact] lg:block lg:min-h-[calc(100vh-190px)] print:block print:min-h-0 print:border-0">
        <table className="w-full table-fixed border-separate border-spacing-0 border-l border-t border-black font-[family-name:var(--font-poppins)] text-[9.5px] leading-tight xl:text-[10.5px] 2xl:text-xs print:text-[7px]">
          <colgroup>
            {FIRST_COLS.map((w) => <col key={w} className={w} />)}
            {[...Array(L.months.length + 1)].map((_, i) => [
              <col key={'q' + i} className={QTY_COL} />,
              <col key={'a' + i} className={AMT_COL} />,
            ])}
          </colgroup>
          <thead>
            <tr>
              <th className={`${TH} ${STK1}`} rowSpan={2}>Sl. No.</th>
              <th className={`${TH} ${STK1}`} rowSpan={2}>Item&apos;s Name</th>
              {L.months.map((x) => <th key={x} className={`${TH} ${STK1}`} colSpan={2}>{monthLabel(x)}</th>)}
              <th className={`${TH} ${STK1}`} colSpan={2}>Year-Total</th>
            </tr>
            <tr>
              {[...L.months, 'T'].map((x) => [
                <th key={x + 'q'} className={`${TH} ${STK2}`}>Qty</th>,
                <th key={x + 'a'} className={`${TH} ${STK2}`}>Amount</th>,
              ])}
            </tr>
          </thead>
          <tbody>
            {L.fyTotals.map((t) => {
              // the selected fiscal year row stays under the header while scrolling
              const stick = t.fy === L.fy ? 'sticky top-[72px] z-10 print:static' : '';
              const fc = `${CELL} bg-neutral-100 font-bold ${stick}`;
              const fn = `${fc} text-right tabular-nums`;
              return (
                <tr key={t.fy}>
                  <td colSpan={2} className={`${fc} text-left`}>For the Year-{t.fy}</td>
                  {L.months.map((x) => (t.fy === L.fy
                    ? [<td key={x + 'q'} className={fn}>{n(L.totals[x].qty)}</td>, <td key={x + 'a'} className={fn}>{n(L.totals[x].amount)}</td>]
                    : [<td key={x + 'q'} className={fc} />, <td key={x + 'a'} className={fc} />]))}
                  <td className={fn}>{n(t.qty)}</td>
                  <td className={fn}>{n(t.amount)}</td>
                </tr>
              );
            })}

            <tr className="bg-white font-bold">
              <td colSpan={colCount} className="border-b border-r border-black px-1 py-2 text-left">Expenses Details-{L.fy}</td>
            </tr>

            {L.rows.map((r, i) => (
              <tr key={r.id} className={r.highlight ? 'bg-yellow-300 font-bold' : 'bg-white hover:bg-sky-50 print:hover:bg-white'}>
                <td className={`${CELL} text-center`}>{i + 1}</td>
                <td className={`${CELL} whitespace-normal text-left [overflow-wrap:anywhere]`}>{r.name}</td>
                {L.months.map((x) => {
                  const c = r.cells[x];
                  const t = c.bills.length ? 'Bill No: ' + c.bills.join(', ') : '';
                  return [
                    <td key={x + 'q'} className={NUM} title={t}>{n(c.qty)}</td>,
                    <td key={x + 'a'} className={NUM} title={t}>{n(c.amount)}</td>,
                  ];
                })}
                <td className={NUM}>{n(r.totalQty)}</td>
                <td className={`${NUM} font-bold`}>{n(r.totalAmount)}</td>
              </tr>
            ))}

            <tr className="bg-neutral-200 font-bold">
              <td className={CELL} />
              <td className={`${CELL} text-left`}>Total</td>
              {L.months.map((x) => [
                <td key={x + 'q'} className={NUM}>{n(L.totals[x].qty)}</td>,
                <td key={x + 'a'} className={NUM}>{n(L.totals[x].amount)}</td>,
              ])}
              <td className={NUM}>{n(L.totalQty)}</td>
              <td className={NUM}>{n(L.totalAmount)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ===== Mobile / tablet: selected month only (change it with the Month filter) ===== */}
      <div className="overflow-hidden rounded-xl border border-slate-300 bg-white text-black lg:hidden print:hidden">
        <table className="w-full table-fixed border-separate border-spacing-0 border-l border-t border-black font-[family-name:var(--font-poppins)] text-xs leading-snug">
          <colgroup>
            <col className="w-[8%]" /><col className="w-[36%]" /><col className="w-[10%]" /><col className="w-[22%]" /><col className="w-[24%]" />
          </colgroup>
          <thead>
            <tr>
              <th className={TH}>Sl</th>
              <th className={TH}>Item</th>
              <th className={TH}>Qty</th>
              <th className={TH}>{monthLabel(m)}</th>
              <th className={TH}>Year-Total</th>
            </tr>
          </thead>
          <tbody>
            {L.rows.map((r, i) => {
              const c = r.cells[m];
              return (
                <tr key={r.id} className={r.highlight ? 'bg-yellow-300 font-bold' : 'bg-white'}>
                  <td className={`${CELL} text-center`}>{i + 1}</td>
                  <td className={`${CELL} whitespace-normal text-left [overflow-wrap:anywhere]`}>{r.name}</td>
                  <td className={NUM}>{n(c.qty)}</td>
                  <td className={NUM}>{n(c.amount)}</td>
                  <td className={`${NUM} font-bold`}>{n(r.totalAmount)}</td>
                </tr>
              );
            })}
            <tr className="bg-neutral-200 font-bold">
              <td className={CELL} />
              <td className={`${CELL} text-left`}>Total</td>
              <td className={NUM}>{n(L.totals[m].qty)}</td>
              <td className={NUM}>{n(L.totals[m].amount)}</td>
              <td className={NUM}>{n(L.totalAmount)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}