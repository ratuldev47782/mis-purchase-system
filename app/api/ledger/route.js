import { connectDB } from '@/lib/db';
import { wrap } from '@/lib/http';
import { buildLedger } from '@/lib/ledger';
import { fiscalYearOf, todayStr } from '@/lib/calc';
export const dynamic = 'force-dynamic';
export const GET = wrap(async (req) => {
  await connectDB();
  const sp = new URL(req.url).searchParams;
  const month = sp.get('month') || todayStr().slice(0, 7);
  return Response.json(await buildLedger(sp.get('fy') || fiscalYearOf(month), month));
});