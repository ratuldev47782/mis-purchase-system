// app/summary/page.js

'use client';
import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/client';
import { fmt, formatDate, monthKeyOf, monthName, monthLabel } from '@/lib/calc';
import { stageOf } from '@/lib/stage';

const STATUSES = [
  'Application Scan File Uploaded', 'Resolution Scan File Uploaded',
  'File Sent to A/C', 'File Did Not Sent to A/C',
  'Pending ( File Not Given to AC Yet )', 'Pending', 'Done',
];

// Break out of the narrow page container so the table can use the whole screen width.
const FULL = { position: 'relative', left: '50%', width: '100vw', marginLeft: '-50vw', padding: '0 14px', boxSizing: 'border-box' };

export default function Summary() {
  const [bills, setBills] = useState([]); const [tab, setTab] = useState('All');
  const [f, setF] = useState({ month: '', supplier: '', status: '', pay: '', q: '' }); const [err, setErr] = useState('');
  const load = () => api('/api/bills').then(setBills).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);
  const patch = async (no, body) => { try { await api('/api/bills/' + no, { method: 'PATCH', body }); load(); } catch (e) { alert(e.message); } };

  const suppliers = useMemo(() => [...new Set(bills.map((b) => b.supplierName).filter(Boolean))], [bills]);
  const months = useMemo(() => [...new Set(bills.map((b) => monthKeyOf(b.date)))], [bills]);
  const rows = useMemo(() => bills.filter((b) => {
    if (tab !== 'All' && b.supplierName !== tab) return false;
    if (f.month && monthKeyOf(b.date) !== f.month) return false;
    if (f.supplier && b.supplierName !== f.supplier) return false;
    if (f.status && b.status !== f.status) return false;
    if (f.pay && b.paymentStatus !== f.pay) return false;
    if (f.q) { const q = f.q.toLowerCase(); if (!`${b.billNo} ${b.supplierName} ${b.itemDescription}`.toLowerCase().includes(q)) return false; }
    return true;
  }), [bills, tab, f]);
  const sum = (arr) => arr.reduce((s, b) => s + (Number(b.summaryAmount) || 0), 0);
  const due = rows.filter((b) => b.paymentStatus !== 'Paid'); const paid = rows.filter((b) => b.paymentStatus === 'Paid');

  const toggle = (b) => {
    if (b.paymentStatus === 'Due') { const d = prompt('Paid date (YYYY-MM-DD)', new Date().toISOString().slice(0, 10)); if (d) patch(b.billNo, { paymentStatus: 'Paid', paidDate: d }); }
    else if (confirm('Switch back to Due?')) patch(b.billNo, { paymentStatus: 'Due' });
  };
  let cur = '';
  const stat = (label, value, cls = '') => (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${cls}`}>{value}</div>
    </div>
  );
  const inp = 'w-full !px-1.5 !py-1 text-[13px]';
  return (
    <div style={FULL} className="summary-full">
      <style>{'body{overflow-x:hidden}.summary-full th{position:sticky;top:0;z-index:2}@media print{.summary-full{width:100%!important;left:0!important;margin:0!important;padding:0!important}.sum-scroll{max-height:none!important;overflow:visible!important}}'}</style>
      <h1>MIS Purchase Report Summary</h1>
      <div className="tabs noprint flex flex-wrap gap-1" style={{ marginBottom: 10 }}>
        {['All', ...suppliers].map((t) => <button key={t} className={tab === t ? 'on' : 'sec'} onClick={() => setTab(t)}>{t === 'All' ? 'All (Purchase Register)' : t}</button>)}
      </div>
      <div className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stat('Total Bills', rows.length)}
        {stat('Total Amount', fmt(sum(rows)))}
        {stat('Total Due', fmt(sum(due)), 'text-red-600')}
        {stat('Total Paid', fmt(sum(paid)), 'text-green-700')}
      </div>
      <div className="card row noprint">
        <label>Month<select value={f.month} onChange={(e) => setF({ ...f, month: e.target.value })}><option value="">All</option>{months.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}</select></label>
        <label>Supplier<select value={f.supplier} onChange={(e) => setF({ ...f, supplier: e.target.value })}><option value="">All</option>{suppliers.map((s) => <option key={s}>{s}</option>)}</select></label>
        <label>Status<select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}><option value="">All</option>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select></label>
        <label>Due / Paid<select value={f.pay} onChange={(e) => setF({ ...f, pay: e.target.value })}><option value="">All</option><option>Due</option><option>Paid</option></select></label>
        <label style={{ flex: 1, minWidth: 200 }}>Search<input value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} placeholder="Bill No, Supplier, Item" /></label>
        <a className="btn" href="/api/export/summary">Export to Excel</a>
        <button className="sec" onClick={() => window.print()}>Print</button>
      </div>
      {err && <div className="err">{err}</div>}
      <div className="sum-scroll max-h-[78vh] overflow-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full min-w-[1280px] table-fixed text-[13px]">
          <colgroup>
            {[4, 9, 11, 25, 10, 10, 8, 13, 5, 5].map((w, i) => <col key={i} style={{ width: w + '%' }} />)}
          </colgroup>
          <thead>
            <tr>
              <th className="y">SL</th><th>Purchase Date</th><th>Supplier Name</th>
              <th>Item Description</th><th className="y">Amount</th><th>Department</th>
              <th className="y">Application / Resolution</th><th>Status</th>
              <th>Purchase No</th><th>Due / Paid</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((b) => {
              const mk = monthKeyOf(b.date); const head = mk !== cur; cur = mk;
              // key changes with the data, so the inputs remount and never show stale values
              const ver = `${b.billNo}-${b.summaryAmount}-${b.itemDescription}-${b.status}-${b.department}-${b.dateLabel}`;
              return [
                head && <tr key={'m' + mk} className="month"><td colSpan={10}>{monthName(mk).toUpperCase()}</td></tr>,
                <tr key={ver} className="break-words align-top">
                  <td className="y"><input className={inp} defaultValue={b.sl} onBlur={(e) => Number(e.target.value) !== b.sl && patch(b.billNo, { sl: e.target.value })} /></td>
                  <td><input className={inp} defaultValue={b.dateLabel} placeholder={formatDate(b.date)} onBlur={(e) => e.target.value !== (b.dateLabel || '') && patch(b.billNo, { dateLabel: e.target.value })} /></td>
                  <td className="px-1.5">{b.supplierName}</td>
                  <td><textarea rows={3} className={inp + ' resize-y'} defaultValue={b.itemDescription} onBlur={(e) => e.target.value !== b.itemDescription && patch(b.billNo, { itemDescription: e.target.value })} /></td>
                  <td className="y"><input className={inp + ' text-right font-semibold'} defaultValue={b.summaryAmountExpr || b.summaryAmount} title="You can type an expression like 450+950+1100"
                    onBlur={(e) => e.target.value !== String(b.summaryAmountExpr || b.summaryAmount) && patch(b.billNo, { summaryAmountExpr: e.target.value })} /></td>
                  <td><input className={inp} defaultValue={b.department} onBlur={(e) => e.target.value !== (b.department || '') && patch(b.billNo, { department: e.target.value })} /></td>
                  <td className="y text-center font-semibold">{stageOf(b)}</td>
                  <td>
                    <select className={inp} value={b.status} onChange={(e) => patch(b.billNo, { status: e.target.value })}>
                      {!STATUSES.includes(b.status) && <option value={b.status}>{b.status}</option>}
                      {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="text-center"><a href={'/bill/' + b.billNo}>{b.billNo}</a></td>
                  <td className={(b.paymentStatus === 'Paid' ? 'paid' : 'due') + ' cursor-pointer text-center'} onClick={() => toggle(b)} title={b.paidDate ? 'Paid on ' + b.paidDate : ''}>{b.paymentStatus}</td>
                </tr>];
            })}
            {!rows.length && <tr><td colSpan={10} className="p-6 text-center text-slate-400">No bills found</td></tr>}
          </tbody>
        </table>
      </div>
      {tab !== 'All' && <p><b>{tab}</b> - Total Due: {fmt(sum(due))}</p>}
    </div>
  );
}