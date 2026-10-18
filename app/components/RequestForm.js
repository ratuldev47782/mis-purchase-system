// app/components/RequestForm.js

//
// One component that draws the "REQUEST FOR PAYMENT" paper form exactly like the Excel sheet.
//   <RequestForm d={paperFromBill(bill)} />                 -> read only (print page, previews)
//   <RequestForm d={d} edit={{ ...handlers }} />             -> same paper, but cells are inputs (new / edit page)
'use client';
import { fmt, numberToWords } from '@/lib/calc';
import { dmy, paperRows } from '@/lib/paper';

export { paperFromBill, paperRows, dmy } from '@/lib/paper';

const CSS = `
.rf-wrap{overflow-x:auto;padding:4px}
.rf-sheet{font-family:'Times New Roman',Times,serif;color:#000;background:#fff;width:100%;max-width:210mm;min-width:780px;margin:0 auto;padding:10mm;font-size:13px;border:1px solid #bbb;box-shadow:0 2px 10px rgba(0,0,0,.12);-webkit-print-color-adjust:exact;print-color-adjust:exact}
.rf-sheet *{box-sizing:border-box}
.rf-sheet b,.rf-sheet .b{font-weight:700}
.rf-top{display:flex;justify-content:space-between;align-items:flex-start}
.rf-co{display:flex;gap:8px;align-items:center}
.rf-co img{width:44px;height:46px;object-fit:contain}
.rf-co .n{font-size:24px;font-weight:700;line-height:1.05}
.rf-co .a{font-size:12.5px;font-weight:700;margin-top:2px}
.rf-no{font-weight:700;font-size:13px;white-space:nowrap;padding-top:6px}
.rf-no span{color:#00f;border-bottom:1.5px dashed #000;padding:0 6px;margin-left:6px}
.rf-mid{display:flex;justify-content:space-between;gap:14px;margin-top:10px}
.rf-fields{flex:0 0 42%}
.rf-title{font-size:15px;font-weight:700;border-bottom:2px solid #000;padding:6px 0 2px;margin-bottom:14px;display:inline-block;min-width:200px}
.rf-line{display:flex;align-items:baseline;gap:6px;margin:0 0 11px;font-weight:700}
.rf-line .k{width:110px;flex:none}
.rf-u{flex:1;border-bottom:1.5px dashed #000;color:#00f;font-weight:700;padding:0 4px;min-height:18px}
.rf-appr{border-collapse:collapse;flex:1;align-self:flex-start;table-layout:fixed}
.rf-appr th,.rf-appr td{border:1px solid #000;text-align:center;font-size:11px;font-weight:700;padding:2px}
.rf-appr td{height:44px}
.rf-nrb{display:flex;align-items:center;gap:8px;font-weight:700;font-size:12px;margin-top:8px;flex-wrap:wrap}
.rf-box{display:inline-flex;align-items:center;justify-content:center;border:1px solid #000;width:58px;height:20px;color:#00f}
.rf-nrb .sp{flex:1}
.rf-total{border-bottom:2px solid #000;padding:6px 0 4px;margin-top:8px;font-weight:700;font-size:13px}
.rf-total .w{font-weight:400;font-style:italic;font-size:12px;margin-left:6px}
.rf-tbl{width:100%;border-collapse:collapse;table-layout:fixed;margin-top:8px;font-weight:700}
.rf-tbl th,.rf-tbl td{border:1px solid #000;padding:1px 4px;height:27px;font-size:12px;vertical-align:middle;background:#fff}
.rf-tbl th{font-size:11.5px;text-align:center;height:20px;background:#f2f2f2}
.rf-tbl .c{text-align:center}.rf-tbl .r{text-align:right}.rf-tbl .l{text-align:left}
.rf-tbl .bl{color:#00f}
.rf-tbl .g{color:#666}
.rf-tbl .thick td{border-top:2px solid #000}
.rf-tbl .tot td{font-size:11.5px;height:24px;white-space:nowrap}
.rf-tbl .tot td.sm{font-size:10px;white-space:normal;line-height:1.05}
.rf-pay{display:flex;justify-content:space-between;gap:16px;margin-top:14px;font-weight:700;font-size:12px;align-items:baseline}
.rf-pay .grp{display:flex;align-items:baseline;gap:6px;flex:1}
.rf-pay span{white-space:nowrap}
.rf-pay .grp .u{flex:1;border-bottom:1.5px dashed #000;color:#00f;min-height:17px;padding:0 4px}
.rf-rem{margin-top:10px;font-weight:700;font-size:12px}
.rf-rembox{border:1px solid #000;min-height:62px;margin-top:2px;padding:3px 5px;color:#00f;font-weight:700;white-space:pre-wrap;font-size:12px;background:linear-gradient(#fff 20px,#000 20px,#000 21px,#fff 21px,#fff 41px,#000 41px,#000 42px,#fff 42px)}
.rf-foot{display:flex;align-items:center;gap:6px;margin:14px 0 6px;font-weight:700;font-size:13px}
.rf-foot img{width:26px;height:27px;object-fit:contain}
.rf-cut{border-top:1.5px dashed #000;margin:6px 0 14px;position:relative;height:0}
.rf-cut:before{content:"\\2702";position:absolute;left:0;top:-11px;font-size:14px;background:#fff;padding-right:4px}
.rf-cash{font-weight:700;font-size:12px}
.rf-cash .row{display:flex;justify-content:space-between;align-items:baseline;gap:10px;margin:0 0 9px}
.rf-cash .ind{margin-left:14px;display:flex;gap:8px;align-items:baseline;margin-bottom:12px}
.rf-cash .ind .k{width:130px}
.rf-cash .ind .u{border-bottom:1.5px dashed #000;min-width:170px;color:#00f;padding:0 4px;min-height:17px}
.rf-sheet input,.rf-sheet select,.rf-sheet textarea{font-family:inherit!important;font-weight:700!important;color:#00f!important;background:transparent!important;border:0!important;border-radius:0!important;outline:none;box-shadow:none!important;width:100%;margin:0!important;padding:1px 2px!important;font-size:12px!important;height:auto!important;min-width:0}
.rf-sheet input:focus,.rf-sheet select:focus,.rf-sheet textarea:focus{background:#fffbd0!important}
.rf-sheet input:disabled,.rf-sheet select:disabled,.rf-sheet textarea:disabled{color:#555!important;cursor:not-allowed}
.rf-sheet .d{border-bottom:1.5px dashed #000!important}
.rf-sheet input.rt{text-align:right}.rf-sheet input.ct{text-align:center}
.rf-sheet input[type=checkbox]{width:14px;margin-right:4px!important;accent-color:#00f}
.rf-sheet .nb{width:58px;height:20px;border:1px solid #000!important;text-align:center}
.rf-sheet textarea{resize:none;line-height:21px;height:60px!important;padding:0 2px!important;background:transparent!important}
.rf-x{border:0;background:transparent;color:#c00;font-weight:700;cursor:pointer;font-size:14px;line-height:1;padding:0 2px}
.rf-add{border:1px dashed #00f;background:#f4f7ff;color:#00f;font-family:inherit;font-weight:700;font-size:11px;padding:1px 8px;cursor:pointer;border-radius:3px}
.rf-xt{display:flex;align-items:center;gap:4px}
.rf-xt select{width:80px;flex:none}
.rf-xt input[type=text]{width:50px;border-bottom:1px solid #00f!important}
@media print{
  .noprint{display:none!important}
  .rf-wrap{padding:0;overflow:visible}
  .rf-sheet{border:0;box-shadow:none;max-width:none;min-width:0;width:100%;padding:0}
  .rf-add,.rf-x{display:none!important}
  @page{size:A4 portrait;margin:9mm}
  body{background:#fff!important}
}
`;

const n0 = (v) => Number(v) || 0;
const Box = ({ children }) => <span className="rf-box">{children}</span>;

function ViewRows({ d }) {
  return d.rows.map((r, i) => (
    <tr key={i}>
      <td className="c">{i + 1}</td>
      <td className="l bl">{r.p}</td>
      <td className="c bl">{r.unit}</td>
      <td className="r bl">{r.a ? r.a.q : ''}</td>
      <td className="r bl">{r.a ? fmt(r.a.u) : ''}</td>
      <td className="r">{r.a ? fmt(r.a.t) : ''}</td>
      <td className="r bl">{r.r ? r.r.q : ''}</td>
      <td className="r bl">{r.r ? fmt(r.r.u) : ''}</td>
      <td className="r">{r.r ? fmt(r.r.t) : ''}</td>
    </tr>
  ));
}

function EditRows({ d, e }) {
  const isA = e.side === 'application';
  const { items, setItem, calc } = e;
  const out = [];
  const roA = (r) => [<td key="q" className="r g">{r && r.a ? r.a.q : ''}</td>, <td key="u" className="r g">{r && r.a ? fmt(r.a.u) : ''}</td>, <td key="t" className="r g">{r && r.a ? fmt(r.a.t) : ''}</td>];
  const roR = (r) => [<td key="q" className="r g">{r && r.r ? r.r.q : ''}</td>, <td key="u" className="r g">{r && r.r ? fmt(r.r.u) : ''}</td>, <td key="t" className="r g">{r && r.r ? fmt(r.r.t) : ''}</td>];
  for (let i = 0; i < 9; i++) {
    const it = items[i]; const o = d.rows[i];
    let cells;
    if (it) {
      const mine = [
        <td key="q"><input className="rt" value={it.qty} onChange={(ev) => setItem(i, 'qty', ev.target.value)} /></td>,
        <td key="u"><input className="rt" value={it.unitPrice} onChange={(ev) => setItem(i, 'unitPrice', ev.target.value)} /></td>,
        <td key="t" className="r">{fmt(n0(it.qty) * n0(it.unitPrice))}</td>,
      ];
      cells = isA ? [...mine, ...roR(o)] : [...roA(o), ...mine];
      out.push(
        <tr key={i}>
          <td className="c">{i + 1}{items.length > 1 && <button type="button" className="rf-x" title="Remove row" onClick={() => e.delRow(i)}>×</button>}</td>
          <td><input value={it.particulars} onChange={(ev) => setItem(i, 'particulars', ev.target.value)} /></td>
          <td><input className="ct" value={it.unit} onChange={(ev) => setItem(i, 'unit', ev.target.value)} /></td>
          {cells}
        </tr>
      );
    } else {
      out.push(
        <tr key={i}>
          <td className="c">{i + 1}</td>
          <td>{i === items.length && <button type="button" className="rf-add" onClick={e.addRow}>+ Add row</button>}</td>
          <td />{[...Array(6)].map((_, k) => <td key={k} />)}
        </tr>
      );
    }
  }
  const ex = [['ait', e.ait, null, calc.ait.amount], ['vat', e.vat, e.setVat, calc.vat.amount], ['tax', e.tax, e.setTax, calc.tax.amount]];
  ex.forEach(([k, x, set, amt], idx) => {
    const on = k === 'ait' ? x : x.on; const o = d.rows[9 + idx];
    const mine = [
      <td key="q" className="r">{on ? 1 : ''}</td>, <td key="u" className="r">{on ? fmt(amt) : ''}</td>, <td key="t" className="r">{on ? fmt(amt) : ''}</td>,
    ];
    out.push(
      <tr key={k}>
        <td className="c">{10 + idx}</td>
        <td>
          <div className="rf-xt">
            <label style={{ display: 'flex', alignItems: 'center', whiteSpace: 'nowrap', cursor: 'pointer' }}>
              <input type="checkbox" checked={!!on} onChange={(ev) => (k === 'ait' ? e.setAit(ev.target.checked) : set({ ...x, on: ev.target.checked }))} />
              {k === 'ait' ? 'AIT(5%)' : k.toUpperCase()}
            </label>
            {k !== 'ait' && (
              <>
                <select value={x.mode} onChange={(ev) => set({ ...x, mode: ev.target.value })}><option value="amount">Amount</option><option value="percent">%</option></select>
                <input type="text" className="rt" value={x.value} onChange={(ev) => set({ ...x, value: ev.target.value })} />
              </>
            )}
          </div>
        </td>
        <td className="c bl">{on ? 'PC' : ''}</td>
        {isA ? [...mine, ...roR(o)] : [...roA(o), ...mine]}
      </tr>
    );
  });
  return out;
}

export default function RequestForm({ d, edit }) {
  const e = edit || null;
  const lock = !!(e && e.lock);
  const words = numberToWords(d.total || 0);
  const nrb = d.nrb || { n: 'Y', r: 'Y', b: 'Y' };
  const F = (k) => (ev) => e.setHead({ ...e.head, [k]: ev.target.value });
  const P = (k) => (ev) => e.setPay({ ...e.pay, [k]: ev.target.value });

  const nrbBox = (k, label) => (
    <>
      <span>{label}</span>
      {e ? <input className="nb" disabled={lock} maxLength={1} value={e.head.nrb[k]} onChange={(ev) => e.setHead({ ...e.head, nrb: { ...e.head.nrb, [k]: ev.target.value } })} /> : <Box>{nrb[k]}</Box>}
    </>
  );

  return (
    <div className="rf-wrap">
      <style>{CSS}</style>
      <div className="rf-sheet">
        {/* ---------- header ---------- */}
        <div className="rf-top">
          <div className="rf-co">
            <img src="/hkd-logo.png" alt="HKD" />
            <div><div className="n">HKD OUTDOOR INNOVATIONS LTD</div><div className="a">Plot #45-50, Sec#02, Karnaphuli EPZ, Chittagong.</div></div>
          </div>
          <div className="rf-no">No: <span>MIS- {d.billNo}</span></div>
        </div>

        <div className="rf-mid">
          <div className="rf-fields">
            <div className="rf-title">REQUEST FOR PAYMENT</div>
            <div className="rf-line"><span className="k">Date</span>:
              {e ? <input type="date" className="d" disabled={lock} value={e.head.date} onChange={F('date')} /> : <span className="rf-u">{dmy(d.date)}</span>}
            </div>
            <div className="rf-line"><span className="k">Applicant Name</span>:
              {e ? <><input className="d" list="rf-applicants" disabled={lock} value={e.head.applicantName} onChange={F('applicantName')} /><datalist id="rf-applicants">{(e.applicants || []).map((a) => <option key={a} value={a} />)}</datalist></> : <span className="rf-u">{d.applicantName}</span>}
            </div>
            <div className="rf-line"><span className="k">Sector/Line</span>:
              {e ? <input className="d" disabled={lock} value={e.head.sectorLine} onChange={F('sectorLine')} /> : <span className="rf-u">{d.sectorLine}</span>}
            </div>
          </div>
          <table className="rf-appr">
            <thead><tr>{['IC', 'AMGR/MGR', 'AGM', 'GM', 'DIR', 'MD', 'COO'].map((h) => <th key={h}>{h}</th>)}</tr></thead>
            <tbody><tr>{[...Array(7)].map((_, i) => <td key={i} />)}</tr><tr>{[...Array(7)].map((_, i) => <td key={i} />)}</tr></tbody>
          </table>
        </div>

        <div className="rf-nrb">
          {nrbBox('n', 'N (Necessary?)')}<span className="sp" />
          {nrbBox('r', "R (Right Time & Right Q'ty?)")}<span className="sp" />
          {nrbBox('b', 'B (Best Price?)')}
        </div>
        <div className="rf-total">Total Amount : BDT {fmt(d.total || 0)}<span className="w">({words})</span></div>

        {/* ---------- table ---------- */}
        <table className="rf-tbl">
          <colgroup><col style={{ width: '5%' }} /><col style={{ width: '32%' }} /><col style={{ width: '7%' }} /><col style={{ width: '6%' }} /><col style={{ width: '10%' }} /><col style={{ width: '12%' }} /><col style={{ width: '6%' }} /><col style={{ width: '10%' }} /><col style={{ width: '12%' }} /></colgroup>
          <thead>
            <tr><th colSpan={6}>APPLICATION - ADVANCE PAYMENT</th><th colSpan={3}>RESOLUTION</th></tr>
            <tr><th>No.</th><th>Particulars - Goods/Services</th><th>Unit</th><th>Q'ty</th><th>U/P</th><th>Amount (BDT)</th><th>Q'ty</th><th>U/P</th><th>Amount (BDT)</th></tr>
          </thead>
          <tbody>
            {e ? <EditRows d={d} e={e} /> : <ViewRows d={d} />}
            <tr className="thick tot">
              <td colSpan={4}>(A) Total amount paid in advance :</td>
              <td className="r">BDT:</td>
              <td className="r">{e && e.advanceEditable ? <input className="rt" value={e.pay.advancePaid} placeholder={fmt(d.total || 0)} onChange={P('advancePaid')} /> : fmt(d.aTotal || 0)}</td>
              <td colSpan={2} className="sm">(B) Total Resolution BDT:</td>
              <td className="r">{fmt(d.rTotal || 0)}</td>
            </tr>
            <tr className="tot">
              <td colSpan={5}>Net Payable/(refundable) after advance deduction</td>
              <td className="r">{d.netApp == null ? '' : fmt(d.netApp)}</td>
              <td className="r">(A-B)</td><td className="r">BDT:</td>
              <td className="r">{fmt(d.netRes || 0)}</td>
            </tr>
          </tbody>
        </table>

        {/* ---------- payment / budget ---------- */}
        <div className="rf-pay">
          <div className="grp" style={{ flex: 1.1 }}>
            <span>Payment Needed :</span><span>Date :</span>
            {e ? <input type="date" className="d" value={e.pay.paymentDate} onChange={P('paymentDate')} /> : <span className="u">{dmy(d.paymentDate)}</span>}
            <span style={{ whiteSpace: 'nowrap' }}>by Cash/Cheque</span>
          </div>
          <div className="grp">
            <span style={{ whiteSpace: 'nowrap' }}>Settle by the date of :</span>
            {e ? <input type="date" className="d" value={e.pay.settleDate} onChange={P('settleDate')} /> : <span className="u">{dmy(d.settleDate)}</span>}
          </div>
        </div>
        <div className="rf-pay">
          <div className="grp" style={{ flex: 1.1 }}>
            <span>Budget Control :</span><span style={{ whiteSpace: 'nowrap' }}>A/C Name :</span>
            {e ? <input className="d" value={e.pay.budgetAccount} onChange={P('budgetAccount')} /> : <span className="u">{d.budgetAccount}</span>}
          </div>
          <div className="grp">
            <span style={{ whiteSpace: 'nowrap' }}>Budget Remaining :</span><span style={{ whiteSpace: 'nowrap' }}>USD/BDT</span>
            {e ? <input className="d rt" value={e.pay.budgetRemaining} onChange={P('budgetRemaining')} /> : <span className="u" style={{ textAlign: 'right' }}>{d.budgetRemaining || 0}</span>}
          </div>
        </div>

        <div className="rf-rem">Remarks:
          <div className="rf-rembox">{e ? <textarea value={e.remarks} onChange={(ev) => e.setRemarks(ev.target.value)} /> : d.remarks}</div>
        </div>
        <div className="rf-foot"><img src="/hkd-logo.png" alt="" />HKD Group</div>

        <div className="rf-cut" />

        {/* ---------- cashier copy ---------- */}
        <div className="rf-cash">
          <div className="row"><span style={{ fontSize: 13 }}>REQUEST FOR PAYMENT (for Cashier)</span><span>No: <span className="rf-no" style={{ padding: 0 }}><span>MIS- {d.billNo}</span></span></span></div>
          <div className="row"><span>Payment Received in ADVANCE:</span><span style={{ display: 'flex', gap: 6, alignItems: 'baseline' }}>Expected settle Date: <span className="rf-u" style={{ minWidth: 150, display: 'inline-block' }}>{e ? dmy(e.pay.settleDate) : dmy(d.settleDate)}</span></span></div>
          <div className="ind"><span className="k">Amount</span><span>USD/BDT</span><span className="u">BDT {fmt(d.aTotal || 0)}</span></div>
          <div className="ind"><span className="k">Date</span><span className="u" /></div>
          <div className="ind"><span className="k">Recipient Signature</span><span className="u" /></div>
          <div className="ind"><span className="k">Recipient Name</span><span className="u">{e ? e.head.applicantName : d.applicantName}</span></div>
          <div className="rf-foot" style={{ margin: '6px 0 0' }}><img src="/hkd-logo.png" alt="" />HKD Group</div>
        </div>
      </div>
    </div>
  );
}