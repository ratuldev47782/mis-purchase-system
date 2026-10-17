import { connectDB, getSettings } from '@/lib/db';
import { wrap, HttpError, body } from '@/lib/http';
import { num } from '@/lib/calc';
import { Settings } from '@/models';
export const dynamic = 'force-dynamic';
export const GET = wrap(async () => {
  await connectDB();
  return Response.json(await getSettings());
});
export const PUT = wrap(async (req) => {
  await connectDB();
  const { startingBillNo, ledgerAmountMode } = await body(req);
  const set = {};
  if (startingBillNo !== undefined) { if (num(startingBillNo) < 1) throw new HttpError(400, 'Invalid Starting Bill No'); set.startingBillNo = num(startingBillNo); }
  if (ledgerAmountMode !== undefined) { if (!['subtotal', 'total'].includes(ledgerAmountMode)) throw new HttpError(400, 'Invalid mode'); set.ledgerAmountMode = ledgerAmountMode; }
  await Settings.updateOne({ _id: 'main' }, { $set: set });
  return Response.json({ ok: true, settings: await getSettings() });
});