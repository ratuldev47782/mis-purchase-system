'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/client';
import { docRows, fmt, formatDate, numberToWords } from '@/lib/calc';

const blue = { color: '#0000cc' };
export default function Print() {
  const { id } = useParams();
  const [b, setB] = useState(null);
  useEffect(() => { if (id) api('/api/bills/' + id).then(setB); }, [id]);
  if (!b) return <div style={{ padding: 20 }}>Loading...</div>;

  const A = b.application; const R = b.resolution;
  const appRows = docRows(A); const resRows = docRows(R);
  const main = A || R;
  const advance = A ? A.advancePaid : R.advancePaid;
  const pf = A || R; // payment fields
  const no = `MIS- ${b.billNo}`;
  const cell = (v, right) => <td style={{ textAlign: right ? 'right' : 'left' }}>{v}</td>;
  return (
    <>
      <style>{`
        @page{size:A4 portrait;margin:8mm}
        .pg{font-family:'Times New Roman',serif;font-size:11px;width:194mm;margin:0 auto;color:#000;background:#fff}
        .pg table{border-collapse:collapse;width:100%} .pg td,.pg th{border:1px solid #000;padding:1px 3px;height:15px;background:#fff;color:#000;font-weight:normal;vertical-align:middle}
        .pg th{font-weight:bold;text-align:center}
        .box{display:inline-block;border:1px solid #000;width:18px;text-align:center;margin-left:4px}
        .nb td,.nb th{border:0}
        .cut{border-top:1px dashed #000;margin:10px 0;text-align:center;font-size:10px;letter-spacing:3px}
      `}</style>
      <div className="noprint" style={{ padding: 10 }}>
        <button onClick={() => window.print()}>Print</button> <button className="sec" onClick={() => history.back()}>Back</button>
      </div>
      <div className="pg">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <img src="HKD_LOGO.png" alt="" height="40" onError={(e) => (e.target.style.display = 'none')} />
            <div><b style={{ fontSize: 14 }}>HKD OUTDOOR INNOVATIONS LTD</b><br />Plot #45-50, Sec#02, Karnaphuli EPZ, Chittagong.</div>
          </div>
          <b style={{ fontSize: 14 }}>No: {no}</b>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', margin: '6px 0' }}>
          <div style={{ fontSize: 16, fontWeight: 'bold', textDecoration: 'underline', paddingTop: 10 }}>REQUEST FOR PAYMENT</div>
          <table style={{ width: '60%' }}>
            <thead><tr>{['IC', 'AMGR/MGR', 'AGM', 'GM', 'DIR', 'MD', 'COO'].map((h) => <th key={h}>{h}</th>)}</tr></thead>
            <tbody>{[0, 1].map((r) => <tr key={r}>{[...Array(7)].map((_, i) => <td key={i} style={{ height: 18 }} />)}</tr>)}</tbody>
          </table>
        </div>
        <table className="nb" style={{ width: '60%' }}><tbody>
          <tr><td>Date</td><td>: {formatDate(b.date)}</td></tr>
          <tr><td>Applicant Name</td><td>: {b.applicantName}</td></tr>
          <tr><td>Sector/Line</td><td>: {b.sectorLine}</td></tr>
        </tbody></table>
        <div style={{ margin: '4px 0' }}>
          N (Necessary?) <span className="box">{b.nrb?.n}</span> &nbsp; R (Right Time &amp; Right Q&apos;ty?) <span className="box">{b.nrb?.r}</span> &nbsp; B (Best Price?) <span className="box">{b.nrb?.b}</span>
        </div>
        <div style={{ margin: '4px 0' }}><b>Total Amount : BDT {numberToWords(main.total)}</b></div>

        <table>
          <thead>
            <tr><th colSpan={6}>APPLICATION - ADVANCE PAYMENT</th><th colSpan={3}>RESOLUTION</th></tr>
            <tr><th style={{ width: 24 }}>No.</th><th>Particulars - Goods/Services</th><th style={{ width: 36 }}>Unit</th><th style={{ width: 40 }}>Q&apos;ty</th><th style={{ width: 50 }}>U/P</th><th style={{ width: 62 }}>Amount (BDT)</th><th style={{ width: 40 }}>Q&apos;ty</th><th style={{ width: 50 }}>U/P</th><th style={{ width: 62 }}>Amount (BDT)</th></tr>
          </thead>
          <tbody>
            {appRows.map((a, i) => { const r = resRows[i]; return (
              <tr key={i}>
                <td style={{ textAlign: 'center' }}>{i + 1}</td>
                <td style={blue}>{a && a.particulars}</td><td style={blue}>{a && a.unit}</td>
                <td style={{ ...blue, textAlign: 'right' }}>{a && a.qty}</td><td style={{ ...blue, textAlign: 'right' }}>{a && a.unitPrice ? fmt(a.unitPrice) : ''}</td>
                <td style={{ ...blue, textAlign: 'right' }}>{a ? fmt(a.amount) : ''}</td>
                {cell(r && r.qty, true)}{cell(r && r.unitPrice ? fmt(r.unitPrice) : '', true)}{cell(r ? fmt(r.amount) : '', true)}
              </tr>); })}
            <tr>
              <td colSpan={6}>(A)Total amount paid in advance : BDT: <b>{fmt(advance)}</b></td>
              <td colSpan={3}>(B)Total Resolution BDT: <b>{R ? fmt(R.total) : ''}</b></td>
            </tr>
            <tr>
              <td colSpan={6}>Net Payable/(refundable) after advance deduction</td>
              <td colSpan={3}>(A-B) BDT: <b>{R ? fmt(R.netPayable) : ''}</b></td>
            </tr>
          </tbody>
        </table>
        <table style={{ marginTop: 4 }}><tbody><tr>
          <td>Payment Needed : Date {pf.paymentDate && formatDate(pf.paymentDate)} by Cash/Cheque</td>
          <td>Settle by the date of: {pf.settleDate && formatDate(pf.settleDate)}</td>
          <td>Budget Control : A/C No {pf.budgetAccount}</td>
          <td>Budget Remaining : USD/BDT {pf.budgetRemaining}</td>
        </tr></tbody></table>
        <table style={{ marginTop: 4 }}><tbody>
          <tr><td style={{ height: 17 }}><b>Remarks:</b> {A && A.remarks}</td></tr>
          <tr><td style={{ height: 17 }}>{R && R.remarks}</td></tr>
          <tr><td style={{ height: 17 }} /></tr>
        </tbody></table>
        <div style={{ margin: '4px 0' }}>HKD Group</div>
        <div className="cut">✂ - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -</div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><b>REQUEST FOR PAYMENT (for Cashier)</b><b>No: {no}</b></div>
        <table style={{ marginTop: 6 }}><tbody>
          <tr><td>Payment Received in ADVANCE: Amount USD/ BDT <b>{fmt(advance)}</b></td><td>Expected settle Date: {pf.settleDate && formatDate(pf.settleDate)}</td></tr>
          <tr><td>Date:</td><td>Recipient Signature:</td></tr>
          <tr><td colSpan={2}>Recipient Name: {b.applicantName}</td></tr>
        </tbody></table>
        <div style={{ marginTop: 4 }}>HKD Group</div>
      </div>
    </>
  );
}
