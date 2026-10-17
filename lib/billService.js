// lib/billService.js

import { isValidObjectId } from 'mongoose';
import { calcDoc, num, fiscalYearOf, todayStr } from './calc';
import { HttpError } from './http';
import { getSettings } from './db';
import { Bill, LedgerEntry, Supplier } from '../models';

export const ledgerAmount = (eff, settings) => (settings.ledgerAmountMode === 'total' ? eff.total : eff.subtotal);

// Replace (never add twice) the ledger entry of a bill
export async function syncLedger(bill, settings) {
  await LedgerEntry.deleteMany({ billNo: bill.billNo });
  const eff = bill.resolution || bill.application;
  if (!eff || !bill.ledgerMonth || !bill.categoryId) return;
  await LedgerEntry.create({
    fiscalYear: fiscalYearOf(bill.ledgerMonth),
    month: bill.ledgerMonth,
    categoryId: String(bill.categoryId),
    billNo: bill.billNo,
    qty: eff.items.reduce((s, i) => s + i.qty, 0),
    amount: ledgerAmount(eff, settings),
  });
}

/*
 payload = {
   kind: 'application' | 'resolutionA' | 'resolutionB',
   billNo?        (editing an existing application / direct resolution),
   parentBillNo?  (resolutionA: the application this resolution belongs to),
   head: { fileName, supplierId, applicantName, sectorLine, date, dateLabel, department, nrb, ledgerMonth, categoryId },
   doc:  { items, ait:{on}, vat:{on,mode,value}, tax:{on,mode,value}, remarks },
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
  if (head.categoryId) bill.categoryId = String(head.categoryId);
  if (!bill.ledgerMonth || !bill.categoryId) throw new HttpError(400, 'Select the Ledger Month and Category');

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