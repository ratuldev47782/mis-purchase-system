// lib/ledger.js
import { fiscalMonths, fiscalYearOf, todayStr } from './calc';
import { Category, LedgerEntry } from '../models';

export async function buildLedger(fy, highlight) {
  const cats = await Category.find().sort({ sortOrder: 1, name: 1 }).lean();
  const all = await LedgerEntry.find({}).lean();
  const entries = all.filter((e) => e.fiscalYear === fy);
  const months = fiscalMonths(fy);
  const totals = {}; months.forEach((m) => (totals[m] = { qty: 0, amount: 0 }));
  let gq = 0; let ga = 0;
  const rows = cats.map((c) => {
    const cells = {}; let tq = 0; let ta = 0;
    months.forEach((m) => {
      const es = entries.filter((e) => e.categoryId === String(c._id) && e.month === m);
      const qty = es.reduce((s, e) => s + e.qty, 0); const amount = es.reduce((s, e) => s + e.amount, 0);
      cells[m] = { qty, amount, bills: es.map((e) => e.billNo) };
      tq += qty; ta += amount; totals[m].qty += qty; totals[m].amount += amount;
    });
    gq += tq; ga += ta;
    return { id: String(c._id), name: c.name, cells, totalQty: tq, totalAmount: ta,
      highlight: !!(highlight && cells[highlight] && cells[highlight].bills.length) };
  });
  const fyList = [...new Set(all.map((e) => e.fiscalYear).filter(Boolean))];
  const cur = fiscalYearOf(todayStr().slice(0, 7));
  if (!fyList.includes(cur)) fyList.push(cur);
  if (!fyList.includes(fy)) fyList.push(fy);
  fyList.sort();
  // "For the Year-xxxx-xxxx" summary rows of the original sheet
  const fyTotals = fyList.map((f) => {
    const es = all.filter((e) => e.fiscalYear === f);
    return { fy: f, qty: es.reduce((s, e) => s + e.qty, 0), amount: es.reduce((s, e) => s + e.amount, 0) };
  });
  return { fy, months, rows, totals, totalQty: gq, totalAmount: ga, fiscalYears: fyList, fyTotals };
}