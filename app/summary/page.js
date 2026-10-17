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
  return (
    <><h1>MIS Purchase Report Summary</h1>
      <div className="tabs noprint" style={{ marginBottom: 8 }}>
        {['All', ...suppliers].map((t) => <button key={t} className={tab === t ? 'on' : 'sec'} onClick={() => setTab(t)}>{t === 'All' ? 'All (Purchase Register)' : t}</button>)}
      </div>
      <div className="cards">
        <div className="card">Total Bills<div className="big">{rows.length}</div></div>
        <div className="card">Total Amount<div className="big">{fmt(sum(rows))}</div></div>
        <div className="card">Total Due<div className="big" style={{ color: '#c00' }}>{fmt(sum(due))}</div></div>
        <div className="card">Total Paid<div className="big">{fmt(sum(paid))}</div></div>
      </div>
      <div className="card row noprint">
        <label>Month<select value={f.month} onChange={(e) => setF({ ...f, month: e.target.value })}><option value="">All</option>{months.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}</select></label>
        <label>Supplier<select value={f.supplier} onChange={(e) => setF({ ...f, supplier: e.target.value })}><option value="">All</option>{suppliers.map((s) => <option key={s}>{s}</option>)}</select></label>
        <label>Status<select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}><option value="">All</option>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select></label>
        <label>Due / Paid<select value={f.pay} onChange={(e) => setF({ ...f, pay: e.target.value })}><option value="">All</option><option>Due</option><option>Paid</option></select></label>
        <label>Search<input value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} placeholder="Bill No, Supplier, Item" /></label>
        <a className="btn" href="/api/export/summary">Export to Excel</a>
        <button className="sec" onClick={() => window.print()}>Print</button>
      </div>
      {err && <div className="err">{err}</div>}
      <div>
        <table className="table-fixed w-full text-xs">
          <thead>
            <tr>
              <th className="y w-[4%]">SL</th><th className="w-[10%]">Purchase Date</th><th className="w-[10%]">Supplier Name</th>
              <th className="w-[21%]">Item Description</th><th className="y w-[9%]">Amount</th><th className="w-[10%]">Department</th>
              <th className="y w-[9%]">Application / Resolution</th><th className="w-[13%]">Status</th>
              <th className="w-[6%]">Purchase No</th><th className="w-[8%]">Due / Paid</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((b) => {
              const mk = monthKeyOf(b.date); const head = mk !== cur; cur = mk;
              // key changes with the data, so the inputs remount and never show stale values
              const ver = `${b.billNo}-${b.summaryAmount}-${b.itemDescription}-${b.status}-${b.department}-${b.dateLabel}`;
              return [
                head && <tr key={'m' + mk} className="month"><td colSpan={10}>{monthName(mk).toUpperCase()}</td></tr>,
                <tr key={ver} className="break-words">
                  <td className="y"><input className="w-full !px-1" defaultValue={b.sl} onBlur={(e) => Number(e.target.value) !== b.sl && patch(b.billNo, { sl: e.target.value })} /></td>
                  <td><input className="w-full !px-1" defaultValue={b.dateLabel} placeholder={formatDate(b.date)} onBlur={(e) => e.target.value !== (b.dateLabel || '') && patch(b.billNo, { dateLabel: e.target.value })} /></td>
                  <td>{b.supplierName}</td>
                  <td><textarea rows={3} className="w-full !px-1" defaultValue={b.itemDescription} onBlur={(e) => e.target.value !== b.itemDescription && patch(b.billNo, { itemDescription: e.target.value })} /></td>
                  <td className="y"><input className="w-full !px-1" defaultValue={b.summaryAmountExpr || b.summaryAmount} title="You can type an expression like 450+950+1100"
                    onBlur={(e) => e.target.value !== String(b.summaryAmountExpr || b.summaryAmount) && patch(b.billNo, { summaryAmountExpr: e.target.value })} /></td>
                  <td><input className="w-full !px-1" defaultValue={b.department} onBlur={(e) => e.target.value !== (b.department || '') && patch(b.billNo, { department: e.target.value })} /></td>
                  <td className="y text-center font-semibold">{stageOf(b)}</td>
                  <td>
  <select className="w-full !px-1" value={b.status} onChange={(e) => patch(b.billNo, { status: e.target.value })}>
    {!STATUSES.includes(b.status) && <option value={b.status}>{b.status}</option>}
    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
  </select>
</td>
                  <td><a href={'/bill/' + b.billNo}>{b.billNo}</a></td>
                  <td className={b.paymentStatus === 'Paid' ? 'paid' : 'due'} onClick={() => toggle(b)} title={b.paidDate ? 'Paid on ' + b.paidDate : ''}>{b.paymentStatus}</td>
                </tr>];
            })}
          </tbody>
        </table>
        
      </div>
      {tab !== 'All' && <p><b>{tab}</b> - Total Due: {fmt(sum(due))}</p>}
    </>
  );
}