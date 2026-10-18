// app/api/export/ledger/route.js

import { connectDB } from '@/lib/db';
import { wrap } from '@/lib/http';
import { buildLedger, resolveLedgerQuery } from '@/lib/ledger';
import { ledgerWorkbook } from '@/lib/excel';
export const dynamic = 'force-dynamic';
export const GET = wrap(async (req) => {
  await connectDB();
  const { fy, month, billNo } = await resolveLedgerQuery(new URL(req.url).searchParams);
  const L = await buildLedger(fy, month, billNo);
  const buf = await (await ledgerWorkbook(L, month)).xlsx.writeBuffer();
  const name = `IT_Accessories_${month}${billNo ? '_MIS-' + billNo : ''}.xlsx`;
  return new Response(buf, { headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': `attachment; filename="${name}"` } });
});