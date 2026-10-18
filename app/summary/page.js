// app/summary/page.js

'use client';
import { Fragment, useEffect, useMemo, useState } from 'react';
import { FileText, Pencil, Check, X } from 'lucide-react';
import { api } from '@/lib/client';
import { fmt, formatDate, monthKeyOf, monthName, monthLabel } from '@/lib/calc';
import { stageOf } from '@/lib/stage';

const STATUSES = [
  'Application Scan File Uploaded', 'Resolution Scan File Uploaded',
  'File Sent to A/C', 'File Did Not Sent to A/C',
  'Pending ( File Not Given to AC Yet )', 'Pending', 'Done',
];

// Where the "View" button goes (Application / Resolution). Change here if your route is different.
const viewHref = (b) => '/bill/' + b.billNo;

const WRAP = 'whitespace-pre-wrap break-words';

export default function Summary() {
  const [bills, setBills] = useState([]);
  const [tab, setTab] = useState('All');
  const [f, setF] = useState({ month: '', supplier: '', status: '', pay: '', q: '' });
  const [err, setErr] = useState('');

  // only ONE row can be in edit mode at a time
  const [editing, setEditing] = useState(null); // billNo
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);

  const load = () => api('/api/bills').then(setBills).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);

  const patch = async (no, body) => {
    try { await api('/api/bills/' + no, { method: 'PATCH', body }); load(); }
    catch (e) { alert(e.message); }
  };

  const suppliers = useMemo(() => [...new Set(bills.map((b) => b.supplierName).filter(Boolean))], [bills]);
  const months = useMemo(() => [...new Set(bills.map((b) => monthKeyOf(b.date)))], [bills]);
  const rows = useMemo(() => bills.filter((b) => {
    if (tab !== 'All' && b.supplierName !== tab) return false;
    if (f.month && monthKeyOf(b.date) !== f.month) return false;
    if (f.supplier && b.supplierName !== f.supplier) return false;
    if (f.status && b.status !== f.status) return false;
    if (f.pay && b.paymentStatus !== f.pay) return false;
    if (f.q) {
      const q = f.q.toLowerCase();
      if (!`${b.billNo} ${b.supplierName} ${b.itemDescription}`.toLowerCase().includes(q)) return false;
    }
    return true;
  }), [bills, tab, f]);

  const sum = (arr) => arr.reduce((s, b) => s + (Number(b.summaryAmount) || 0), 0);
  const due = rows.filter((b) => b.paymentStatus !== 'Paid');
  const paid = rows.filter((b) => b.paymentStatus === 'Paid');

  const toggle = (b) => {
    if (editing) return;
    if (b.paymentStatus === 'Due') {
      const d = prompt('Paid date (YYYY-MM-DD)', new Date().toISOString().slice(0, 10));
      if (d) patch(b.billNo, { paymentStatus: 'Paid', paidDate: d });
    } else if (confirm('Switch back to Due?')) patch(b.billNo, { paymentStatus: 'Due' });
  };

  /* ---------- edit mode ---------- */
  const startEdit = (b) => {
    if (editing) return;
    setEditing(b.billNo);
    setDraft({
      sl: String(b.sl ?? ''),
      dateLabel: b.dateLabel || '',
      itemDescription: b.itemDescription || '',
      summaryAmountExpr: String(b.summaryAmountExpr || b.summaryAmount || ''),
      department: b.department || '',
      status: b.status || '',
    });
  };
  const cancelEdit = () => { setEditing(null); setDraft({}); };
  const up = (k) => (e) => setDraft((d) => ({ ...d, [k]: e.target.value }));

  const saveEdit = async (b) => {
    const body = {};
    if (Number(draft.sl) !== b.sl) body.sl = draft.sl;
    if (draft.dateLabel !== (b.dateLabel || '')) body.dateLabel = draft.dateLabel;
    if (draft.itemDescription !== (b.itemDescription || '')) body.itemDescription = draft.itemDescription;
    if (draft.summaryAmountExpr !== String(b.summaryAmountExpr || b.summaryAmount || '')) body.summaryAmountExpr = draft.summaryAmountExpr;
    if (draft.department !== (b.department || '')) body.department = draft.department;
    if (draft.status !== (b.status || '')) body.status = draft.status;

    if (!Object.keys(body).length) return cancelEdit();
    setSaving(true);
    try {
      await api('/api/bills/' + b.billNo, { method: 'PATCH', body });
      await load();
      cancelEdit();
    } catch (e) {
      alert(e.message); // stay in edit mode so nothing is lost
    } finally {
      setSaving(false);
    }
  };

  const isHead = (i) => i === 0 || monthKeyOf(rows[i - 1].date) !== monthKeyOf(rows[i].date);

  const stat = (label, value, cls = '') => (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-1 text-xl font-bold sm:text-2xl ${cls}`}>{value}</div>
    </div>
  );

  const inp = 'w-full !px-1.5 !py-1 text-[13px]';

  /* ---------- field renderers: text when viewing, input when editing ---------- */
  const isEd = (b) => editing === b.billNo;

  const vSl = (b) => (isEd(b)
    ? <input className={inp} value={draft.sl} onChange={up('sl')} />
    : <span>{b.sl}</span>);

  const vDate = (b) => (isEd(b)
    ? <input className={inp} value={draft.dateLabel} placeholder={formatDate(b.date)} onChange={up('dateLabel')} />
    : <span className={WRAP}>{b.dateLabel || formatDate(b.date)}</span>);

  const vItem = (b) => (isEd(b)
    ? <textarea rows={4} className={inp + ' resize-y'} value={draft.itemDescription} onChange={up('itemDescription')} />
    : <span className={WRAP}>{b.itemDescription}</span>);

  const vAmount = (b) => (isEd(b)
    ? <input className={inp + ' text-right font-semibold'} value={draft.summaryAmountExpr}
        title="You can type an expression like 450+950+1100" onChange={up('summaryAmountExpr')} />
    : (
      <div className="text-right font-semibold">
        {fmt(b.summaryAmount)}
        {b.summaryAmountExpr && String(b.summaryAmountExpr) !== String(b.summaryAmount) && (
          <div className="break-all text-[11px] font-normal text-slate-500">{b.summaryAmountExpr}</div>
        )}
      </div>
    ));

  const vDept = (b) => (isEd(b)
    ? <input className={inp} value={draft.department} onChange={up('department')} />
    : <span className={WRAP}>{b.department}</span>);

  const vStatus = (b) => (isEd(b)
    ? (
      <select className={inp} value={draft.status} onChange={up('status')}>
        {!STATUSES.includes(draft.status) && <option value={draft.status}>{draft.status}</option>}
        {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
    )
    : <span className={WRAP}>{b.status}</span>);

  /* ---------- buttons ---------- */
  const viewBtn = (b) => (
    <a href={viewHref(b)} title="View Application / Resolution"
      className="btn inline-flex items-center justify-center gap-1 !px-2.5 !py-1 text-xs">
      <FileText size={14} /> View
    </a>
  );

  const editBtns = (b) => (isEd(b) ? (
    <>
      <button disabled={saving} onClick={() => saveEdit(b)}
        className="inline-flex items-center justify-center gap-1 !bg-green-600 !px-2.5 !py-1 text-xs hover:!bg-green-700">
        <Check size={14} /> {saving ? 'Saving' : 'Save'}
      </button>
      <button disabled={saving} onClick={cancelEdit}
        className="sec inline-flex items-center justify-center gap-1 !px-2.5 !py-1 text-xs">
        <X size={14} /> Cancel
      </button>
    </>
  ) : (
    <button disabled={!!editing} onClick={() => startEdit(b)}
      title={editing ? 'Save or cancel the row you are editing first' : 'Edit this row'}
      className="sec inline-flex items-center justify-center gap-1 !px-2.5 !py-1 text-xs">
      <Pencil size={14} /> Edit
    </button>
  ));

  return (
    <div className="w-full min-w-0">
      <h1>MIS Purchase Report Summary</h1>

      {/* Supplier tabs */}
      <div className="noprint mb-3 flex flex-wrap gap-1.5">
        {['All', ...suppliers].map((t) => (
          <button key={t} className={tab === t ? '' : 'sec'} onClick={() => setTab(t)}>
            {t === 'All' ? 'All (Purchase Register)' : t}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="mb-3 grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-4">
        {stat('Total Bills', rows.length)}
        {stat('Total Amount', fmt(sum(rows)))}
        {stat('Total Due', fmt(sum(due)), 'text-red-600')}
        {stat('Total Paid', fmt(sum(paid)), 'text-green-700')}
      </div>

      {/* Filters */}
      <div className="card row noprint">
        <label className="min-w-[140px] flex-1 sm:flex-none">Month
          <select value={f.month} onChange={(e) => setF({ ...f, month: e.target.value })}>
            <option value="">All</option>
            {months.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
          </select>
        </label>
        <label className="min-w-[140px] flex-1 sm:flex-none">Supplier
          <select value={f.supplier} onChange={(e) => setF({ ...f, supplier: e.target.value })}>
            <option value="">All</option>
            {suppliers.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
        <label className="min-w-[140px] flex-1 sm:flex-none">Status
          <select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>
            <option value="">All</option>
            {STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
        <label className="min-w-[120px] flex-1 sm:flex-none">Due / Paid
          <select value={f.pay} onChange={(e) => setF({ ...f, pay: e.target.value })}>
            <option value="">All</option><option>Due</option><option>Paid</option>
          </select>
        </label>
        <label className="min-w-[200px] flex-[2]">Search
          <input value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} placeholder="Bill No, Supplier, Item" />
        </label>
        <div className="flex gap-2">
          <a className="btn" href="/api/export/summary">Export to Excel</a>
          <button className="sec" onClick={() => window.print()}>Print</button>
        </div>
      </div>

      {err && <div className="err">{err}</div>}

      {/* ===== Desktop / print: table ===== */}
      <div className="hidden overflow-x-auto rounded-lg border border-slate-200 bg-white xl:block print:block print:overflow-visible">
        <table className="w-full min-w-[1000px] table-fixed text-[13px]">
          <colgroup>
            {[4, 8, 10, 19, 9, 9, 8, 11, 6, 6, 10].map((w, i) => <col key={i} style={{ width: w + '%' }} />)}
          </colgroup>
          <thead>
            <tr>
              <th className="y">SL</th>
              <th>Purchase Date</th>
              <th>Supplier Name</th>
              <th>Item Description</th>
              <th className="y">Amount</th>
              <th>Department</th>
              <th className="y">Application / Resolution</th>
              <th>Status</th>
              <th>Purchase No</th>
              <th>Due / Paid</th>
              <th className="noprint text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((b, i) => {
              const mk = monthKeyOf(b.date);
              return (
                <Fragment key={b.billNo}>
                  {isHead(i) && (
                    <tr className="month"><td colSpan={11}>{monthName(mk).toUpperCase()}</td></tr>
                  )}
                  <tr className={`align-top ${isEd(b) ? 'outline outline-2 -outline-offset-2 outline-blue-400' : ''}`}>
                    <td className="y">{vSl(b)}</td>
                    <td>{vDate(b)}</td>
                    <td className={`px-1.5 ${WRAP}`}>{b.supplierName}</td>
                    <td>{vItem(b)}</td>
                    <td className="y">{vAmount(b)}</td>
                    <td>{vDept(b)}</td>
                    <td className="y text-center font-semibold">{stageOf(b)}</td>
                    <td>{vStatus(b)}</td>
                    <td className="text-center"><a href={'/bill/' + b.billNo}>{b.billNo}</a></td>
                    <td
                      className={(b.paymentStatus === 'Paid' ? 'paid' : 'due') + ' text-center'}
                      onClick={() => toggle(b)}
                      title={b.paidDate ? 'Paid on ' + b.paidDate : ''}
                    >
                      {b.paymentStatus}
                    </td>
                    <td className="noprint">
                      <div className="flex flex-col gap-1">
                        {editBtns(b)}
                        {!isEd(b) && viewBtn(b)}
                      </div>
                    </td>
                  </tr>
                </Fragment>
              );
            })}
            {!rows.length && (
              <tr><td colSpan={11} className="p-6 text-center text-slate-400">No bills found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ===== Mobile / tablet: cards ===== */}
      <div className="space-y-3 xl:hidden print:hidden">
        {rows.map((b, i) => {
          const mk = monthKeyOf(b.date);
          const lbl = 'text-xs font-medium text-slate-500';
          return (
            <Fragment key={b.billNo}>
              {isHead(i) && (
                <div className="rounded-md bg-slate-200 px-3 py-1.5 text-xs font-bold tracking-wide text-slate-700">
                  {monthName(mk).toUpperCase()}
                </div>
              )}
              <div className={`rounded-xl border bg-white p-3 shadow-sm ${isEd(b) ? 'border-blue-400 ring-2 ring-blue-200' : 'border-slate-200'}`}>
                {/* header */}
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <a href={'/bill/' + b.billNo} className="text-sm font-bold">#{b.billNo}</a>
                    <div className={`text-xs text-slate-500 ${WRAP}`}>{b.supplierName}</div>
                  </div>
                  <button
                    onClick={() => toggle(b)}
                    className={`!rounded-full !px-3 !py-1 text-xs font-semibold ${
                      b.paymentStatus === 'Paid'
                        ? '!bg-green-100 !text-green-700 hover:!bg-green-200'
                        : '!bg-red-100 !text-red-700 hover:!bg-red-200'
                    }`}
                  >
                    {b.paymentStatus}
                  </button>
                </div>

                {/* fields */}
                <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-[13px]">
                  <div><div className={lbl}>SL</div>{vSl(b)}</div>
                  <div><div className={lbl}>Purchase Date</div>{vDate(b)}</div>
                  <div className="col-span-2"><div className={lbl}>Item Description</div>{vItem(b)}</div>
                  <div><div className={lbl}>Amount</div>{vAmount(b)}</div>
                  <div><div className={lbl}>Department</div>{vDept(b)}</div>
                  <div className="col-span-2"><div className={lbl}>Status</div>{vStatus(b)}</div>
                </div>

                {/* footer */}
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <span className="rounded bg-yellow-100 px-2 py-1 text-xs font-semibold text-slate-800">
                    {stageOf(b)}
                  </span>
                  <div className="flex gap-2">
                    {editBtns(b)}
                    {!isEd(b) && viewBtn(b)}
                  </div>
                </div>
              </div>
            </Fragment>
          );
        })}
        {!rows.length && (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-slate-400">No bills found</div>
        )}
      </div>

      {tab !== 'All' && <p className="mt-3"><b>{tab}</b> - Total Due: {fmt(sum(due))}</p>}
    </div>
  );
}