// app/new/page.js

'use client';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { calcDoc, calcAmount, todayStr, fmt, fiscalMonths, fiscalYearOf, monthKeyOf, monthLabel } from '@/lib/calc';
import { api } from '@/lib/client';
import RequestForm from '@/app/components/RequestForm';
import CategorySelect from '@/app/components/CategorySelect';
import { paperRows } from '@/lib/paper';

const blank = () => ({ particulars: '', unit: '', qty: '', unitPrice: '', categoryId: '' });
// comment row: free text only (no unit / qty / price / category)
const blankComment = () => ({ isComment: true, particulars: '', unit: '', qty: '', unitPrice: '', categoryId: '' });
const extraInit = (x) => ({ on: !!(x && x.on), mode: (x && x.mode) || 'amount', value: x && x.value ? x.value : '' });
const n0 = (v) => Number(v) || 0;
const MAX_GOODS = 9;

/* ---------------- Theme: Flat Teal & Zinc (Tailwind only) ---------------- */
const FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700/40';
const CARD = 'rounded-md border border-zinc-300 bg-white';
const TITLE = 'text-[11px] font-medium uppercase tracking-wide text-zinc-500';
const LBL = 'block text-xs font-medium text-zinc-700';
const INPUT = 'mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/25 disabled:bg-zinc-50 disabled:text-zinc-500';
const BTN = `inline-flex h-9 items-center justify-center whitespace-nowrap rounded-md border px-4 text-[13px] font-medium disabled:cursor-not-allowed disabled:opacity-60 ${FOCUS}`;
const BTN_PRI = `${BTN} border-teal-800 bg-teal-800 text-white hover:bg-teal-900`;
const BTN_SEC = `${BTN} border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50`;
const BTN_SM = `inline-flex h-7 items-center justify-center whitespace-nowrap rounded-md border border-zinc-300 bg-white px-2.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 ${FOCUS}`;

// Type A picker: filter the existing Application bills by F Year, Month and a free text search.
// Defaults to the current month / fiscal year.
function ApplicationPicker({ bills, onPick }) {
  const curMonth = todayStr().slice(0, 7);
  const apps = bills.filter((b) => b.application);
  const monthOf = (b) => monthKeyOf(b.ledgerMonth || b.date);
  const [fy, setFy] = useState(fiscalYearOf(curMonth));
  const [month, setMonth] = useState(curMonth);
  const [q, setQ] = useState('');

  const fyList = [...new Set([fiscalYearOf(curMonth), ...apps.map((b) => fiscalYearOf(monthOf(b))).filter(Boolean)])].sort();
  const months = fiscalMonths(fy);
  const term = q.trim().toLowerCase();
  const rows = apps
    .filter((b) => {
      const mk = monthOf(b);
      if (mk && fiscalYearOf(mk) !== fy) return false;
      if (month && mk !== month) return false;
      if (!term) return true;
      return [b.billNo, 'mis-' + b.billNo, b.fileName, b.title, b.supplierName, b.applicantName, b.department]
        .filter(Boolean).join(' ').toLowerCase().includes(term);
    })
    .sort((a, b) => b.billNo - a.billNo);

  const pickFy = (v) => {
    setFy(v);
    if (month && !fiscalMonths(v).includes(month)) setMonth(fiscalMonths(v)[0]);
  };

  return (
    <div>
      <div className={`mb-2 ${TITLE}`}>
        Find the Application bill
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[10rem_14rem_minmax(0,1fr)]">
        <label className={LBL}>F Year
          <select className={INPUT} value={fy} onChange={(e) => pickFy(e.target.value)}>
            {fyList.map((x) => <option key={x} value={x}>FY {x}</option>)}
          </select>
        </label>
        <label className={LBL}>Month
          <select className={INPUT} value={month} onChange={(e) => setMonth(e.target.value)}>
            <option value="">All months</option>
            {months.map((x) => <option key={x} value={x}>{monthLabel(x)}</option>)}
          </select>
        </label>
        <label className={LBL}>Bill Search
          <input
            className={INPUT}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Bill no, file name, supplier, applicant..."
          />
        </label>
      </div>

      <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-500">
        <span>{rows.length} application bill{rows.length === 1 ? '' : 's'} found</span>
        {(q || month !== curMonth || fy !== fiscalYearOf(curMonth)) && (
          <button
            type="button"
            className={BTN_SM}
            onClick={() => { setQ(''); setFy(fiscalYearOf(curMonth)); setMonth(curMonth); }}
          >
            Reset filters
          </button>
        )}
      </div>

      <div className="mt-1.5 max-h-72 space-y-1.5 overflow-y-auto rounded-md border border-zinc-300 bg-zinc-50 p-1.5">
        {rows.length === 0 && (
          <div className="px-2 py-6 text-center text-xs text-zinc-500">
            No Application bill matches these filters.
          </div>
        )}
        {rows.map((b) => {
          const done = !!b.resolution;
          return (
            <button
              key={b.billNo}
              type="button"
              disabled={done}
              onClick={() => onPick(b.billNo)}
              className={`block w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-left text-zinc-900 hover:border-teal-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:border-zinc-300 disabled:hover:bg-white ${FOCUS}`}
            >
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span className="text-xs font-semibold text-zinc-900">MIS-{b.billNo}</span>
                <span className="min-w-0 flex-1 truncate text-xs font-medium">{b.fileName || '(no file name)'}</span>
                <span className="text-[11px] tabular-nums text-zinc-600">{fmt(n0(b.application.total))}</span>
              </div>
              <div className="mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5 text-[11px] text-zinc-500">
                <span>{monthKeyOf(b.ledgerMonth || b.date) ? monthLabel(monthKeyOf(b.ledgerMonth || b.date)) : 'No month'}</span>
                {b.supplierName && <span>· {b.supplierName}</span>}
                {b.applicantName && <span>· {b.applicantName}</span>}
                {done && <span className="font-medium text-teal-800">· Resolution already added</span>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// kind: 'application' | 'resolutionA' | 'resolutionB'. bill = existing bill (edit / parent application) or null
function BillForm({ kind, bill, suppliers, categories, applicants, nextBillNo, reloadSuppliers }) {
  const router = useRouter();
  const isRes = kind !== 'application';
  const src = !bill ? null : kind === 'application' ? bill.application : kind === 'resolutionA' ? (bill.resolution || bill.application) : bill.resolution;
  const lockHead = kind === 'resolutionA';
  const [head, setHead] = useState({
    fileName: bill?.fileName || '', supplierId: bill?.supplierId || '', applicantName: bill?.applicantName || '',
    sectorLine: bill?.sectorLine || 'MIS/K2', date: bill?.date || todayStr(), dateLabel: bill?.dateLabel || '',
    department: bill?.department || '', nrb: bill?.nrb || { n: 'Y', r: 'Y', b: 'Y' },
    ledgerMonth: bill?.ledgerMonth || todayStr().slice(0, 7),
  });
  // old bills: goods items without their own category fall back to the bill-level category (comment rows have none)
  const [items, setItems] = useState(
    src ? src.items.map((i) => ({ ...i, categoryId: i.isComment ? '' : i.categoryId || bill?.categoryId || '' })) : [blank()]
  );
  const [ait, setAit] = useState(!!(src && src.ait && src.ait.on));
  const [vat, setVat] = useState(extraInit(src && src.vat));
  const [tax, setTax] = useState(extraInit(src && src.tax));

  const [remarks, setRemarks] = useState(bill && kind === 'resolutionA' ? bill.resolution?.remarks || '' : src?.remarks || '');

  const [pay, setPay] = useState({
    advancePaid: bill?.application && kind === 'application' && src ? src.advancePaid : (src && kind === 'resolutionB' ? src.advancePaid : ''),
    paymentDate: src?.paymentDate || '', settleDate: src?.settleDate || '', budgetAccount: src?.budgetAccount || '', budgetRemaining: src?.budgetRemaining || '',
  });
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);

  const doc = { items, ait: { on: ait }, vat, tax };
  const calc = useMemo(() => calcDoc(doc), [items, ait, vat, tax]); // eslint-disable-line
  const setItem = (i, k, v) => setItems(items.map((it, n) => (n === i ? { ...it, [k]: v } : it)));
  const H = (k) => (e) => setHead({ ...head, [k]: e.target.value });
  const goodsCount = items.filter((i) => !i.isComment).length;

  const addSupplier = async (e) => {
    if (e.target.value !== '__new') return H('supplierId')(e);
    const name = prompt('New supplier name'); if (!name) return;
    try { const r = await api('/api/suppliers', { method: 'POST', body: { name } }); await reloadSuppliers(); setHead({ ...head, supplierId: r.supplier._id }); } catch (x) { setErr(x.message); }
  };

  const submit = async (e) => {
    e.preventDefault(); setErr('');
    const missing = items.findIndex((i) => !i.isComment && (i.particulars || i.qty || i.unitPrice) && !i.categoryId);
    if (missing >= 0) { setErr(`Select the Ledger category for item ${missing + 1}`); return; }
    setBusy(true);
    try {
      const r = await api('/api/bills', {
        method: 'POST', body: {
          kind, billNo: kind === 'resolutionA' ? undefined : bill?.billNo, parentBillNo: kind === 'resolutionA' ? bill.billNo : undefined,
          head, doc: { items, ait: { on: ait }, vat, tax, remarks }, pay
        }
      });
      router.push('/bill/' + r.bill.billNo);
    } catch (x) { setErr(x.message); setBusy(false); }
  };

  const total = calc.total;
  const advance = pay.advancePaid === '' ? total : Number(pay.advancePaid);

  // ---- data for the paper form (edited side = live values, other side = saved values) ----
  const mine = {
    items: items.map((i) => (i.isComment
      ? { isComment: true, particulars: i.particulars, unit: '', qty: 0, unitPrice: 0, amount: 0 }
      : { particulars: i.particulars, unit: i.unit, qty: n0(i.qty), unitPrice: n0(i.unitPrice), amount: calcAmount(i.qty, i.unitPrice) })),
    ait: { on: ait, amount: calc.ait.amount }, vat: { ...vat, amount: calc.vat.amount }, tax: { ...tax, amount: calc.tax.amount },
  };
  const A = isRes ? bill?.application || null : mine;
  const R = isRes ? mine : bill?.resolution || null;
  const aTotal = kind === 'resolutionA' ? n0(bill?.application?.advancePaid) : advance;
  const d = {
    billNo: bill?.billNo || nextBillNo || '', date: head.date, applicantName: head.applicantName, sectorLine: head.sectorLine, nrb: head.nrb,
    rows: paperRows(A, R), hasR: !!R,
    total: isRes || !bill?.resolution ? total : bill.resolution.total,
    aTotal, rTotal: R ? (isRes ? total : bill.resolution.total) : 0,
    netApp: !R ? total - advance : null,
    netRes: R ? (isRes ? aTotal - total : bill.resolution.netPayable) : 0,
  };
  const edit = {
    side: isRes ? 'resolution' : 'application', lock: lockHead, head, setHead, pay, setPay, applicants,
    items, setItem, goodsCount,
    // goods rows: max 9. Comment rows: unlimited, not counted.
    addRow: () => goodsCount < MAX_GOODS && setItems([...items, blank()]),
    addComment: () => setItems([...items, blankComment()]),
    delRow: (i) => {
      const rest = items.filter((_, n) => n !== i);
      if (rest.some((x) => !x.isComment)) setItems(rest); // always keep at least one goods row
    },
    ait, setAit, vat, setVat, tax, setTax, calc, remarks, setRemarks, advanceEditable: kind !== 'resolutionA',
  };

  return (
    <form
      onSubmit={submit}
      className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_17rem] xl:items-start print:block"
    >
      {/* LEFT: the paper / excel style form */}
      <div className="min-w-0">
        <div className="noprint mb-2 text-xs text-zinc-500">
          {isRes ? 'Fill the RESOLUTION columns of the form.' : 'Fill the APPLICATION columns of the form.'} Blue cells are inputs, grey cells are read only.
          Use &quot;+ Add comment&quot; for a text-only note row (no unit, qty, price or category).
        </div>
        <div className="overflow-x-auto rounded-md border border-zinc-300 bg-white p-2 print:overflow-visible print:border-0 print:p-0">
          <RequestForm d={d} edit={edit} />
        </div>
      </div>

      {/* RIGHT: ledger / summary info + actions (not printed) */}
      <aside className={`noprint ${CARD} p-3 xl:sticky xl:top-3 xl:max-h-[calc(100vh-1.5rem)] xl:overflow-y-auto`}>
        <div className={`mb-2.5 ${TITLE}`}>
          Ledger / Summary info
        </div>

        <div className="space-y-2.5">
          <label className={LBL}>File Name
            <input
              disabled={lockHead}
              value={head.fileName}
              onChange={H('fileName')}
              placeholder="Processor Motherboard for CAD"
              className={INPUT}
            />
          </label>

          <label className={LBL}>Supplier
            <select disabled={lockHead} value={head.supplierId} onChange={addSupplier} className={INPUT}>
              <option value="">-- select --</option>
              {suppliers.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
              <option value="__new">+ Add new supplier</option>
            </select>
          </label>

          <label className={LBL}>Department / For whom
            <input value={head.department} onChange={H('department')} placeholder="CAD(PC-1)" className={INPUT} />
          </label>

          <label className={LBL}>Ledger Month
            <input type="month" value={head.ledgerMonth} onChange={H('ledgerMonth')} className={INPUT} />
          </label>

          {/* ledger category of every goods row (only used by the IT Accessories ledger, not printed on the form).
              Comment rows are skipped: they have no category. */}
          <div className="rounded-md border border-zinc-300 bg-zinc-50 p-2">
            <div className={`mb-1.5 ${TITLE}`}>
              Ledger category (per item)
            </div>
            <div className="space-y-2">
              {items.map((it, i) => (it.isComment ? null : (
                <div key={i}>
                  <div className="truncate text-[11px] text-zinc-600" title={it.particulars}>
                    {i + 1}. {it.particulars || '(item name not typed yet)'}
                  </div>
                  <CategorySelect categories={categories} value={it.categoryId} onChange={(v) => setItem(i, 'categoryId', v)} />
                </div>
              )))}
            </div>
          </div>

          {!lockHead && (
            <label className={LBL}>Summary date label (optional)
              <input
                value={head.dateLabel}
                onChange={H('dateLabel')}
                placeholder="1-October-2026(For October)"
                className={INPUT}
              />
            </label>
          )}
        </div>

        {err && (
          <div className="mt-3 rounded-md border border-l-4 border-zinc-300 border-l-red-700 bg-white px-3 py-2 text-xs text-red-700">{err}</div>
        )}

        <div className="mt-3 flex gap-2 border-t border-zinc-200 pt-3">
          <button disabled={busy} className={`${BTN_PRI} flex-1`}>{busy ? 'Saving...' : 'Save'}</button>
          <a className={`${BTN_SEC} flex-1`} href={bill ? '/bill/' + bill.billNo : '/summary'}>Cancel</a>
        </div>
      </aside>
    </form>
  );
}

// `query` comes from the URL (via NewRouter below) so it always matches the current link
function New({ query }) {
  const [data, setData] = useState(null); const [mode, setMode] = useState(''); const [parentNo, setParentNo] = useState('');
  const load = async () => {
    const [suppliers, categories, bills, next] = await Promise.all([api('/api/suppliers'), api('/api/categories'), api('/api/bills'), api('/api/bills/next')]);
    setData({ suppliers, categories, bills, nextBillNo: next.nextBillNo });
  };
  useEffect(() => { load(); }, []);
  if (!data) {
    return (
      <div className="w-full min-w-0">
        <h2 className="text-2xl font-semibold text-zinc-900">New</h2>
        <p className="mt-3 text-sm text-zinc-500">Loading...</p>
      </div>
    );
  }

  const type = query.type === 'resolution' ? 'resolution' : 'application';
  const find = (n) => data.bills.find((b) => b.billNo === Number(n));
  const applicants = [...new Set(data.bills.map((b) => b.applicantName).filter(Boolean))];
  const common = { suppliers: data.suppliers, categories: data.categories, applicants, nextBillNo: data.nextBillNo, reloadSuppliers: load };

  let body;
  if (type === 'application') {
    const bill = query.edit ? find(query.edit) : null;
    body = <BillForm key={'app' + (bill?.billNo || '')} kind="application" bill={bill} {...common} />;
  } else {
    const parent = query.parent ? find(query.parent) : null; const edit = query.edit ? find(query.edit) : null;
    const m = parent ? 'A' : edit ? 'B' : mode;
    body = (
      <>
        {!parent && !edit && (
          // hidden (not unmounted) while a bill is selected, so the filters you used stay put
          <div className={`${CARD} noprint mb-3 p-4` + (parentNo ? ' hidden' : '')}>
            <div className={`mb-2 ${TITLE}`}>Choose the resolution type</div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={mode === 'B' ? BTN_PRI : BTN_SEC} onClick={() => setMode('B')}>
                Type B: Direct Resolution (no Application)
              </button>
              <button type="button" className={mode === 'A' ? BTN_PRI : BTN_SEC} onClick={() => setMode('A')}>
                Type A: Resolution after an existing Application
              </button>
            </div>
            {mode === 'A' && (
              <div className="mt-3 border-t border-zinc-200 pt-3">
                <ApplicationPicker bills={data.bills} onPick={(no) => setParentNo(String(no))} />
              </div>)}
          </div>)}
        {m === 'A' && parentNo && !parent && find(parentNo) && (
          <div className="noprint mb-2 flex flex-wrap items-center gap-2 text-xs text-zinc-600">
            <span>
              Application selected: <b className="text-zinc-900">MIS-{find(parentNo).billNo}</b>
              {find(parentNo).fileName ? ' · ' + find(parentNo).fileName : ''}
            </span>
            <button type="button" className={BTN_SM} onClick={() => setParentNo('')}>
              Change
            </button>
          </div>)}
        {m === 'A' && (parent || find(parentNo)) && <BillForm key={'A' + (parent || find(parentNo)).billNo} kind="resolutionA" bill={parent || find(parentNo)} {...common} />}
        {m === 'B' && <BillForm key={'B' + (edit?.billNo || '')} kind="resolutionB" bill={edit} {...common} />}
      </>
    );
  }
  return (
    <div className="w-full min-w-0">
      <h2 className="noprint mb-3 text-2xl font-semibold text-zinc-900">
        {type === 'application' ? (query.edit ? 'Edit Application' : 'New Application') : 'Resolution'}
      </h2>
      {body}
    </div>
  );
}

// Reads the live URL query. key = full query string, so ANY change in the link
// (application <-> resolution, edit=, parent=) remounts <New> with fresh state.
function NewRouter() {
  const sp = useSearchParams();
  const query = Object.fromEntries(sp.entries());
  return <New key={sp.toString()} query={query} />;
}

// useSearchParams needs a Suspense boundary for production builds
export default function Page() {
  return (
    <Suspense fallback={<p className="text-sm text-zinc-500">Loading...</p>}>
      <NewRouter />
    </Suspense>
  );
}