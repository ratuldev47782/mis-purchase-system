import { getDb } from '@/lib/db';
import { wrap, HttpError, body } from '@/lib/http';
export const dynamic = 'force-dynamic';
import { summaryWorkbook } from '@/lib/excel';
export const GET = wrap(async () => {
  const bills = await (await getDb()).collection('bills').find().sort({ date: 1, billNo: 1 }).toArray();
  const buf = await (await summaryWorkbook(bills)).xlsx.writeBuffer();
  return new Response(buf, { headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': 'attachment; filename="MIS_Purchase_Report_Summary.xlsx"' } });
});
