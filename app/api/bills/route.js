// app/api/bills/route.js

// app/api/bills/route.js

import { connectDB } from '@/lib/db';
import { wrap, body } from '@/lib/http';
import { saveBill } from '@/lib/billService';
import { Bill } from '@/models';
export const dynamic = 'force-dynamic';
export const GET = wrap(async () => {
  await connectDB();
  return Response.json(await Bill.find().sort({ date: 1, billNo: 1 }).lean());
});
export const POST = wrap(async (req) => {
  await connectDB();
  return Response.json({ ok: true, message: 'Saved', bill: await saveBill(await body(req)) });
});