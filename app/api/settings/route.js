import { getDb } from '@/lib/db';
import { wrap, HttpError, body } from '@/lib/http';
export const dynamic = 'force-dynamic';
import { getSettings } from '@/lib/db';
import { num } from '@/lib/calc';
export const GET = wrap(async () => Response.json(await getSettings(await getDb())));
export const PUT = wrap(async (req) => {
  const db = await getDb();
  const { startingBillNo, ledgerAmountMode } = await body(req);
  const set = {};
  if (startingBillNo !== undefined) { if (num(startingBillNo) < 1) throw new HttpError(400, 'Invalid Starting Bill No'); set.startingBillNo = num(startingBillNo); }
  if (ledgerAmountMode !== undefined) { if (!['subtotal', 'total'].includes(ledgerAmountMode)) throw new HttpError(400, 'Invalid mode'); set.ledgerAmountMode = ledgerAmountMode; }
  await db.collection('settings').updateOne({ _id: 'main' }, { $set: set });
  return Response.json({ ok: true, settings: await getSettings(db) });
});
