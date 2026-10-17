'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api } from '@/lib/client';
import { fmt, formatDate } from '@/lib/calc';

function Files({ bill, category, label, reload }) {
  const [msg, setMsg] = useState('');
  const upload = async (e) => {
    const input = e.target;
    const picked = [...input.files];
    if (!picked.length) return;
    const fd = new FormData(); picked.forEach((f) => fd.append('file', f));
    setMsg('Uploading...');
    try {
      const r = await fetch(`/api/upload?bill=${bill.billNo}&category=${category}`, { method: 'POST', body: fd });
      const j = await r.json().catch(() => ({}));
      setMsg(r.ok ? j.message : j.error || 'Upload failed');
      if (r.ok) reload();
    } catch (x) { setMsg(x.message); }
    input.value = '';
  };
  const remove = async (f) => {
    if (!confirm(`Delete "${f.originalName}"? The file will be removed from the PC.`)) return;
    try {
      await api(`/api/file?bill=${bill.billNo}&name=${encodeURIComponent(f.savedName)}`, { method: 'DELETE' });
      setMsg('File deleted'); reload();
    } catch (x) { setMsg(x.message); }
  };
  const files = (bill.files || []).filter((f) => f.category === category);
  return (
    <div className="card" style={{ flex: 1, minWidth: 280 }}>
      <b>{label}</b> <small>({files.length} file{files.length === 1 ? '' : 's'})</small>
      <ul>
        {files.map((f) => (
          <li key={f.savedName}>
            <a href={`/api/file?bill=${bill.billNo}&name=${encodeURIComponent(f.savedName)}`} target="_blank" rel="noreferrer">{f.originalName}</a>
            {' '}<small>{new Date(f.uploadedAt).toLocaleString()}</small>
            {' '}<a href={`/api/file?bill=${bill.billNo}&name=${encodeURIComponent(f.savedName)}&download=1`}>download</a>
            {' '}<button type="button" className="red" style={{ padding: '1px 6px' }} onClick={() => remove(f)}>Delete</button>
          </li>
        ))}
        {!files.length && <li>No files yet</li>}
      </ul>
      <input type="file" multiple accept=".pdf,image/*" onChange={upload} />
      <div style={{ fontSize: 12, color: '#555' }}>Select one or more files. You can add more later; old files are kept.</div>
      <div>{msg}</div>
    </div>
  );
}
export default function BillPage() {
  const router = useRouter(); const { id } = useParams();
  const [b, setB] = useState(null); const [err, setErr] = useState('');
  const load = () => api('/api/bills/' + id).then(setB).catch((e) => setErr(e.message));
  useEffect(() => { if (id) load(); }, [id]);
  if (err) return <><h1>Bill</h1><div className="err">{err}</div></>;
  if (!b) return <><h1>Bill</h1>Loading...</>;
  const del = async () => { if (confirm('Delete this bill? Ledger entries are removed; uploaded files are kept.')) { await api('/api/bills/' + id, { method: 'DELETE' }); router.push('/summary'); } };
  const toggle = async () => {
    if (b.paymentStatus === 'Due') { const d = prompt('Paid date (YYYY-MM-DD)', new Date().toISOString().slice(0, 10)); if (!d) return; await api('/api/bills/' + id, { method: 'PATCH', body: { paymentStatus: 'Paid', paidDate: d } }); }
    else if (confirm('Switch back to Due?')) await api('/api/bills/' + id, { method: 'PATCH', body: { paymentStatus: 'Due' } });
    load();
  };
  const D = ({ d, name }) => d ? <div className="card"><b>{name}</b>: Subtotal {fmt(d.subtotal)} | AIT {fmt(d.ait.amount)} | VAT {fmt(d.vat.amount)} | TAX {fmt(d.tax.amount)} | <b>Total {fmt(d.total)}</b>
    <ul>{d.items.map((i, n) => <li key={n}>{i.particulars} - {i.qty} {i.unit} x {fmt(i.unitPrice)} = {fmt(i.amount)}</li>)}</ul>{d.remarks && <div>Remarks: {d.remarks}</div>}</div> : null;
  return (
    <><h1>{`MIS- ${b.title}`}</h1>
      <div className="card">
        Supplier: <b>{b.supplierName}</b> | Applicant: {b.applicantName} | Date: {formatDate(b.date)} | Stage: <b>{b.stage}</b> | Status: {b.status}<br />
        Department: {b.department} | Summary amount: {fmt(b.summaryAmount)} | Payment: <b>{b.paymentStatus}</b>{b.paidDate && ` (${b.paidDate})`}
        <div className="row" style={{ marginTop: 10 }}>
          <a className="btn" href={`/print/${b.billNo}`}>Print</a>
          {b.application && <a className="btn sec" href={`/new?type=application&edit=${b.billNo}`}>Edit Application</a>}
          {b.application && <a className="btn sec" href={`/new?type=resolution&parent=${b.billNo}`}>{b.resolution ? 'Edit' : 'Create'} Resolution</a>}
          {!b.application && <a className="btn sec" href={`/new?type=resolution&edit=${b.billNo}`}>Edit Resolution</a>}
          <button className="sec" onClick={toggle}>Mark {b.paymentStatus === 'Due' ? 'Paid' : 'Due'}</button>
          <button className="red" onClick={del}>Delete</button>
        </div>
      </div>
      <D d={b.application} name="Application" /><D d={b.resolution} name="Resolution" />
      <div className="row" style={{ alignItems: 'stretch' }}>
        {b.application && <Files bill={b} category="application" label="Application Scan Copy" reload={load} />}
        <Files bill={b} category="resolution" label="Resolution Scan Copy" reload={load} />
      </div>
    </>
  );
}
