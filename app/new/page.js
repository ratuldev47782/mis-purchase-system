// app/new/page.js

'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { calcDoc, calcAmount, numberToWords, fmt, todayStr } from '@/lib/calc';
import { api } from '@/lib/client';

const blank = () => ({ particulars: '', unit: '', qty: '', unitPrice: '' });
const extraInit = (x) => ({ on: !!(x && x.on), mode: (x && x.mode) || 'amount', value: x && x.value ? x.value : '' });

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
    ledgerMonth: bill?.ledgerMonth || todayStr().slice(0, 7), categoryId: bill?.categoryId || (categories[0] ? String(categories[0]._id) : ''),
  });
  const [items, setItems] = useState(src ? src.items.map((i) => ({ ...i })) : [blank()]);
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
    e.preventDefault(); setErr(''); setBusy(true);
    try {
      const r = await api('/api/bills', { method: 'POST', body: {
        kind, billNo: kind === 'resolutionA' ? undefined : bill?.billNo, parentBillNo: kind === 'resolutionA' ? bill.billNo : undefined,
        head, doc: { items, ait: { on: ait }, vat, tax, remarks }, pay } });
      router.push('/bill/' + r.bill.billNo);
    } catch (x) { setErr(x.message); setBusy(false); }
  };

  const total = calc.total;
  const advance = pay.advancePaid === '' ? total : Number(pay.advancePaid);
  return (
    <form onSubmit={submit}>
      <div className="card row">
        <label>Bill No<input disabled value={bill?.billNo || nextBillNo || ''} style={{ width: 90 }} /></label>
        <label>File Name<input disabled={lockHead} value={head.fileName} onChange={H('fileName')} style={{ width: 260 }} placeholder="Processor Motherboard for CAD" /></label>
        <label>Supplier
          <select disabled={lockHead} value={head.supplierId} onChange={addSupplier}>
            <option value="">-- select --</option>
            {suppliers.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
            <option value="__new">+ Add new supplier</option>
          </select></label>
        <label>Date<input type="date" disabled={lockHead} value={head.date} onChange={H('date')} /></label>
        <label>Applicant Name<input list="applicants" disabled={lockHead} value={head.applicantName} onChange={H('applicantName')} /></label>
        <datalist id="applicants">{applicants.map((a) => <option key={a} value={a} />)}</datalist>
        <label>Sector/Line<input disabled={lockHead} value={head.sectorLine} onChange={H('sectorLine')} style={{ width: 90 }} /></label>
        {['n', 'r', 'b'].map((k) => (
          <label key={k}>{k.toUpperCase()}<input disabled={lockHead} style={{ width: 30 }} value={head.nrb[k]} onChange={(e) => setHead({ ...head, nrb: { ...head.nrb, [k]: e.target.value } })} /></label>))}
      </div>
      <div className="card row">
        <label style={{ flex: 1 }}>Department / For whom<input value={head.department} onChange={H('department')} placeholder='CAD(PC-1)' /></label>
        <label>Ledger Month<input type="month" value={head.ledgerMonth} onChange={H('ledgerMonth')} /></label>
        <label>Category<select value={head.categoryId} onChange={H('categoryId')}>{categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}</select></label>
        {!lockHead && <label>Summary date label (optional)<input value={head.dateLabel} onChange={H('dateLabel')} placeholder="1-Octobar-2026(For Octobar)" /></label>}
      </div>

      <div className="card">
        <b>{isRes ? 'Resolution items' : 'Application items'}</b>
        <table style={{ marginTop: 6 }}>
          <thead><tr><th>#</th><th>Particulars - Goods/Services</th><th>Unit</th><th>Qty</th><th>U/P</th><th>Amount</th><th></th></tr></thead>
          <tbody>
            {items.map((it, i) => (
              <tr key={i}><td>{i + 1}</td>
                <td><input style={{ width: '100%' }} value={it.particulars} onChange={(e) => setItem(i, 'particulars', e.target.value)} /></td>
                <td><input style={{ width: 60 }} value={it.unit} onChange={(e) => setItem(i, 'unit', e.target.value)} /></td>
                <td><input style={{ width: 70 }} value={it.qty} onChange={(e) => setItem(i, 'qty', e.target.value)} /></td>
                <td><input style={{ width: 90 }} value={it.unitPrice} onChange={(e) => setItem(i, 'unitPrice', e.target.value)} /></td>
                <td className="right">{fmt(calcAmount(it.qty, it.unitPrice))}</td>
                <td>{items.length > 1 && <button type="button" className="sec" onClick={() => setItems(items.filter((_, n) => n !== i))}>x</button>}</td></tr>))}
          </tbody>
        </table>
        {items.length < 9 && <button type="button" className="sec" style={{ marginTop: 6 }} onClick={() => setItems([...items, blank()])}>Add row</button>}
        <div style={{ marginTop: 10 }}>
          <div className="row">
            <label style={{ flexDirection: 'row', gap: 6 }}><input type="checkbox" checked={ait} onChange={(e) => setAit(e.target.checked)} /> AIT(5%): {fmt(calc.ait.amount)}</label>
            {[['VAT', vat, setVat], ['TAX', tax, setTax]].map(([n, v, set]) => (
              <div key={n} className="row" style={{ alignItems: 'center' }}>
                <label style={{ flexDirection: 'row', gap: 6 }}><input type="checkbox" checked={v.on} onChange={(e) => set({ ...v, on: e.target.checked })} /> {n}</label>
                <select value={v.mode} onChange={(e) => set({ ...v, mode: e.target.value })}><option value="amount">Amount</option><option value="percent">Percent %</option></select>
                <input style={{ width: 80 }} value={v.value} onChange={(e) => set({ ...v, value: e.target.value })} />
                <span>= {fmt(n === 'VAT' ? calc.vat.amount : calc.tax.amount)}</span>
              </div>))}
          </div>
          <p>Subtotal: <b>{fmt(calc.subtotal)}</b> &nbsp; Total: <b>{fmt(total)}</b></p>
          <p>Total Amount: BDT {numberToWords(total)}</p>
        </div>
      </div>

      <div className="card row">
        <label>(A) Total amount paid in advance (blank = Total)<input value={pay.advancePaid} disabled={kind === 'resolutionA'} onChange={(e) => setPay({ ...pay, advancePaid: e.target.value })} /></label>
        <label>{isRes ? '(A-B)' : 'Net Payable/(refundable)'}<input disabled value={fmt(isRes ? (kind === 'resolutionA' ? bill.application.advancePaid : advance || 0) - total : total - advance)} /></label>
        <label>Payment Needed Date<input type="date" value={pay.paymentDate} onChange={(e) => setPay({ ...pay, paymentDate: e.target.value })} /></label>
        <label>Settle by the date of<input type="date" value={pay.settleDate} onChange={(e) => setPay({ ...pay, settleDate: e.target.value })} /></label>
        <label>Budget Control A/C No<input value={pay.budgetAccount} onChange={(e) => setPay({ ...pay, budgetAccount: e.target.value })} /></label>
        <label>Budget Remaining USD/BDT<input value={pay.budgetRemaining} onChange={(e) => setPay({ ...pay, budgetRemaining: e.target.value })} /></label>
      </div>
      <div className="card"><label>{isRes ? 'Resolution Remarks' : 'Remarks'}<textarea rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} /></label></div>
      {err && <div className="err">{err}</div>}
      <button disabled={busy}>{busy ? 'Saving...' : 'Save'}</button>
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
          <div className="card">
            <label style={{ flexDirection: 'row', gap: 6 }}><input type="radio" checked={mode === 'A'} onChange={() => setMode('A')} /> Type A: Resolution after an existing Application</label>
            <label style={{ flexDirection: 'row', gap: 6 }}><input type="radio" checked={mode === 'B'} onChange={() => setMode('B')} /> Type B: Direct Resolution (no Application)</label>
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
  return <><h1>{type === 'application' ? (query.edit ? 'Edit Application' : 'New Application') : 'Resolution'}</h1>{body}</>;
}
