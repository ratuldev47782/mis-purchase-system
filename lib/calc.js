// lib/calc.js

export const AIT_RATE = 0.05;
export const AIT_DIVISOR = 0.95; // AIT = ROUND(subtotal * 5% / 0.95)

export const num = (v) => {
  const n = Number(String(v ?? '').replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
};
export const calcAit = (subtotal) => Math.round((subtotal * AIT_RATE) / AIT_DIVISOR);
export const calcAmount = (qty, unitPrice) => Math.round(num(qty) * num(unitPrice));

function extra(x, subtotal) {
  const on = !!(x && x.on);
  const mode = x && x.mode === 'percent' ? 'percent' : 'amount';
  const value = num(x && x.value);
  const amount = on ? (mode === 'percent' ? Math.round((subtotal * value) / 100) : Math.round(value)) : 0;
  return { on, mode, value, amount };
}

// doc = { items:[{particulars,unit,qty,unitPrice}], ait:{on}, vat:{on,mode,value}, tax:{on,mode,value} }
export function calcDoc(doc = {}) {
  const items = (doc.items || [])
    .map((i) => ({
      particulars: String(i.particulars || ''),
      unit: String(i.unit || ''),
      qty: num(i.qty),
      unitPrice: num(i.unitPrice),
      amount: calcAmount(i.qty, i.unitPrice),
    }))
    .filter((i) => i.particulars.trim() || i.qty > 0 || i.unitPrice > 0);
  const subtotal = items.reduce((s, i) => s + i.amount, 0);
  const aitOn = !!(doc.ait && doc.ait.on);
  const ait = { on: aitOn, amount: aitOn ? calcAit(subtotal) : 0 };
  const vat = extra(doc.vat, subtotal);
  const tax = extra(doc.tax, subtotal);
  const total = subtotal + ait.amount + vat.amount + tax.amount;
  return { items, subtotal, ait, vat, tax, total };
}

// 12 printed rows: 1-9 items, 10 AIT(5%), 11 VAT, 12 TAX
export function docRows(d) {
  const rows = [];
  for (let i = 0; i < 9; i++) rows.push(d && d.items && d.items[i] ? d.items[i] : null);
  rows.push(d && d.ait && d.ait.on ? { particulars: 'AIT(5%)', amount: d.ait.amount } : null);
  rows.push(d && d.vat && d.vat.on ? { particulars: 'VAT', amount: d.vat.amount } : null);
  rows.push(d && d.tax && d.tax.on ? { particulars: 'TAX', amount: d.tax.amount } : null);
  return rows;
}

// Safe arithmetic expression, e.g. "450+950+1100+1400"
export function evalExpr(s) {
  const t = String(s ?? '').replace(/,/g, '').trim();
  if (!t) return null;
  if (!/^[\d+\-*/().\s]+$/.test(t)) throw new Error('Invalid expression');
  // eslint-disable-next-line no-new-func
  const v = Function('"use strict";return (' + t + ')')();
  if (!Number.isFinite(v)) throw new Error('Invalid expression');
  return Math.round(v * 100) / 100;
}

export const fmt = (n) =>
  Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Number to words, lakh/crore system
const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve',
  'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
const two = (n) => (n < 20 ? ONES[n] : TENS[Math.floor(n / 10)] + (n % 10 ? ' ' + ONES[n % 10] : ''));
export function numberToWords(value) {
  let n = Math.round(num(value));
  if (n === 0) return 'Zero Taka Only';
  const parts = [];
  const crore = Math.floor(n / 1e7); n %= 1e7;
  const lakh = Math.floor(n / 1e5); n %= 1e5;
  const th = Math.floor(n / 1e3); n %= 1e3;
  const h = Math.floor(n / 100); const rest = n % 100;
  if (crore) parts.push(two(crore % 100 || crore) + ' Crore');
  if (lakh) parts.push(two(lakh) + ' Lakh');
  if (th) parts.push(two(th) + ' Thousand');
  if (h) parts.push(ONES[h] + ' Hundred');
  if (rest) parts.push(two(rest));
  return parts.join(' ') + ' Taka Only';
}

// Dates / fiscal year (July - June)
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const todayStr = () => new Date().toISOString().slice(0, 10);
export const monthKeyOf = (d) => String(d || '').slice(0, 7); // 'YYYY-MM'
export function formatDate(d) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d || '');
  return m ? `${Number(m[3])}-${MON[Number(m[2]) - 1]}-${m[1]}` : d || '';
}
export const monthName = (key) => MONTH_FULL[Number(String(key).slice(5, 7)) - 1] || '';
export const monthLabel = (key) => (key ? `${monthName(key)} ${String(key).slice(0, 4)}` : '');
export function fiscalYearOf(key) {
  const y = Number(key.slice(0, 4)); const m = Number(key.slice(5, 7));
  const start = m >= 7 ? y : y - 1;
  return `${start}-${start + 1}`;
}
export function fiscalMonths(fy) {
  const start = Number(fy.slice(0, 4));
  const out = [];
  for (let m = 7; m <= 12; m++) out.push(`${start}-${String(m).padStart(2, '0')}`);
  for (let m = 1; m <= 6; m++) out.push(`${start + 1}-${String(m).padStart(2, '0')}`);
  return out;
}
