// app/print/[id]/page.js

// Print copy = the same paper form as the Excel "REQUEST FOR PAYMENT" sheet.

'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/client';
import RequestForm from '@/app/components/RequestForm';
import { paperFromBill } from '@/lib/paper';

export default function PrintPage() {
  const { id } = useParams();
  const [b, setB] = useState(null); const [err, setErr] = useState('');
  useEffect(() => { if (id) api('/api/bills/' + id).then(setB).catch((e) => setErr(e.message)); }, [id]);
  if (err) return <div className="err">{err}</div>;
  if (!b) return <>Loading...</>;
  return (
    <>
      <style>{'@media print{nav,header,footer,.nav,.sidebar{display:none!important}main,.container,body{padding:0!important;margin:0!important;max-width:none!important}}'}</style>
      <div className="row noprint" style={{ marginBottom: 10 }}>
        <button onClick={() => window.print()}>Print</button>
        <a className="btn sec" href={`/api/export/bill/${b.billNo}`}>Export to Excel</a>
        <a className="btn sec" href={'/bill/' + b.billNo}>Back to Bill</a>
      </div>
      <RequestForm d={paperFromBill(b)} />
    </>
  );
}