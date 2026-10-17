import { connectDB, getSettings } from '@/lib/db';
import { wrap, HttpError, body } from '@/lib/http';
import { evalExpr } from '@/lib/calc';
import { ledgerAmount } from '@/lib/billService';
import { Bill, LedgerEntry } from '@/models';

export const dynamic = 'force-dynamic';

async function load(params) {
  await connectDB();
  const billNo = Number(params.id);
  const bill = await Bill.findOne({ billNo }).lean();
  if (!bill) throw new HttpError(404, 'Bill not found');
  return { billNo, bill };
}

export const GET = wrap(async (req, { params }) => Response.json((await load(params)).bill));

export const DELETE = wrap(async (req, { params }) => {
  const { billNo } = await load(params);
  await Bill.deleteOne({ billNo });
  await LedgerEntry.deleteMany({ billNo }); // uploaded files are NOT deleted
  return Response.json({ ok: true, message: 'Bill deleted' });
});

export const PATCH = wrap(async (req, { params }) => {
  const { billNo, bill } = await load(params);
  const b = await body(req);
  const set = {};
  for (const k of ['status', 'dateLabel', 'department', 'paidDate']) if (b[k] !== undefined) set[k] = String(b[k]);
  if (b.itemDescription !== undefined) { set.itemDescription = String(b.itemDescription); set.descManual = true; }
  if (b.sl !== undefined) set.sl = Number(b.sl) || 0;
  if (b.paymentStatus !== undefined) {
    if (!['Due', 'Paid'].includes(b.paymentStatus)) throw new HttpError(400, 'Invalid Due/Paid value');
    set.paymentStatus = b.paymentStatus;
    set.paidDate = b.paymentStatus === 'Paid' ? (b.paidDate || new Date().toISOString().slice(0, 10)) : '';
  }
  if (b.summaryAmountExpr !== undefined) {
    const expr = String(b.summaryAmountExpr).trim();
    if (!expr) {
      set.summaryAmount = ledgerAmount(bill.resolution || bill.application, await getSettings());
      set.summaryAmountExpr = '';
      set.summaryManual = false;
    } else {
      try { set.summaryAmount = evalExpr(expr); } catch (e) { throw new HttpError(400, e.message); }
      set.summaryAmountExpr = expr;
      set.summaryManual = true;
    }
  }
  set.updatedAt = new Date();
  await Bill.updateOne({ billNo }, { $set: set });
  return Response.json({ ok: true, bill: await Bill.findOne({ billNo }).lean() });
});