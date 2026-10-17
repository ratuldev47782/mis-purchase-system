import { connectDB } from '@/lib/db';
import { wrap } from '@/lib/http';
import { nextBillNo } from '@/lib/billService';
export const dynamic = 'force-dynamic';
export const GET = wrap(async () => {
  await connectDB();
  return Response.json({ nextBillNo: await nextBillNo() });
});