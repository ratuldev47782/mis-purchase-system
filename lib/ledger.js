// lib/ledger.js

import { fiscalMonths, fiscalYearOf, todayStr } from './calc';
import { Category, LedgerEntry } from '../models';

// shared by /api/ledger and /api/export/ledger:  ?bill=2164&month=2026-10&fy=2026-2027
export async function resolveLedgerQuery(sp) {
  const billNo = Number(sp.get('bill')) || 0;
  let month = sp.get('month');
  if (!month && billNo) {
    const e = await LedgerEntry.findOne({ billNo }).sort({ month: 1 }).lean();
    month = e && e.month;
  }
  month = month || todayStr().slice(0, 7);
  return { billNo, month, fy: sp.get('fy') || fiscalYearOf(month) };
}

// billNo given  -> highlight ONLY the category rows of that bill (bill + category specific)
// billNo = 0    -> old behavior (rows that have entries in the selected month)
export async function buildLedger(fy, month, billNo = 0) {
  const cats = await Category.find().sort({ sortOrder: 1, name: 1 }).lean();
  const all = await LedgerEntry.find({}).lean();
  const entries = all.filter((e) => e.fiscalYear === fy);
  const months = fiscalMonths(fy);
  const billCats = new Set(billNo ? all.filter((e) => e.billNo === billNo).map((e) => String(e.categoryId)) : []);
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
    const hl = billNo ? billCats.has(String(c._id)) : !!(month && cells[month] && cells[month].bills.length);
    return { id: String(c._id), name: c.name, cells, totalQty: tq, totalAmount: ta, highlight: hl };
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
  return { fy, month, billNo, months, rows, totals, totalQty: gq, totalAmount: ga, fiscalYears: fyList, fyTotals };
}