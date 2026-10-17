import { getDb } from '@/lib/db';
import { wrap, HttpError, body } from '@/lib/http';
export const dynamic = 'force-dynamic';
import { buildLedger } from '@/lib/ledger';
import { fiscalYearOf, todayStr } from '@/lib/calc';
export const GET = wrap(async (req) => {
  const sp = new URL(req.url).searchParams;
  const month = sp.get('month') || todayStr().slice(0, 7);
  return Response.json(await buildLedger(await getDb(), sp.get('fy') || fiscalYearOf(month), month));
});
