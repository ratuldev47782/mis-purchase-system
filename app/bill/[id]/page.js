// app/bill/[id]/page.js

'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api } from '@/lib/client';
import { fmt, formatDate } from '@/lib/calc';

const isPdf = (f) => /\.pdf$/i.test(f.originalName || f.savedName || '');

/* ---------------- Theme: Flat Teal & Zinc (Tailwind only) ---------------- */
const FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700/40';
const BTN = `inline-flex h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border px-3 text-xs font-medium leading-none disabled:cursor-not-allowed disabled:opacity-60 ${FOCUS}`;
const BTN_PRI = `${BTN} border-teal-800 bg-teal-800 text-white hover:bg-teal-900`;
const BTN_SEC = `${BTN} border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50`;
const BTN_RED = `${BTN} border-red-300 bg-white text-red-700 hover:bg-red-50`;
const BTN_SM = `inline-flex h-6 items-center justify-center whitespace-nowrap rounded-md border px-2 text-[11px] font-medium disabled:cursor-not-allowed disabled:opacity-60 ${FOCUS}`;
const SM_SEC = `${BTN_SM} border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50`;
const SM_RED = `${BTN_SM} border-red-300 bg-white text-red-700 hover:bg-red-50`;

const CARD = 'rounded-md border border-zinc-300 bg-white';
const NAVY = 'bg-zinc-800';
const TEAL = 'bg-teal-800';
const CHIP = 'rounded-md border px-2 py-0.5 text-[11px] font-medium';

// ---------------------------------------------------------------------------
// Scan copy body: toolbar + viewer (fills the available height) + thumbs + upload
// ---------------------------------------------------------------------------
function ScanBody({ bill, category, reload }) {
  const [msg, setMsg] = useState(''); const [sel, setSel] = useState(0); const [drag, setDrag] = useState(false);
  const files = (bill.files || []).filter((f) => f.category === category);
  const idx = Math.min(sel, Math.max(files.length - 1, 0));
  const cur = files[idx];
  const url = (f, dl) => `/api/file?bill=${bill.billNo}&name=${encodeURIComponent(f.savedName)}${dl ? '&download=1' : ''}`;

  const upload = async (picked) => {
    if (!picked.length) return;
    const fd = new FormData(); picked.forEach((f) => fd.append('file', f));
    setMsg('Uploading...');
    try {
      const r = await fetch(`/api/upload?bill=${bill.billNo}&category=${category}`, { method: 'POST', body: fd });
      const j = await r.json().catch(() => ({}));
      setMsg(r.ok ? j.message : j.error || 'Upload failed');
      if (r.ok) {
        await api('/api/bills/' + bill.billNo, {
          method: 'PATCH',
          body: { status: category === 'application' ? 'Application Scan File Uploaded' : 'Resolution Scan File Uploaded' },
        });
        setSel(files.length);
        reload();
      }
    } catch (x) { setMsg(x.message); }
  };
  const remove = async (f) => {
    if (!confirm(`Delete "${f.originalName}"? The file will be removed from the PC.`)) return;
    try {
      await api(`/api/file?bill=${bill.billNo}&name=${encodeURIComponent(f.savedName)}`, { method: 'DELETE' });
      setMsg('File deleted'); setSel(0); reload();
    } catch (x) { setMsg(x.message); }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      {cur && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 bg-white px-3 py-1.5">
          <div className="min-w-0 flex-1 text-xs" title={cur.originalName}>
            <div className="truncate font-medium text-zinc-900">{cur.originalName}</div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {files.length > 1 && (
              <>
                <button type="button" className={SM_SEC} disabled={idx === 0} onClick={() => setSel(idx - 1)}>‹</button>
                <span className="text-[11px] tabular-nums text-zinc-500">{idx + 1} / {files.length}</span>
                <button type="button" className={SM_SEC} disabled={idx === files.length - 1} onClick={() => setSel(idx + 1)}>›</button>
              </>
            )}
            <a className={SM_SEC} href={url(cur)} target="_blank" rel="noreferrer">Open</a>
            <a className={SM_SEC} href={url(cur, 1)}>Download</a>
            <button type="button" className={SM_RED} onClick={() => remove(cur)}>Delete</button>
          </div>
        </div>
      )}

      {/* viewer */}
      <div className="min-h-[320px] flex-1 bg-zinc-100 lg:min-h-0">
        {cur ? (
          isPdf(cur)
            ? <iframe key={cur.savedName} title={cur.originalName} src={url(cur)} className="block h-full w-full border-0 bg-white" />
            : (
              <a href={url(cur)} target="_blank" rel="noreferrer" className="flex h-full items-center justify-center overflow-auto p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img key={cur.savedName} src={url(cur)} alt={cur.originalName} className="max-h-full max-w-full rounded-md border border-zinc-300 bg-white object-contain" />
              </a>
            )
        ) : (
          <div className="flex h-full items-center justify-center px-4 py-10 text-center text-sm text-zinc-500">
            No scan copy uploaded yet
          </div>
        )}
      </div>

      {/* thumbnails */}
      {files.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto border-t border-zinc-200 bg-white p-1.5">
          {files.map((f, i) => (
            <button
              key={f.savedName}
              type="button"
              onClick={() => setSel(i)}
              title={f.originalName}
              className={`relative h-10 w-10 flex-none overflow-hidden rounded-md border-2 bg-zinc-50 p-0 ${FOCUS} ${i === idx ? 'border-teal-800' : 'border-transparent hover:border-zinc-300'}`}
            >
              {isPdf(f)
                ? <span className="flex h-full w-full items-center justify-center text-[10px] font-semibold text-red-700">PDF</span>
                // eslint-disable-next-line @next/next/no-img-element
                : <img src={url(f)} alt="" className="h-full w-full object-cover" loading="lazy" />}
            </button>
          ))}
        </div>
      )}

      {/* upload: single compact row */}
      <label
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); upload([...e.dataTransfer.files]); }}
        className={`m-2 flex cursor-pointer flex-wrap items-center justify-center gap-x-2 rounded-md border border-dashed px-3 py-1.5 text-center ${
          drag ? 'border-teal-700 bg-teal-50' : 'border-zinc-300 bg-zinc-50 hover:border-zinc-400'
        }`}
      >
        <span className="text-xs font-medium text-zinc-800">+ Add scan copy</span>
        <span className="text-[11px] text-zinc-500">{msg || 'Click or drop PDF / image files. Old files are kept.'}</span>
        <input type="file" multiple accept=".pdf,image/*" className="hidden" onChange={(e) => { const p = [...e.target.files]; e.target.value = ''; upload(p); }} />
      </label>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Application / Resolution details body (scrolls inside its own panel)
// ---------------------------------------------------------------------------
const Row = ({ k, v, bold, strong }) => (
  <tr className={strong ? 'border-t border-zinc-300' : ''}>
    <td className={`px-3 py-0.5 ${strong ? 'font-semibold text-zinc-800' : 'text-zinc-500'}`}>{k}</td>
    <td className={`px-3 py-0.5 text-right tabular-nums ${bold ? 'font-semibold text-zinc-900' : 'text-zinc-800'}`}>{v}</td>
  </tr>
);

function DocBody({ d }) {
  if (!d) {
    return <div className="flex h-full items-center justify-center px-4 py-10 text-sm text-zinc-500">Not created yet</div>;
  }
  const th = 'px-2 py-2 font-medium';
  return (
    <div className="h-full overflow-auto p-3">
      <table className="w-full text-[13px]">
        <thead className="border-b border-zinc-300 bg-zinc-50 text-left text-zinc-500">
          <tr>
            <th className={th}>#</th>
            <th className={th}>Particulars</th>
            <th className={th}>Unit</th>
            <th className={`${th} text-right`}>Qty</th>
            <th className={`${th} text-right`}>U/P</th>
            <th className={`${th} text-right`}>Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 text-zinc-800 tabular-nums">
          {d.items.map((i, n) => (
            <tr key={n}>
              <td className="px-2 py-1.5 align-top text-zinc-500">{n + 1}</td>
              <td className="px-2 py-1.5 align-top">{i.particulars}</td>
              <td className="px-2 py-1.5 align-top text-zinc-600">{i.unit}</td>
              <td className="px-2 py-1.5 text-right align-top">{i.qty}</td>
              <td className="px-2 py-1.5 text-right align-top">{fmt(i.unitPrice)}</td>
              <td className="px-2 py-1.5 text-right align-top font-medium text-zinc-900">{fmt(i.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-3 flex flex-wrap justify-between gap-3">
        <div className="min-w-[200px] flex-1 text-sm text-zinc-700">
          {d.remarks && (
            <>
              <div className="text-xs font-medium text-zinc-500">Remarks</div>
              <div className="mt-0.5 whitespace-pre-wrap">{d.remarks}</div>
            </>
          )}
          {(d.paymentDate || d.settleDate || d.budgetAccount) && (
            <div className="mt-2 space-y-0.5 text-xs tabular-nums text-zinc-500">
              {d.paymentDate && <div>Payment needed: {formatDate(d.paymentDate)}</div>}
              {d.settleDate && <div>Settle by: {formatDate(d.settleDate)}</div>}
              {d.budgetAccount && <div>Budget A/C: {d.budgetAccount}</div>}
            </div>
          )}
        </div>

        <table className="self-start rounded-md border border-zinc-300 bg-zinc-50 text-[13px]">
          <tbody>
            <Row k="Subtotal" v={fmt(d.subtotal)} />
            {d.ait && d.ait.on && <Row k="AIT" v={fmt(d.ait.amount)} />}
            {d.vat && d.vat.on && <Row k="VAT" v={fmt(d.vat.amount)} />}
            {d.tax && d.tax.on && <Row k="TAX" v={fmt(d.tax.amount)} />}
            <Row k="Total" v={fmt(d.total)} bold strong />
            <Row k="Advance paid" v={fmt(d.advancePaid)} />
            <Row k="Net payable/(refundable)" v={fmt(d.netPayable)} bold />
          </tbody>
        </table>
      </div>
    </div>
  );
}

// One panel per document: header with a Scan | Details toggle, body fills the rest
function Panel({ bill, category, label, accent, doc, reload }) {
  const [tab, setTab] = useState('scan');
  const count = (bill.files || []).filter((f) => f.category === category).length;
  const tabBtn = (key, text) => (
    <button
      type="button"
      onClick={() => setTab(key)}
      className={`rounded px-2.5 py-0.5 text-xs font-medium ${FOCUS} ${tab === key ? 'bg-white text-zinc-900' : 'text-white/90 hover:bg-white/15'}`}
    >
      {text}
    </button>
  );
  return (
    <section className={`${CARD} flex min-h-[420px] flex-col overflow-hidden lg:min-h-0`}>
      <div className={`flex items-center justify-between gap-2 px-3 py-2 text-white ${accent}`}>
        <h2 className="!m-0 text-sm font-semibold !text-white">{label}</h2>
        <div className="flex items-center gap-2">
          <div className="flex gap-0.5 rounded-md border border-white/30 p-0.5">
            {tabBtn('scan', `Scan (${count})`)}
            {tabBtn('details', 'Details')}
          </div>
        </div>
      </div>
      <div className="min-h-0 flex-1">
        {tab === 'scan'
          ? <ScanBody bill={bill} category={category} reload={reload} />
          : <DocBody d={doc} />}
      </div>
    </section>
  );
}

const Info = ({ k, children, big }) => (
  <div className="min-w-0 bg-white px-2.5 py-1">
    <div className="text-[11px] leading-tight text-zinc-500">{k}</div>
    <div className={`break-words tabular-nums leading-snug ${big ? 'text-base font-semibold text-zinc-900' : 'text-[13px] font-medium text-zinc-800'}`}>
      {children || '-'}
    </div>
  </div>
);

export default function BillPage() {
  const router = useRouter(); const { id } = useParams();
  const [b, setB] = useState(null); const [err, setErr] = useState('');
  const load = () => api('/api/bills/' + id).then(setB).catch((e) => setErr(e.message));
  useEffect(() => { if (id) load(); }, [id]);

  if (err) {
    return (
      <div className="space-y-3">
        <h1 className="!m-0 text-2xl font-semibold text-zinc-900">Bill</h1>
        <div className="rounded-md border border-l-4 border-zinc-300 border-l-red-700 bg-white px-4 py-2.5 text-sm text-red-700">{err}</div>
      </div>
    );
  }
  if (!b) {
    return (
      <div className="space-y-3">
        <h1 className="!m-0 text-2xl font-semibold text-zinc-900">Bill</h1>
        <p className="text-sm text-zinc-500">Loading...</p>
      </div>
    );
  }

  const del = async () => {
    const ok = confirm(
      `Delete MIS-${b.billNo} completely?\n\nThis removes the application, resolution, ledger entries and all uploaded scan files from the PC.\nThis cannot be undone.`
    );
    if (!ok) return;
    try {
      await api('/api/bills/' + id, { method: 'DELETE' });
      router.push('/summary');
    } catch (e) {
      alert(e.message);
    }
  };

  const toggle = async () => {
    if (b.paymentStatus === 'Due') { const d = prompt('Paid date (YYYY-MM-DD)', new Date().toISOString().slice(0, 10)); if (!d) return; await api('/api/bills/' + id, { method: 'PATCH', body: { paymentStatus: 'Paid', paidDate: d } }); }
    else if (confirm('Switch back to Due?')) await api('/api/bills/' + id, { method: 'PATCH', body: { paymentStatus: 'Due' } });
    load();
  };
  const paid = b.paymentStatus === 'Paid';
  const two = !!b.application;

  return (
    // lg:h-[calc(100vh-2.5rem)] = one viewport (main has p-5 => 2.5rem). Below lg it stacks and scrolls normally.
    <div className="flex flex-col gap-3 lg:h-[calc(100vh-2.5rem)]">
      {/* compact header: title + chips + buttons on one row, info strip below */}
      <div className={`${CARD} border-l-4 ${paid ? 'border-l-teal-700' : 'border-l-red-700'}`}>
        <div className="px-3 py-2.5">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
              <a href="/summary" className="text-xs font-medium text-zinc-500 hover:text-zinc-900 hover:underline">← Purchase Report</a>
              <h1 className="!m-0 text-lg font-semibold leading-tight text-zinc-900">{`MIS- ${b.title}`}</h1>
              <div className="flex flex-wrap gap-1.5">
                <span className={`${CHIP} border-zinc-300 bg-zinc-50 text-zinc-800`}>{b.stage}</span>
                {b.status && <span className={`${CHIP} border-zinc-300 bg-white text-zinc-700`}>{b.status}</span>}
                <span className={`${CHIP} tabular-nums ${paid ? 'border-teal-700/40 bg-teal-50 text-teal-900' : 'border-red-300 bg-white text-red-700'}`}>
                  {b.paymentStatus}{b.paidDate && ` (${b.paidDate})`}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <a className={BTN_PRI} href={`/print/${b.billNo}`}>Print</a>
              <a className={BTN_SEC} href={`/api/export/bill/${b.billNo}`}>Export Excel</a>
              <a className={BTN_SEC} href={`/ledger?bill=${b.billNo}`} target="_blank" rel="noreferrer">IT Accessories Sheet</a>
              {b.application && <a className={BTN_SEC} href={`/new?type=application&edit=${b.billNo}`}>Edit Application</a>}
              {b.application && <a className={BTN_SEC} href={`/new?type=resolution&parent=${b.billNo}`}>{b.resolution ? 'Edit' : 'Create'} Resolution</a>}
              {!b.application && <a className={BTN_SEC} href={`/new?type=resolution&edit=${b.billNo}`}>Edit Resolution</a>}
              <button type="button" className={BTN_SEC} onClick={toggle}>Mark {paid ? 'Due' : 'Paid'}</button>
              <button type="button" className={BTN_RED} onClick={del}>Delete</button>
            </div>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-px border border-zinc-300 bg-zinc-200 sm:grid-cols-3 lg:grid-cols-6">
            <Info k="Supplier">{b.supplierName}</Info>
            <Info k="Applicant">{b.applicantName}</Info>
            <Info k="Date">{formatDate(b.date)}</Info>
            <Info k="Department">{b.department}</Info>
            <Info k="Ledger month">{b.ledgerMonth}</Info>
            <Info k="Summary amount" big>{fmt(b.summaryAmount)}</Info>
          </div>
        </div>
      </div>

      {/* panels fill the rest of the viewport; each has Scan | Details tabs */}
      <div className={`grid min-h-0 flex-1 grid-cols-1 gap-3 ${two ? 'lg:grid-cols-2' : ''}`}>
        {two && <Panel bill={b} category="application" label="Application" accent={NAVY} doc={b.application} reload={load} />}
        <Panel bill={b} category="resolution" label="Resolution" accent={TEAL} doc={b.resolution} reload={load} />
      </div>
    </div>
  );
}