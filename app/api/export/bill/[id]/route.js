// app/api/export/bill/[id]/route.js

// GET /api/export/bill/2164  ->  the REQUEST FOR PAYMENT form as an Excel file

import { connectDB } from '@/lib/db';
import { wrap, HttpError } from '@/lib/http';
import { billWorkbook } from '@/lib/excel';
import { Bill } from '@/models';
export const dynamic = 'force-dynamic';

export const GET = wrap(async (req, { params }) => {
  await connectDB();
  const billNo = Number(params.id);
  const bill = await Bill.findOne({ billNo }).lean();
  if (!bill) throw new HttpError(404, 'Bill not found');
  const buf = await (await billWorkbook(bill)).xlsx.writeBuffer();
  const name = `MIS-${billNo}_${String(bill.fileName || 'Request').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '_')}.xlsx`;
  return new Response(buf, { headers: {
    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'Content-Disposition': `attachment; filename="${name}"`,
  } });
});