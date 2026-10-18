// lib/billService.js

import { isValidObjectId } from 'mongoose';
import { calcDoc, num, fiscalYearOf, todayStr } from './calc';
import { HttpError } from './http';
import { getSettings } from './db';
import { Bill, Category, LedgerEntry, Supplier } from '../models';

export const ledgerAmount = (eff, settings) => (settings.ledgerAmountMode === 'total' ? eff.total : eff.subtotal);

// One group per category (item level). Sum of group amounts === ledgerAmount(eff),
// so the Monthly Ledger totals never change. Old items without categoryId use the bill-level category.
export function ledgerSplit(eff, fallbackCat, settings) {
  const map = new Map();
  for (const it of eff.items || []) {
    const cid = String(it.categoryId || fallbackCat || '');
    if (!cid) continue;
    const g = map.get(cid) || { categoryId: cid, qty: 0, sub: 0, amount: 0 };
    g.qty += num(it.qty); g.sub += num(it.amount);
    map.set(cid, g);
  }
  const groups = [...map.values()];
  if (!groups.length) return groups;
  if (settings.ledgerAmountMode !== 'total') {
    groups.forEach((g) => { g.amount = g.sub; });
    return groups;
  }
  const extras = eff.total - eff.subtotal; // AIT + VAT + TAX
  let given = 0;
  groups.forEach((g) => {
    g.amount = g.sub + (eff.subtotal ? Math.round((extras * g.sub) / eff.subtotal) : 0);
    given += g.amount;
  });
  const big = groups.reduce((a, b) => (b.sub > a.sub ? b : a));
  big.amount += eff.total - given; // rounding remainder
  return groups;
}

// Replace (never add twice) the ledger entries of a bill: one entry per category
export async function syncLedger(bill, settings) {
  await LedgerEntry.deleteMany({ billNo: bill.billNo });
  const eff = bill.resolution || bill.application;
  if (!eff || !bill.ledgerMonth) return;
  const groups = ledgerSplit(eff, bill.categoryId, settings);
  if (!groups.length) return;
  await LedgerEntry.insertMany(groups.map((g) => ({
    fiscalYear: fiscalYearOf(bill.ledgerMonth),
    month: bill.ledgerMonth,
    categoryId: g.categoryId,
    billNo: bill.billNo,
    qty: g.qty,
    amount: g.amount,
  })));
}

/*
 payload = {
   kind: 'application' | 'resolutionA' | 'resolutionB',
   billNo?, parentBillNo?,
   head: { fileName, supplierId, applicantName, sectorLine, date, dateLabel, department, nrb, ledgerMonth, categoryId? (old clients only) },
   doc:  { items:[{particulars,unit,qty,unitPrice,categoryId}], ait:{on}, vat, tax, remarks },
   pay:  { advancePaid, paymentDate, settleDate, budgetAccount, budgetRemaining }
 }
*/
export async function saveBill(p) {
  const kind = p.kind; const head = p.head || {}; const doc = p.doc || {}; const pay = p.pay || {};
  if (!['application', 'resolutionA', 'resolutionB'].includes(kind)) throw new HttpError(400, 'Invalid bill type');
  const calc = calcDoc(doc);
  if (!calc.items.length) throw new HttpError(400, 'Add at least one item');
  if (calc.items.some((i) => !i.particulars.trim())) throw new HttpError(400, 'Every item needs a Particulars name');
  if (calc.items.some((i) => i.qty <= 0)) throw new HttpError(400, 'Qty must be greater than 0');
  if (calc.items.length > 9) throw new HttpError(400, 'Maximum 9 item rows');

  // every item needs its own valid category (head.categoryId is only a fallback for old API clients)
  const catIds = new Set((await Category.find().select('_id').lean()).map((c) => String(c._id)));
  calc.items.forEach((i) => { i.categoryId = String(i.categoryId || head.categoryId || ''); });
  const badCat = calc.items.findIndex((i) => !catIds.has(i.categoryId));
  if (badCat >= 0) throw new HttpError(400, `Select a Category for item ${badCat + 1}`);

  const settings = await getSettings();
  const targetNo = Number(p.billNo || p.parentBillNo) || null;
  let existing = null;
  if (targetNo) {
    existing = await Bill.findOne({ billNo: targetNo }).lean();
    if (!existing) throw new HttpError(404, 'Bill not found');
  }
  if (kind === 'resolutionA' && !(existing && existing.application)) throw new HttpError(400, 'Select an existing Application first');

  const now = new Date();
  const bill = existing ? { ...existing } : { files: [], paymentStatus: 'Due', status: 'Pending ( File Not Given to AC Yet )', createdAt: now };

  if (kind !== 'resolutionA') {
    if (!head.supplierId) throw new HttpError(400, 'Supplier is required');
    if (!String(head.fileName || '').trim()) throw new HttpError(400, 'File Name is required');
    const sup = isValidObjectId(head.supplierId) ? await Supplier.findById(head.supplierId).lean() : null;
    if (!sup) throw new HttpError(400, 'Supplier not found');
    Object.assign(bill, {
      fileName: head.fileName.trim(), supplierId: sup._id, supplierName: sup.name,
      applicantName: head.applicantName || '', sectorLine: head.sectorLine || 'MIS/K2',
      date: head.date || todayStr(), dateLabel: head.dateLabel || '',
      nrb: head.nrb || { n: 'Y', r: 'Y', b: 'Y' },
    });
  }
  if (head.department !== undefined) bill.department = head.department;
  if (head.ledgerMonth) bill.ledgerMonth = head.ledgerMonth;
  if (!bill.ledgerMonth) throw new HttpError(400, 'Select the Ledger Month');
  // bill-level categoryId is kept (= first item's category) so old code / reports keep working
  bill.categoryId = calc.items[0].categoryId;

  const payFields = (src) => ({
    paymentDate: src.paymentDate || '', settleDate: src.settleDate || '',
    budgetAccount: src.budgetAccount || '', budgetRemaining: src.budgetRemaining || '',
  });
  if (kind === 'application') {
    const adv = pay.advancePaid === '' || pay.advancePaid == null ? calc.total : num(pay.advancePaid);
    bill.application = { ...calc, remarks: doc.remarks || '', advancePaid: adv, netPayable: calc.total - adv, ...payFields(pay) };
  } else {
    const src = kind === 'resolutionA' ? bill.application : pay;
    const adv = kind === 'resolutionA' ? num(bill.application.advancePaid) : num(pay.advancePaid);
    bill.resolution = { ...calc, remarks: doc.remarks || '', advancePaid: adv, netPayable: adv - calc.total, ...payFields(src) };
  }
  bill.stage = bill.resolution ? 'Resolution' : 'Application';

  const eff = bill.resolution || bill.application;
  // Saving from the form always refreshes Summary.
  // Inline edits made in the Summary page stay until the next form save.
  bill.summaryAmount = ledgerAmount(eff, settings);
  bill.summaryAmountExpr = '';
  bill.summaryManual = false;
  bill.itemDescription = eff.items.map((i) => i.particulars).join(', ');
  bill.descManual = false;
  bill.updatedAt = now;

  const { _id, __v, ...rest } = bill;
  if (existing) {
    bill.title = `${bill.billNo} ${bill.fileName}`;
    await Bill.updateOne({ _id }, { $set: { ...rest, title: bill.title } });
  } else {
    // Bill No is assigned here on the server: latest + 1 (or Starting Bill No). Unique index guards duplicates.
    for (let t = 0; t < 6; t++) {
      const last = await Bill.findOne().sort({ billNo: -1 }).select('billNo').lean();
      const lastSl = await Bill.findOne().sort({ sl: -1 }).select('sl').lean();
      const billNo = last ? last.billNo + 1 : num(settings.startingBillNo) || 1;
      try {
        await Bill.create({ ...rest, billNo, title: `${billNo} ${bill.fileName}`, sl: (lastSl && lastSl.sl ? lastSl.sl : 0) + 1 });
        bill.billNo = billNo;
        break;
      } catch (e) {
        if (e.code === 11000 && t < 5) continue;
        throw e;
      }
    }
  }
  await syncLedger(bill, settings);
  return Bill.findOne({ billNo: bill.billNo }).lean();
}

export async function nextBillNo() {
  const settings = await getSettings();
  const last = await Bill.findOne().sort({ billNo: -1 }).select('billNo').lean();
  return last ? last.billNo + 1 : num(settings.startingBillNo);
}