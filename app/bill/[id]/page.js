// app/bill/[id]/page.js

'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api } from '@/lib/client';
import { fmt, formatDate } from '@/lib/calc';

const isPdf = (f) => /\.pdf$/i.test(f.originalName || f.savedName || '');

/* ---------------- Tailwind class sets ---------------- */
const FOCUS = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0E7C7B]';
const BTN = `inline-flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border px-3.5 text-[13px] font-semibold leading-none transition disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS}`;
const BTN_PRI = `${BTN} border-[#12263F] bg-[#12263F] text-white hover:bg-[#1B3555]`;
const BTN_SEC = `${BTN} border-slate-300 bg-white text-slate-800 hover:bg-slate-100`;
const BTN_RED = `${BTN} border-red-200 bg-white text-red-700 hover:bg-red-50`;
const BTN_SM = `inline-flex h-7 items-center justify-center whitespace-nowrap rounded-md border px-2.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS}`;
const SM_SEC = `${BTN_SM} border-slate-300 bg-white text-slate-700 hover:bg-slate-100`;
const SM_RED = `${BTN_SM} border-red-200 bg-white text-red-700 hover:bg-red-50`;

const CARD = 'overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm';

// panel colours: Application = navy, Resolution = teal (same as the dashboard)
const NAVY = 'bg-[#12263F]';
const TEAL = 'bg-[#0E7C7B]';

// ---------------------------------------------------------------------------
// Scan copy panel: upload + thumbnails + a big inline viewer (image or PDF)
// ---------------------------------------------------------------------------
function ScanPanel({ bill, category, label, reload, accent }) {
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
        // auto status; can be changed later in the Summary page
        await api('/api/bills/' + bill.billNo, {
          method: 'PATCH',
          body: { status: category === 'application' ? 'Application Scan File Uploaded' : 'Resolution Scan File Uploaded' },
        });
        setSel(files.length); // jump to the first new file
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
    <section className={CARD}>
      <div className={`flex items-center justify-between gap-2 px-4 py-3 text-white ${accent}`}>
        <h2 className="!m-0 text-sm font-semibold !text-white">{label}</h2>
        <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-medium">
          {files.length} file{files.length === 1 ? '' : 's'}
        </span>
      </div>

      {/* viewer */}
      <div className="bg-slate-100">
        {cur ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 py-2">
              <div className="min-w-0 flex-1 text-xs" title={cur.originalName}>
                <div className="truncate font-semibold text-slate-800">{cur.originalName}</div>
                {cur.uploadedAt && <div className="text-slate-400">{new Date(cur.uploadedAt).toLocaleString()}</div>}
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {files.length > 1 && (
                  <>
                    <button type="button" className={SM_SEC} disabled={idx === 0} onClick={() => setSel(idx - 1)}>‹ Prev</button>
                    <span className="text-xs tabular-nums text-slate-500">{idx + 1} / {files.length}</span>
                    <button type="button" className={SM_SEC} disabled={idx === files.length - 1} onClick={() => setSel(idx + 1)}>Next ›</button>
                  </>
                )}
                <a className={SM_SEC} href={url(cur)} target="_blank" rel="noreferrer">Open full</a>
                <a className={SM_SEC} href={url(cur, 1)}>Download</a>
                <button type="button" className={SM_RED} onClick={() => remove(cur)}>Delete</button>
              </div>
            </div>
            {isPdf(cur)
              ? <iframe key={cur.savedName} title={cur.originalName} src={url(cur)} className="block h-[78vh] w-full border-0 bg-white" />
              : (
                <a href={url(cur)} target="_blank" rel="noreferrer" className="flex max-h-[78vh] min-h-[320px] items-center justify-center overflow-auto p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img key={cur.savedName} src={url(cur)} alt={cur.originalName} className="max-h-[74vh] w-auto max-w-full rounded-md border border-slate-200 bg-white object-contain shadow-sm" />
                </a>
              )}
          </>
        ) : (
          <div className="flex min-h-[220px] flex-col items-center justify-center gap-1 p-6 text-center text-slate-400">
            <div className="text-4xl">🗂️</div>
            <div className="text-sm">No scan copy uploaded yet</div>
          </div>
        )}
      </div>

      {/* thumbnails */}
      {files.length > 1 && (
        <div className="flex gap-2 overflow-x-auto border-t border-slate-200 bg-white p-2">
          {files.map((f, i) => (
            <button
              key={f.savedName}
              type="button"
              onClick={() => setSel(i)}
              title={f.originalName}
              className={`relative h-16 w-16 flex-none overflow-hidden rounded-md border-2 bg-slate-50 p-0 ${i === idx ? 'border-[#0E7C7B]' : 'border-transparent hover:border-slate-300'}`}
            >
              {isPdf(f)
                ? <span className="flex h-full w-full items-center justify-center text-xs font-bold text-red-600">PDF</span>
                // eslint-disable-next-line @next/next/no-img-element
                : <img src={url(f)} alt="" className="h-full w-full object-cover" loading="lazy" />}
            </button>
          ))}
        </div>
      )}

      {/* upload */}
      <label
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); upload([...e.dataTransfer.files]); }}
        className={`m-3 flex cursor-pointer flex-col items-center gap-0.5 rounded-lg border-2 border-dashed px-3 py-3 text-center transition ${
          drag ? 'border-[#0E7C7B] bg-teal-50' : 'border-slate-300 bg-slate-50 hover:border-slate-400'
        }`}
      >
        <span className="text-sm font-semibold text-slate-700">+ Add scan copy</span>
        <span className="text-xs text-slate-500">Click or drop PDF / image files here. Old files are kept.</span>
        <input type="file" multiple accept=".pdf,image/*" className="hidden" onChange={(e) => { const p = [...e.target.files]; e.target.value = ''; upload(p); }} />
      </label>
      {msg && <div className="px-4 pb-3 text-xs text-slate-600">{msg}</div>}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Application / Resolution details
// ---------------------------------------------------------------------------
const Row = ({ k, v, bold, strong }) => (
  <tr className={strong ? 'border-t border-slate-300' : ''}>
    <td className={`px-3 py-1 ${strong ? 'font-semibold text-slate-800' : 'text-slate-500'}`}>{k}</td>
    <td className={`px-3 py-1 text-right tabular-nums ${bold ? 'font-bold text-slate-900' : 'text-slate-800'}`}>{v}</td>
  </tr>
);

function Doc({ d, name, accent }) {
  if (!d) return null;
  const th = 'px-2 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500';
  return (
    <section className={CARD}>
      <div className={`px-4 py-3 ${accent}`}>
        <h2 className="!m-0 text-sm font-semibold !text-white">{name}</h2>
      </div>
      <div className="overflow-x-auto p-3">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left">
              <th className={th}>#</th>
              <th className={th}>Particulars</th>
              <th className={th}>Unit</th>
              <th className={`${th} text-right`}>Qty</th>
              <th className={`${th} text-right`}>U/P</th>
              <th className={`${th} text-right`}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {d.items.map((i, n) => (
              <tr key={n} className="border-b border-slate-100 last:border-0">
                <td className="px-2 py-2 text-slate-400">{n + 1}</td>
                <td className="px-2 py-2 text-slate-800">{i.particulars}</td>
                <td className="px-2 py-2 text-slate-600">{i.unit}</td>
                <td className="px-2 py-2 text-right tabular-nums">{i.qty}</td>
                <td className="px-2 py-2 text-right tabular-nums">{fmt(i.unitPrice)}</td>
                <td className="px-2 py-2 text-right font-medium tabular-nums">{fmt(i.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 flex flex-wrap justify-between gap-4">
          <div className="min-w-[200px] flex-1 text-sm text-slate-600">
            {d.remarks && (
              <>
                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Remarks</div>
                <div className="mt-0.5 whitespace-pre-wrap">{d.remarks}</div>
              </>
            )}
            {(d.paymentDate || d.settleDate || d.budgetAccount) && (
              <div className="mt-3 space-y-0.5 text-xs text-slate-500">
                {d.paymentDate && <div>Payment needed: {formatDate(d.paymentDate)}</div>}
                {d.settleDate && <div>Settle by: {formatDate(d.settleDate)}</div>}
                {d.budgetAccount && <div>Budget A/C: {d.budgetAccount}</div>}
              </div>
            )}
          </div>

          <table className="rounded-lg bg-slate-50 text-sm ring-1 ring-slate-200">
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
    </section>
  );
}

const Info = ({ k, children, big }) => (
  <div className="min-w-0">
    <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{k}</div>
    <div className={`mt-0.5 break-words ${big ? 'text-lg font-bold tabular-nums text-slate-900' : 'text-sm font-medium text-slate-800'}`}>
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
        <h1 className="!m-0 text-lg font-bold text-slate-900">Bill</h1>
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>
      </div>
    );
  }
  if (!b) {
    return (
      <div className="space-y-3">
        <h1 className="!m-0 text-lg font-bold text-slate-900">Bill</h1>
        <p className="text-sm text-slate-500">Loading...</p>
      </div>
    );
  }

  // Deletes the bill, its ledger entries AND all uploaded scan files (see DELETE in app/api/bills/[id]/route.js)
  const del = async () => {
    const ok = confirm(
      `Delete MIS-${b.billNo} completely?\n\nThis removes the application, resolution, ledger entries and all uploaded scan files from the PC.\nThis cannot be undone.`
    );
    if (!ok) return;
    try {
      await api('/api/bills/' + id, { method: 'DELETE' });
      router.push('/summary');
    } catch (e) {
      alert(e.message); // e.g. a scan file is open in another program, so nothing was deleted
    }
  };

  const toggle = async () => {
    if (b.paymentStatus === 'Due') { const d = prompt('Paid date (YYYY-MM-DD)', new Date().toISOString().slice(0, 10)); if (!d) return; await api('/api/bills/' + id, { method: 'PATCH', body: { paymentStatus: 'Paid', paidDate: d } }); }
    else if (confirm('Switch back to Due?')) await api('/api/bills/' + id, { method: 'PATCH', body: { paymentStatus: 'Due' } });
    load();
  };
  const paid = b.paymentStatus === 'Paid';

  return (
    <div className="space-y-4">
      {/* header */}
      <div className={CARD}>
        <div className={`h-1.5 ${paid ? 'bg-green-500' : 'bg-red-500'}`} />
        <div className="p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <a href="/summary" className="text-xs font-semibold text-slate-500 hover:text-slate-900 hover:underline">← Purchase Report</a>
              <h1 className="!m-0 mt-1 text-2xl font-bold tracking-tight text-slate-900">{`MIS- ${b.title}`}</h1>
              <div className="mt-2.5 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-blue-100 px-2.5 py-1 font-semibold text-blue-800">{b.stage}</span>
                {b.status && <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-700">{b.status}</span>}
                <span className={`rounded-full px-2.5 py-1 font-semibold ${paid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-700'}`}>
                  {b.paymentStatus}{b.paidDate && ` (${b.paidDate})`}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <a className={BTN_PRI} href={`/print/${b.billNo}`}>Print</a>
              <a className={BTN_SEC} href={`/api/export/bill/${b.billNo}`}>Export Excel</a>
              {/* Full IT Accessories Sheet with only this bill's category rows highlighted (see /ledger?bill=) */}
              <a className={BTN_SEC} href={`/ledger?bill=${b.billNo}`} target="_blank" rel="noreferrer">IT Accessories Sheet</a>
              {b.application && <a className={BTN_SEC} href={`/new?type=application&edit=${b.billNo}`}>Edit Application</a>}
              {b.application && <a className={BTN_SEC} href={`/new?type=resolution&parent=${b.billNo}`}>{b.resolution ? 'Edit' : 'Create'} Resolution</a>}
              {!b.application && <a className={BTN_SEC} href={`/new?type=resolution&edit=${b.billNo}`}>Edit Resolution</a>}
              <button type="button" className={BTN_SEC} onClick={toggle}>Mark {paid ? 'Due' : 'Paid'}</button>
              <button type="button" className={BTN_RED} onClick={del}>Delete</button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-slate-100 pt-4 sm:grid-cols-3 lg:grid-cols-6">
            <Info k="Supplier">{b.supplierName}</Info>
            <Info k="Applicant">{b.applicantName}</Info>
            <Info k="Date">{formatDate(b.date)}</Info>
            <Info k="Department">{b.department}</Info>
            <Info k="Ledger month">{b.ledgerMonth}</Info>
            <Info k="Summary amount" big>{fmt(b.summaryAmount)}</Info>
          </div>
        </div>
      </div>

      {/* scan copies: shown right on the page */}
      <div className={`grid grid-cols-1 gap-4 ${b.application ? 'xl:grid-cols-2' : ''}`}>
        {b.application && <ScanPanel bill={b} category="application" label="Application Scan Copy" accent={NAVY} reload={load} />}
        <ScanPanel bill={b} category="resolution" label="Resolution Scan Copy" accent={TEAL} reload={load} />
      </div>

      {/* bill details */}
      <div className={`grid grid-cols-1 gap-4 ${b.application && b.resolution ? 'xl:grid-cols-2' : ''}`}>
        <Doc d={b.application} name="Application" accent={NAVY} />
        <Doc d={b.resolution} name="Resolution" accent={TEAL} />
      </div>
    </div>
  );
}