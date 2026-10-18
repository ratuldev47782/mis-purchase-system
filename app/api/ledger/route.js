// app/api/ledger/route.js

import { connectDB } from '@/lib/db';
import { wrap } from '@/lib/http';
import { buildLedger, resolveLedgerQuery } from '@/lib/ledger';
export const dynamic = 'force-dynamic';
export const GET = wrap(async (req) => {
  await connectDB();
  const { fy, month, billNo } = await resolveLedgerQuery(new URL(req.url).searchParams);
  return Response.json(await buildLedger(fy, month, billNo));
});