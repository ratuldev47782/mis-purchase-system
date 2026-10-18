// app/new/page.js

'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { calcDoc, calcAmount, todayStr } from '@/lib/calc';
import { api } from '@/lib/client';
import RequestForm from '@/app/components/RequestForm';
import CategorySelect from '@/app/components/CategorySelect';
import { paperRows } from '@/lib/paper';

const blank = () => ({ particulars: '', unit: '', qty: '', unitPrice: '', categoryId: '' });
const extraInit = (x) => ({ on: !!(x && x.on), mode: (x && x.mode) || 'amount', value: x && x.value ? x.value : '' });
const n0 = (v) => Number(v) || 0;

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
  // old bills: items without their own category fall back to the bill-level category
  const [items, setItems] = useState(src ? src.items.map((i) => ({ ...i, categoryId: i.categoryId || bill?.categoryId || '' })) : [blank()]);
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

  const addSupplier = async (e) => {
    if (e.target.value !== '__new') return H('supplierId')(e);
    const name = prompt('New supplier name'); if (!name) return;
    try { const r = await api('/api/suppliers', { method: 'POST', body: { name } }); await reloadSuppliers(); setHead({ ...head, supplierId: r.supplier._id }); } catch (x) { setErr(x.message); }
  };

  const submit = async (e) => {
    e.preventDefault(); setErr('');
    const missing = items.findIndex((i) => (i.particulars || i.qty || i.unitPrice) && !i.categoryId);
    if (missing >= 0) { setErr(`Select the Ledger category for item ${missing + 1}`); return; }
    setBusy(true);
    try {
      const r = await api('/api/bills', { method: 'POST', body: {
        kind, billNo: kind === 'resolutionA' ? undefined : bill?.billNo, parentBillNo: kind === 'resolutionA' ? bill.billNo : undefined,
        head, doc: { items, ait: { on: ait }, vat, tax, remarks }, pay } });
      router.push('/bill/' + r.bill.billNo);
    } catch (x) { setErr(x.message); setBusy(false); }
  };

  const total = calc.total;
  const advance = pay.advancePaid === '' ? total : Number(pay.advancePaid);

  // ---- data for the paper form (edited side = live values, other side = saved values) ----
  const mine = {
    items: items.map((i) => ({ particulars: i.particulars, unit: i.unit, qty: n0(i.qty), unitPrice: n0(i.unitPrice), amount: calcAmount(i.qty, i.unitPrice) })),
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
    items, setItem, addRow: () => items.length < 9 && setItems([...items, blank()]), delRow: (i) => setItems(items.filter((_, n) => n !== i)),
    ait, setAit, vat, setVat, tax, setTax, calc, remarks, setRemarks, advanceEditable: kind !== 'resolutionA',
  };

  return (
    <form
      onSubmit={submit}
      className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_17rem] xl:items-start print:block"
    >
      {/* LEFT: the paper / excel style form */}
      <div className="min-w-0">
        <div className="noprint mb-2 text-xs text-slate-500">
          {isRes ? 'Fill the RESOLUTION columns of the form.' : 'Fill the APPLICATION columns of the form.'} Blue cells are inputs, grey cells are read only.
        </div>
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white p-2 shadow-sm print:overflow-visible print:border-0 print:p-0 print:shadow-none">
          <RequestForm d={d} edit={edit} />
        </div>
      </div>

      {/* RIGHT: ledger / summary info + actions (not printed) */}
      <aside className="noprint rounded-xl border border-slate-200 bg-white p-3 shadow-sm xl:sticky xl:top-3 xl:max-h-[calc(100vh-1.5rem)] xl:overflow-y-auto">
        <div className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Ledger / Summary info
        </div>

        <div className="space-y-2.5">
          <label>File Name
            <input
              disabled={lockHead}
              value={head.fileName}
              onChange={H('fileName')}
              placeholder="Processor Motherboard for CAD"
              className="w-full"
            />
          </label>

          <label>Supplier
            <select disabled={lockHead} value={head.supplierId} onChange={addSupplier} className="w-full">
              <option value="">-- select --</option>
              {suppliers.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
              <option value="__new">+ Add new supplier</option>
            </select>
          </label>

          <label>Department / For whom
            <input value={head.department} onChange={H('department')} placeholder="CAD(PC-1)" className="w-full" />
          </label>

          <label>Ledger Month
            <input type="month" value={head.ledgerMonth} onChange={H('ledgerMonth')} className="w-full" />
          </label>

          {/* ledger category of every item row (only used by the IT Accessories ledger, not printed on the form) */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
            <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Ledger category (per item)
            </div>
            <div className="space-y-2">
              {items.map((it, i) => (
                <div key={i}>
                  <div className="truncate text-[11px] text-slate-600" title={it.particulars}>
                    {i + 1}. {it.particulars || '(item name not typed yet)'}
                  </div>
                  <CategorySelect categories={categories} value={it.categoryId} onChange={(v) => setItem(i, 'categoryId', v)} />
                </div>
              ))}
            </div>
          </div>

          {!lockHead && (
            <label>Summary date label (optional)
              <input
                value={head.dateLabel}
                onChange={H('dateLabel')}
                placeholder="1-October-2026(For October)"
                className="w-full"
              />
            </label>
          )}
        </div>

        {err && <div className="err mt-3 text-xs">{err}</div>}

        <div className="mt-3 flex gap-2 border-t border-slate-200 pt-3">
          <button disabled={busy} className="flex-1">{busy ? 'Saving...' : 'Save'}</button>
          <a className="btn sec flex-1 text-center" href={bill ? '/bill/' + bill.billNo : '/summary'}>Cancel</a>
        </div>
      </aside>
    </form>
  );
}


export default function New() {
  const [query, setQuery] = useState(null); const isReady = !!query;
  useEffect(() => { setQuery(Object.fromEntries(new URLSearchParams(window.location.search))); }, []);
  const [data, setData] = useState(null); const [mode, setMode] = useState(''); const [parentNo, setParentNo] = useState('');
  const load = async () => {
    const [suppliers, categories, bills, next] = await Promise.all([api('/api/suppliers'), api('/api/categories'), api('/api/bills'), api('/api/bills/next')]);
    setData({ suppliers, categories, bills, nextBillNo: next.nextBillNo });
  };
  useEffect(() => { if (isReady) load(); }, [isReady]);
  if (!data) return <><h1>New</h1>Loading...</>;

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
          <div className="card noprint">
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Choose the resolution type</div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={mode === 'B' ? '' : 'sec'} onClick={() => setMode('B')}>
                Type B: Direct Resolution (no Application)
              </button>
              <button type="button" className={mode === 'A' ? '' : 'sec'} onClick={() => setMode('A')}>
                Type A: Resolution after an existing Application
              </button>
            </div>
            {mode === 'A' && (
              <select value={parentNo} onChange={(e) => setParentNo(e.target.value)} style={{ marginTop: 8 }}>
                <option value="">-- select Application --</option>
                {data.bills.filter((b) => b.application).map((b) => <option key={b.billNo} value={b.billNo}>{b.title} ({b.stage})</option>)}
              </select>)}
          </div>)}
        {m === 'A' && (parent || find(parentNo)) && <BillForm key={'A' + (parent || find(parentNo)).billNo} kind="resolutionA" bill={parent || find(parentNo)} {...common} />}
        {m === 'B' && <BillForm key={'B' + (edit?.billNo || '')} kind="resolutionB" bill={edit} {...common} />}
      </>
    );
  }
  return (
    <div className="w-full min-w-0">
      <h1 className="noprint !mb-2">
        {type === 'application' ? (query.edit ? 'Edit Application' : 'New Application') : 'Resolution'}
      </h1>
      {body}
    </div>
  );
}