// models.js

// ALL database schemas live in this one file, so every model and every
// relationship is visible at a glance.
//
//   Supplier  1 ---- * Bill          bill.supplierId  (ObjectId, populated ref)
//   Category  1 ---- * Bill          bill.categoryId  (Category._id as string,
//   Category  1 ---- * LedgerEntry   entry.categoryId kept as string so existing
//                                    documents keep working)
//   Category  1 ---- * Item          item.categoryId  (each Goods/Services row has its own category)
//   Bill      1 ----  1 Application  bill.application  (embedded document)
//   Bill      1 ----  0..1 Resolution bill.resolution  (embedded document)
//   Bill      1 ---- * File          bill.files        (embedded array)
//   Bill      1 ---- * LedgerEntry   entry.billNo      (one entry per category used by the bill)
//
// Everything else (saving bills, building the ledger, ...) stays in lib/.
// Collections are named explicitly so they match an existing MongoDB data set.
// ---------------------------------------------------------------------------
import mongoose from 'mongoose';

const { Schema, model, models } = mongoose;

// --- User: cookie login (misUser) ----------------------------------------
const userSchema = new Schema(
  {
    username: { type: String, required: true },
    password: { type: String, required: true },
    name: { type: String, default: '' },
  },
  { collection: 'users' }
);
userSchema.index({ username: 1 }, { unique: true });

// --- Settings: the single "main" document ---------------------------------
const settingsSchema = new Schema(
  {
    _id: { type: String, default: 'main' },
    startingBillNo: { type: Number, default: 1 }, // used only when there are no bills yet
    ledgerAmountMode: { type: String, default: 'subtotal' }, // 'subtotal' | 'total'
  },
  { collection: 'settings' }
);

// --- Category: ledger expense categories ----------------------------------
const categorySchema = new Schema(
  {
    name: { type: String, required: true },
    sortOrder: { type: Number, default: 0 },
  },
  { collection: 'categories' }
);

// --- Supplier -------------------------------------------------------------
const supplierSchema = new Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, default: '' },
    address: { type: String, default: '' },
  },
  { collection: 'suppliers' }
);

// --- Bill: application / resolution documents -----------------------------
// One row of the bill (max 9 rows, amounts recalculated server-side by lib/calc)
// categoryId: Category._id (string). Old bills have no item category -> they fall
// back to bill.categoryId (see lib/billService.js ledgerSplit and app/new/page.js).
const itemSchema = new Schema(
  {
    particulars: { type: String, default: '' },
    unit: { type: String, default: '' },
    categoryId: { type: String, default: '' },
    qty: { type: Number, default: 0 },
    unitPrice: { type: Number, default: 0 },
    amount: { type: Number, default: 0 },
  },
  { _id: false }
);

// VAT / TAX: optional add-on on the subtotal
const extraSchema = new Schema(
  {
    on: { type: Boolean, default: false },
    mode: { type: String, default: 'amount' }, // 'percent' | 'amount'
    value: { type: Number, default: 0 },
    amount: { type: Number, default: 0 },
  },
  { _id: false }
);

// AIT is always "5% of the subtotal", so it only stores { on, amount }
const aitSchema = new Schema(
  { on: { type: Boolean, default: false }, amount: { type: Number, default: 0 } },
  { _id: false }
);

const fileSchema = new Schema(
  {
    category: { type: String, default: 'application' }, // 'application' | 'resolution'
    originalName: { type: String, default: '' },
    savedName: { type: String, default: '' },
    savedPath: { type: String, default: '' },
    uploadedAt: { type: Date },
  },
  { _id: false }
);

// application.js / resolution.js: numbers come from lib/calc, money in BDT
const billDocSchema = new Schema(
  {
    items: { type: [itemSchema], default: [] },
    subtotal: { type: Number, default: 0 },
    ait: aitSchema,
    vat: extraSchema,
    tax: extraSchema,
    total: { type: Number, default: 0 },
    remarks: { type: String, default: '' },
    advancePaid: { type: Number, default: 0 },
    netPayable: { type: Number, default: 0 },
    paymentDate: { type: String, default: '' },
    settleDate: { type: String, default: '' },
    budgetAccount: { type: String, default: '' },
    budgetRemaining: { type: String, default: '' },
  },
  { _id: false }
);

const billSchema = new Schema(
  {
    billNo: { type: Number, required: true },
    sl: { type: Number, default: 0 },
    title: { type: String, default: '' }, // `${billNo} ${fileName}`
    fileName: { type: String, default: '' },
    supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true },
    supplierName: { type: String, default: '' },
    applicantName: { type: String, default: '' },
    sectorLine: { type: String, default: 'MIS/K2' },
    date: { type: String, default: '' }, // 'YYYY-MM-DD'
    dateLabel: { type: String, default: '' },
    nrb: new Schema({ n: { type: String, default: 'Y' }, r: { type: String, default: 'Y' }, b: { type: String, default: 'Y' } }, { _id: false }),
    department: { type: String, default: '' },
    ledgerMonth: { type: String, default: '' }, // 'YYYY-MM'
    // bill-level category = category of the FIRST item (kept for old bills / old code).
    // The real category of every row is item.categoryId.
    categoryId: { type: String, ref: 'Category', default: '' },
    application: billDocSchema,
    resolution: billDocSchema,
    stage: { type: String, default: 'Application' }, // 'Application' | 'Resulation'
    summaryAmount: { type: Number, default: 0 },
    summaryAmountExpr: { type: String, default: '' }, // manual expression, '' = calculated
    summaryManual: { type: Boolean, default: false },
    descManual: { type: Boolean, default: false },
    itemDescription: { type: String, default: '' },
    paymentStatus: { type: String, default: 'Due' }, // 'Due' | 'Paid'
    paidDate: { type: String, default: '' },
    status: { type: String, default: 'Pending ( File Not Given to AC Yet )' },
    files: { type: [fileSchema], default: [] },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { collection: 'bills' }
);
billSchema.index({ billNo: 1 }, { unique: true });

// --- LedgerEntry: one row of the monthly ledger grid ----------------------
// A bill creates ONE entry PER CATEGORY used by its items (billNo is not unique here).
const ledgerEntrySchema = new Schema(
  {
    fiscalYear: { type: String, default: '' }, // '2025-2026' (July - June)
    month: { type: String, default: '' }, // 'YYYY-MM'
    categoryId: { type: String, ref: 'Category', default: '' },
    billNo: { type: Number, default: 0 },
    qty: { type: Number, default: 0 },
    amount: { type: Number, default: 0 },
  },
  { collection: 'ledgerEntries' }
);
ledgerEntrySchema.index({ billNo: 1 });
ledgerEntrySchema.index({ billNo: 1, categoryId: 1 });
ledgerEntrySchema.index({ fiscalYear: 1 });

// models.* guard: re-importing this file (Next.js dev fast-refresh) must not
// try to register the same model twice.
export const User = models.User || model('User', userSchema);
export const Settings = models.Settings || model('Settings', settingsSchema);
export const Category = models.Category || model('Category', categorySchema);
export const Supplier = models.Supplier || model('Supplier', supplierSchema);
export const Bill = models.Bill || model('Bill', billSchema);
export const LedgerEntry = models.LedgerEntry || model('LedgerEntry', ledgerEntrySchema);