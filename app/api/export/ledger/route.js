import { getDb } from '@/lib/db';
import { wrap, HttpError, body } from '@/lib/http';
export const dynamic = 'force-dynamic';
import { buildLedger } from '@/lib/ledger';
import { ledgerWorkbook } from '@/lib/excel';
import { fiscalYearOf, todayStr } from '@/lib/calc';
export const GET = wrap(async (req) => {
  const sp = new URL(req.url).searchParams;
  const month = sp.get('month') || todayStr().slice(0, 7);
  const L = await buildLedger(await getDb(), sp.get('fy') || fiscalYearOf(month), month);
  const buf = await (await ledgerWorkbook(L, month)).xlsx.writeBuffer();
  return new Response(buf, { headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': `attachment; filename="IT_Accessories_${month}.xlsx"` } });
});
