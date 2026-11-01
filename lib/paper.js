// lib/paper.js

// Pure helpers for the REQUEST FOR PAYMENT form (no React) - used by the page, the print page and the Excel export.

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const dmy = (s) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || '');
  return m ? `${m[3]}-${MON[+m[2] - 1]}-${m[1]}` : s || '';
};
const labelOf = (k, x) => (k === 'ait' ? 'AIT(5%)' : `${k.toUpperCase()}${x && x.mode === 'percent' && x.value ? `(${x.value}%)` : ''}`);

export const MIN_ROWS = 9;

// item rows (minimum 9, grows with the number of items) + AIT + VAT + TAX
export function paperRows(A, R) {
  const rows = [];
  const count = Math.max(MIN_ROWS, (A && A.items ? A.items.length : 0), (R && R.items ? R.items.length : 0));
  for (let i = 0; i < count; i++) {
    const a = A && A.items && A.items[i]; const r = R && R.items && R.items[i];
    rows.push({
      p: (a && a.particulars) || (r && r.particulars) || '', unit: (a && a.unit) || (r && r.unit) || '',
      a: a ? { q: a.qty, u: a.unitPrice, t: a.amount } : null, r: r ? { q: r.qty, u: r.unitPrice, t: r.amount } : null,
    });
  }
  ['ait', 'vat', 'tax'].forEach((k) => {
    const a = A && A[k] && A[k].on ? A[k] : null; const r = R && R[k] && R[k].on ? R[k] : null;
    rows.push({
      p: a || r ? labelOf(k, a || r) : '', unit: a || r ? 'PC' : '',
      a: a ? { q: 1, u: a.amount, t: a.amount } : null, r: r ? { q: 1, u: r.amount, t: r.amount } : null,
    });
  });
  return rows;
}

// Saved bill -> data for the paper
export function paperFromBill(b) {
  const A = b.application || null; const R = b.resolution || null; const eff = R || A || {};
  return {
    billNo: b.billNo, date: b.date, applicantName: b.applicantName, sectorLine: b.sectorLine,
    nrb: b.nrb || { n: 'Y', r: 'Y', b: 'Y' }, rows: paperRows(A, R), hasR: !!R,
    total: eff.total || 0, aTotal: A ? A.advancePaid : R ? R.advancePaid : 0, rTotal: R ? R.total : 0,
    netApp: !R && A ? A.netPayable : null, netRes: R ? R.netPayable : 0,
    paymentDate: eff.paymentDate, settleDate: eff.settleDate, budgetAccount: eff.budgetAccount, budgetRemaining: eff.budgetRemaining,
    remarks: (R && R.remarks) || (A && A.remarks) || '',
  };
}