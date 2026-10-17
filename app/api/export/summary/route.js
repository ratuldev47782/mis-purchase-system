// app/api/export/summary/route.js

import { connectDB } from '@/lib/db';
import { wrap } from '@/lib/http';
import { summaryWorkbook } from '@/lib/excel';
import { Bill } from '@/models';
export const dynamic = 'force-dynamic';
export const GET = wrap(async () => {
  await connectDB();
  const bills = await Bill.find().sort({ date: 1, billNo: 1 }).lean();
  const buf = await (await summaryWorkbook(bills)).xlsx.writeBuffer();
  return new Response(buf, { headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': 'attachment; filename="MIS_Purchase_Report_Summary.xlsx"' } });
});