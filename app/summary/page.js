// app/summary/page.js

'use client';
import { Fragment, useEffect, useMemo, useState } from 'react';
import { FileText, Pencil, Check, X, Download, Printer, RotateCcw } from 'lucide-react';
import { api } from '@/lib/client';
import { fmt, formatDate, monthKeyOf, monthName, monthLabel } from '@/lib/calc';
import { stageOf } from '@/lib/stage';

const STATUSES = [
  'Application Scan File Uploaded', 'Resolution Scan File Uploaded',
  'File Sent to A/C', 'File Did Not Sent to A/C',
  'Pending ( File Not Given to AC Yet )', 'Pending', 'Done',
];

// special dropdown value: lets the user type their own status / comment
const CUSTOM = '__custom__';

// Where the "View" button goes (Application / Resolution). Change here if your route is different.
const viewHref = (b) => '/bill/' + b.billNo;

// Billing remark: the Resolution remark when there is one, otherwise the Application remark
const remarkOf = (b) => (b.resolution && b.resolution.remarks) || (b.application && b.application.remarks) || '';

// Split an item description into separate items at commas / new lines.
// Commas inside brackets are kept, so "Toner 89 A (With Chip, Black)" stays one item.
const splitItems = (s) => {
  const out = [];
  let cur = '';
  let depth = 0;
  for (const ch of String(s || '')) {
    if (ch === '(') depth++;
    else if (ch === ')') depth = Math.max(0, depth - 1);
    if ((ch === ',' || ch === '\n') && depth === 0) {
      if (cur.trim()) out.push(cur.trim());
      cur = '';
    } else cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
};

/* ---------------- Theme: Flat Teal & Zinc (Tailwind only) ---------------- */
const WRAP = 'whitespace-pre-wrap [overflow-wrap:anywhere]';
const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700/40';

// toolbar buttons (compact height, theme colours)
const TB = `inline-flex h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border px-3 text-[13px] font-medium leading-none disabled:opacity-60 ${focus}`;
const TB_PRI = `${TB} border-teal-800 bg-teal-800 text-white hover:bg-teal-900`;
const TB_SEC = `${TB} border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50`;

// filters
const CTRL = 'h-8 w-full min-w-0 rounded-md border border-zinc-300 bg-white px-2 text-xs text-zinc-900 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/25';

// inline edit inputs
const IN = 'box-border w-full rounded-md border border-zinc-300 bg-white px-1.5 py-1 text-[13px] text-zinc-900 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/25';

// icon buttons
const IB = `inline-flex h-7 w-7 items-center justify-center rounded-md border p-0 disabled:cursor-not-allowed disabled:opacity-40 ${focus}`;
const IB_DEF = `${IB} border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50`;
const IB_OK = `${IB} border-teal-800 bg-teal-800 text-white hover:bg-teal-900`;

// badges: flat, bordered, one accent (teal) + one alert (red), everything else zinc
const BD = 'inline-block max-w-full whitespace-pre-wrap rounded-md border px-2 py-0.5 text-left text-[11.5px] font-medium leading-snug [overflow-wrap:anywhere]';
const statusTone = (s = '') => {
  const x = String(s).toLowerCase();
  if (!x) return 'border-zinc-300 bg-zinc-50 text-zinc-600';
  if (x.includes('did not')) return 'border-red-300 bg-white text-red-700';
  if (x.includes('sent to a/c') || x === 'done') return 'border-teal-700/40 bg-teal-50 text-teal-900';
  return 'border-zinc-300 bg-zinc-50 text-zinc-700'; // pending, uploaded, custom
};
const stageTone = (s) =>
  s === 'Application to Resolution' ? 'border-amber-300 bg-amber-50 text-amber-800'   // in progress
    : s === 'Resolution' ? 'border-teal-800 bg-teal-800 text-white'                    // completed
      : 'border-sky-300 bg-sky-50 text-sky-800';                                       // Application only

// Due / Paid pill
const PAY = `inline-block cursor-pointer rounded-md border px-2.5 py-0.5 text-[11.5px] font-medium leading-snug hover:bg-zinc-50 ${focus}`;
const PAY_DUE = 'border-red-300 bg-white text-red-700 hover:bg-red-50';
const PAY_PAID = 'border-teal-700/40 bg-teal-50 text-teal-900';

// table cells (explicit display utilities so global styles cannot break the table)
// "!" forces the header colours to win over the global `th` styles (dark slate bg, white text)
const TH = 'table-cell break-words !border-x-0 !border-t-0 !border-b !border-solid !border-zinc-700 !bg-zinc-800 px-2 py-2.5 text-left align-middle text-[12px] !font-medium !text-white';
const TD = 'table-cell border-b border-zinc-200 px-2 py-3 align-top text-[13px] text-zinc-800 [overflow-wrap:anywhere]';

const SUB = 'mt-0.5 block text-[11px] font-normal text-zinc-500';
const LINK = 'font-medium text-teal-800 hover:underline';

// column widths (sum = 100%) so the table always fits the screen: no horizontal scroll
const COLS = [
  'w-[3%]', 'w-[7%]', 'w-[9%]', 'w-[15%]', 'w-[8.5%]', 'w-[8%]',
  'w-[8%]', 'w-[11%]', 'w-[11.5%]', 'w-[5%]', 'w-[6.5%]', 'w-[7.5%]',
];

export default function Summary() {
  const [bills, setBills] = useState([]);
  const [f, setF] = useState({
    month: monthKeyOf(new Date()), // default = current month
    supplier: '',
    status: '',
    pay: '',
    q: '',
    billNo: '', // dedicated bill search (searches ALL months)
  });
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

  const currentMonth = monthKeyOf(new Date());

  const resetFilters = () => {
    setF({ month: currentMonth, supplier: '', status: '', pay: '', q: '', billNo: '' });
  };

  const suppliers = useMemo(() => [...new Set(bills.map((b) => b.supplierName).filter(Boolean))], [bills]);

  // current month is always in the selector (even with no bills), newest first
  const months = useMemo(() => {
    const set = new Set(bills.map((b) => monthKeyOf(b.date)).filter(Boolean));
    set.add(currentMonth);
    return [...set].sort().reverse();
  }, [bills, currentMonth]);

  // fixed statuses + any status/comment the user typed on their own (so it can be filtered too)
  const statusOptions = useMemo(() => {
    const extra = [...new Set(bills.map((b) => b.status).filter((s) => s && !STATUSES.includes(s)))];
    return [...STATUSES, ...extra];
  }, [bills]);

  const rows = useMemo(() => {
    // Bill search: look through ALL bills, ignore month/supplier/status filters
    const bq = f.billNo.trim();
    if (bq) {
      const digits = bq.replace(/\D/g, ''); // accepts "2164", "MIS-2164", "#2164"
      return digits ? bills.filter((b) => String(b.billNo).includes(digits)) : [];
    }

    return bills.filter((b) => {
      if (f.month && monthKeyOf(b.date) !== f.month) return false;
      if (f.supplier && b.supplierName !== f.supplier) return false;
      if (f.status && b.status !== f.status) return false;
      if (f.pay && b.paymentStatus !== f.pay) return false;
      if (f.q) {
        const q = f.q.toLowerCase();
        if (!`${b.billNo} ${b.supplierName} ${b.itemDescription}`.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [bills, f]);

  const sum = (arr) => arr.reduce((s, b) => s + (Number(b.summaryAmount) || 0), 0);
  const due = rows.filter((b) => b.paymentStatus !== 'Paid');
  const paid = rows.filter((b) => b.paymentStatus === 'Paid');

  // rows grouped by month (consecutive rows with the same month), each group has its own total
  const groups = useMemo(() => {
    const out = [];
    for (const b of rows) {
      const mk = monthKeyOf(b.date);
      const last = out[out.length - 1];
      if (last && last.mk === mk) last.items.push(b);
      else out.push({ mk, items: [b] });
    }
    return out;
  }, [rows]);

  // automatic serial numbers 1, 2, 3... in the order the rows are shown
  // (continues across month groups and follows the current filters)
  const serial = useMemo(() => new Map(rows.map((b, i) => [b.billNo, i + 1])), [rows]);

  const toggle = (b) => {
    if (editing) return;
    if (b.paymentStatus === 'Due') {
      const d = prompt('Paid date (YYYY-MM-DD)', new Date().toISOString().slice(0, 10));
      if (d) patch(b.billNo, { paymentStatus: 'Paid', paidDate: d });
    } else if (confirm('Switch back to Due?')) patch(b.billNo, { paymentStatus: 'Due' });
  };

  /* ---------- edit mode ---------- */
  // Only Department / Status are editable here. SL is automatic (1, 2, 3...). Supplier Name,
  // Item Description, Amount and the date stay read only: they come from the Application / Resolution form.
  // Status is set automatically when a scan file is uploaded (bill page), and here it can be
  // changed by choosing from the dropdown OR by writing your own text ("Write my own...").
  const startEdit = (b) => {
    if (editing) return;
    const st = b.status || '';
    setEditing(b.billNo);
    setDraft({
      department: b.department || '',
      status: st,
      statusMode: st && !STATUSES.includes(st) ? 'custom' : 'list',
    });
  };
  const cancelEdit = () => { setEditing(null); setDraft({}); };
  const up = (k) => (e) => setDraft((d) => ({ ...d, [k]: e.target.value }));

  const saveEdit = async (b) => {
    const body = {};
    const newStatus = String(draft.status || '').trim();
    if (draft.department !== (b.department || '')) body.department = draft.department;
    if (newStatus !== (b.status || '')) body.status = newStatus;

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

  /* ---------- field renderers: text when viewing, input when editing ---------- */
  const isEd = (b) => editing === b.billNo;

  // SL = automatic row number (1, 2, 3...), never edited
  const vSl = (b) => <span className="tabular-nums">{serial.get(b.billNo)}</span>;

  // Date = the date typed in the Application / Resolution form, so editing the form
  // (date or optional date label) is reflected here automatically. Never edited in Summary.
  const vDate = (b) => (
    <span className={`${WRAP} tabular-nums`}>
      {formatDate(b.date)}
      {b.dateLabel && <span className={SUB}>{b.dateLabel}</span>}
    </span>
  );

  // Read only: change Item Description / Amount in the Application / Resolution form.
  // Shown as a numbered list: 1. Toner 85 A  2. Toner 76 A ...  (one item = plain text)
  const vItem = (b) => {
    const items = splitItems(b.itemDescription);
    if (items.length <= 1) return <span className={WRAP}>{b.itemDescription}</span>;
    return (
      <ol className="m-0 list-none space-y-0.5 p-0">
        {items.map((t, i) => (
          <li key={i} className="flex gap-1.5">
            <span className="shrink-0 tabular-nums text-zinc-500">{i + 1}.</span>
            <span className={`min-w-0 ${WRAP}`}>{t}</span>
          </li>
        ))}
      </ol>
    );
  };

  const vAmount = (b) => (
    <span className="font-semibold tabular-nums text-zinc-900">
      {fmt(b.summaryAmount)}
      {b.summaryAmountExpr && String(b.summaryAmountExpr) !== String(b.summaryAmount) && (
        <span className={`${SUB} break-all`}>{b.summaryAmountExpr}</span>
      )}
    </span>
  );

  const vRemark = (b) => <span className={WRAP}>{remarkOf(b)}</span>;

  const vDept = (b) => (isEd(b)
    ? <input className={IN} value={draft.department} onChange={up('department')} />
    : <span className={WRAP}>{b.department}</span>);

  const vStage = (b) => {
    const s = stageOf(b);
    return <span className={`${BD} ${stageTone(s)}`}>{s}</span>;
  };

  // Status: dropdown of the fixed statuses + "Write my own..." which shows a text box
  const vStatus = (b) => {
    if (!isEd(b)) return b.status ? <span className={`${BD} ${statusTone(b.status)}`}>{b.status}</span> : null;
    const custom = draft.statusMode === 'custom';
    return (
      <div className="space-y-1">
        <select
          className={IN}
          value={custom ? CUSTOM : draft.status}
          onChange={(e) => {
            const v = e.target.value;
            if (v === CUSTOM) {
              setDraft((d) => ({ ...d, statusMode: 'custom', status: STATUSES.includes(d.status) ? '' : d.status }));
            } else {
              setDraft((d) => ({ ...d, statusMode: 'list', status: v }));
            }
          }}
        >
          {!custom && !draft.status && <option value="">Select status</option>}
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          <option value={CUSTOM}>✏️ Write my own...</option>
        </select>
        {custom && (
          <textarea
            className={IN}
            rows={2}
            autoFocus
            value={draft.status}
            onChange={up('status')}
            placeholder="Write your own status / comment"
          />
        )}
      </div>
    );
  };

  const vPay = (b) => (
    <button
      type="button"
      className={`${PAY} ${b.paymentStatus === 'Paid' ? PAY_PAID : PAY_DUE}`}
      onClick={() => toggle(b)}
      title={b.paidDate ? 'Paid on ' + b.paidDate : 'Click to change'}
    >
      {b.paymentStatus}
    </button>
  );

  /* ---------- buttons ---------- */
  const viewBtn = (b) => (
    <a href={viewHref(b)} title="View Application / Resolution" className={IB_DEF}>
      <FileText size={15} />
    </a>
  );

  const editBtns = (b) => (isEd(b) ? (
    <>
      <button type="button" disabled={saving} onClick={() => saveEdit(b)} title="Save" className={IB_OK}>
        <Check size={15} />
      </button>
      <button type="button" disabled={saving} onClick={cancelEdit} title="Cancel" className={IB_DEF}>
        <X size={15} />
      </button>
    </>
  ) : (
    <button
      type="button"
      disabled={!!editing}
      onClick={() => startEdit(b)}
      title={editing ? 'Save or cancel the row you are editing first' : 'Edit this row'}
      className={IB_DEF}
    >
      <Pencil size={14} />
    </button>
  ));

  const subtitle = f.billNo.trim()
    ? `Bill search (all months) · ${rows.length} bill${rows.length === 1 ? '' : 's'}`
    : `${f.month ? monthLabel(f.month) : 'All months'} · ${rows.length} bill${rows.length === 1 ? '' : 's'}`;

  return (
    <div className="w-full min-w-0 text-zinc-900">
      {/* Title + actions */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="!m-0 text-2xl font-semibold text-zinc-900">MIS Purchase Report Summary</h1>
          <p className="mt-0.5 text-sm tabular-nums text-zinc-500">{subtitle}</p>
        </div>
        <div className="flex gap-2 print:hidden">
          <a className={TB_PRI} href="/api/export/summary"><Download size={14} /> Export to Excel</a>
          <button type="button" className={TB_SEC} onClick={() => window.print()}><Printer size={14} /> Print</button>
        </div>
      </div>

      {/* Totals: KPI strip (1px grid lines come from gap-px on a zinc-200 background) */}
      <div className="mb-3 grid grid-cols-2 gap-px border border-zinc-300 bg-zinc-200 sm:grid-cols-4 print:hidden">
        <div className="bg-white px-3 py-2">
          <div className="text-xs text-zinc-500">Bills</div>
          <div className="text-xl font-semibold tabular-nums text-zinc-900">{rows.length}</div>
        </div>
        <div className="bg-white px-3 py-2">
          <div className="text-xs text-zinc-500">Amount</div>
          <div className="text-xl font-semibold tabular-nums text-zinc-900">{fmt(sum(rows))}</div>
        </div>
        <div className="bg-white px-3 py-2">
          <div className="text-xs text-zinc-500">Due</div>
          <div className="text-xl font-semibold tabular-nums text-red-700">{fmt(sum(due))}</div>
        </div>
        <div className="bg-white px-3 py-2">
          <div className="text-xs text-zinc-500">Paid</div>
          <div className="text-xl font-semibold tabular-nums text-teal-800">{fmt(sum(paid))}</div>
        </div>
      </div>

      {/* Filters (one compact toolbar row) */}
      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-md border border-zinc-300 bg-white px-3 py-2 print:hidden">
        <input
          className={`${CTRL} sm:w-28 sm:flex-none`}
          aria-label="Bill No"
          value={f.billNo}
          onChange={(e) => setF({ ...f, billNo: e.target.value })}
          onKeyDown={(e) => {
            // Enter opens the bill directly when exactly one match is found
            if (e.key === 'Enter' && rows.length === 1) window.location.href = viewHref(rows[0]);
          }}
          placeholder="Bill No"
          inputMode="numeric"
        />
        <select className={`${CTRL} sm:w-36 sm:flex-none`} aria-label="Month" value={f.month} onChange={(e) => setF({ ...f, month: e.target.value })}>
          <option value="">All months</option>
          {months.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
        </select>
        <select className={`${CTRL} sm:w-48 sm:flex-none`} aria-label="Supplier" value={f.supplier} onChange={(e) => setF({ ...f, supplier: e.target.value })}>
          <option value="">All (Purchase Register)</option>
          {suppliers.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className={`${CTRL} sm:w-44 sm:flex-none`} aria-label="Status" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>
          <option value="">All statuses</option>
          {statusOptions.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select className={`${CTRL} sm:w-28 sm:flex-none`} aria-label="Due or Paid" value={f.pay} onChange={(e) => setF({ ...f, pay: e.target.value })}>
          <option value="">Due / Paid</option><option>Due</option><option>Paid</option>
        </select>
        <input
          className={`${CTRL} min-w-[160px] flex-1`}
          aria-label="Search"
          value={f.q}
          onChange={(e) => setF({ ...f, q: e.target.value })}
          placeholder="Search bill no, supplier, item"
        />
        <button type="button" className={TB_SEC} onClick={resetFilters} title="Back to current month, no filters">
          <RotateCcw size={13} /> Reset
        </button>
      </div>

      {err && (
        <div className="mb-3 rounded-md border border-l-4 border-zinc-300 border-l-red-700 bg-white px-4 py-2.5 text-sm text-red-700">{err}</div>
      )}

      {/* ===== Desktop / print: table (always fits the screen, no scrolling) ===== */}
      <div className="hidden overflow-hidden rounded-md border border-zinc-300 bg-white [print-color-adjust:exact] xl:block xl:min-h-[calc(100vh-250px)] print:block print:rounded-none print:border-0">
        <table className="table w-full table-fixed border-separate border-spacing-0 text-[13px] leading-snug print:text-[10.5px]">
          <colgroup>
            {COLS.map((w, i) => (
              <col key={i} className={`${w} ${i === COLS.length - 1 ? 'print:hidden' : ''}`} />
            ))}
          </colgroup>
          <thead className="table-header-group bg-zinc-800">
            <tr className="table-row bg-zinc-800">
              <th className={`${TH} text-center`}>SL</th>
              <th className={TH}>Purchase Date</th>
              <th className={TH}>Supplier Name</th>
              <th className={TH}>Item Description</th>
              <th className={`${TH} text-right`}>Amount</th>
              <th className={TH}>Department</th>
              <th className={`${TH} text-center`}>Application / Resolution</th>
              <th className={TH}>Status</th>
              <th className={TH}>Remark</th>
              <th className={`${TH} text-center`}>Purchase No</th>
              <th className={`${TH} text-center`}>Due / Paid</th>
              <th className={`${TH} text-center print:hidden`}>Action</th>
            </tr>
          </thead>
          <tbody className="table-row-group">
            {groups.map((g) => (
              <Fragment key={g.mk || 'none'}>
                <tr className="table-row bg-zinc-100 print:break-inside-avoid">
                  <td colSpan={12} className="table-cell border-b border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700">
                    <div className="flex justify-between gap-3">
                      <span>{monthName(g.mk)}</span>
                      <span className="font-medium tabular-nums text-zinc-500">
                        {g.items.length} bill{g.items.length === 1 ? '' : 's'} · {fmt(sum(g.items))}
                      </span>
                    </div>
                  </td>
                </tr>
                {g.items.map((b) => (
                  <tr
                    key={b.billNo}
                    className={`table-row print:break-inside-avoid ${
                      isEd(b) ? 'bg-teal-50' : 'bg-white hover:bg-zinc-50'
                    }`}
                  >
                    <td className={`${TD} text-center ${isEd(b) ? 'shadow-[inset_3px_0_0_#0f766e]' : ''}`}>{vSl(b)}</td>
                    <td className={TD}>{vDate(b)}</td>
                    <td className={`${TD} ${WRAP}`}>{b.supplierName}</td>
                    <td className={TD}>{vItem(b)}</td>
                    <td className={`${TD} text-right`}>{vAmount(b)}</td>
                    <td className={TD}>{vDept(b)}</td>
                    <td className={`${TD} text-center`}>{vStage(b)}</td>
                    <td className={TD}>{vStatus(b)}</td>
                    <td className={TD}>{vRemark(b)}</td>
                    <td className={`${TD} text-center tabular-nums`}>
                      <a className={LINK} href={'/bill/' + b.billNo}>{b.billNo}</a>
                    </td>
                    <td className={`${TD} text-center`}>{vPay(b)}</td>
                    <td className={`${TD} text-center print:hidden`}>
                      <div className="inline-flex flex-wrap justify-center gap-1">
                        {editBtns(b)}
                        {!isEd(b) && viewBtn(b)}
                      </div>
                    </td>
                  </tr>
                ))}
              </Fragment>
            ))}
            {!rows.length && (
              <tr className="table-row">
                <td colSpan={12} className="table-cell px-4 py-12 text-center text-sm text-zinc-500">No bills found</td>
              </tr>
            )}
          </tbody>
          {!!rows.length && (
            <tfoot className="table-footer-group">
              <tr className="table-row bg-zinc-50">
                <td colSpan={4} className="table-cell border-t border-zinc-300 px-2 py-2 text-xs font-semibold text-zinc-900">
                  Total · {rows.length} bill{rows.length === 1 ? '' : 's'}
                </td>
                <td className="table-cell border-t border-zinc-300 px-2 py-2 text-right text-xs font-semibold tabular-nums text-zinc-900">
                  {fmt(sum(rows))}
                </td>
                <td colSpan={7} className="table-cell border-t border-zinc-300 px-2 py-2 text-xs font-semibold tabular-nums">
                  <span className="text-red-700">Due: {fmt(sum(due))}</span>
                  <span className="mx-2.5 text-zinc-400">|</span>
                  <span className="text-teal-800">Paid: {fmt(sum(paid))}</span>
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* ===== Mobile / tablet: cards ===== */}
      <div className="space-y-3 xl:hidden print:hidden">
        {groups.map((g) => (
          <Fragment key={g.mk || 'none'}>
            <div className="flex items-center justify-between rounded-md border border-zinc-300 bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-700">
              <span>{monthName(g.mk)}</span>
              <span className="font-medium tabular-nums text-zinc-500">{g.items.length} · {fmt(sum(g.items))}</span>
            </div>
            {g.items.map((b) => {
              const lbl = 'text-xs font-medium text-zinc-500';
              return (
                <div
                  key={b.billNo}
                  className={`rounded-md border bg-white p-3 ${
                    isEd(b) ? 'border-teal-700 ring-2 ring-teal-700/25' : 'border-zinc-300'
                  }`}
                >
                  {/* header */}
                  <div className="mb-2 flex items-center justify-between gap-2 ">
                    <div className="min-w-0">
                      <a href={'/bill/' + b.billNo} className={`${LINK} text-sm tabular-nums`}>#{b.billNo}</a>
                      <div className={`text-xs text-zinc-500 ${WRAP}`}>{b.supplierName}</div>
                    </div>
                    {vPay(b)}
                  </div>

                  {/* fields */}
                  <div className="grid grid-cols-2 gap-x-3 gap-y-2 border-t border-zinc-200 pt-2 text-[13px] text-zinc-800 ">
                    <div><div className={lbl}>SL</div>{vSl(b)}</div>
                    <div><div className={lbl}>Purchase Date</div>{vDate(b)}</div>
                    <div className="col-span-2"><div className={lbl}>Item Description</div>{vItem(b)}</div>
                    <div><div className={lbl}>Amount</div>{vAmount(b)}</div>
                    <div><div className={lbl}>Department</div>{vDept(b)}</div>
                    <div className="col-span-2"><div className={lbl}>Status</div>{vStatus(b)}</div>
                    <div className="col-span-2"><div className={lbl}>Remark</div>{vRemark(b)}</div>
                  </div>

                  {/* footer */}
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-200 pt-3">
                    {vStage(b)}
                    <div className="flex gap-1.5">
                      {editBtns(b)}
                      {!isEd(b) && viewBtn(b)}
                    </div>
                  </div>
                </div>
              );
            })}
          </Fragment>
        ))}
        {!rows.length && (
          <div className="rounded-md border border-zinc-300 bg-white px-4 py-12 text-center text-sm text-zinc-500">No bills found</div>
        )}
      </div>

      {f.supplier && (
        <p className="mt-3 text-sm tabular-nums text-zinc-700">
          <b className="font-semibold text-zinc-900">{f.supplier}</b> - Total Due: <span className="text-red-700">{fmt(sum(due))}</span>
        </p>
      )}
    </div>
  );
}