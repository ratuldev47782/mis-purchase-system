import { connectDB } from '@/lib/db';
import { wrap, HttpError, body } from '@/lib/http';
import { Bill, Category } from '@/models';
export const dynamic = 'force-dynamic';

export const GET = wrap(async () => {
  await connectDB();
  return Response.json(await Category.find().sort({ sortOrder: 1, name: 1 }).lean());
});

export const POST = wrap(async (req) => {
  await connectDB();
  const name = String((await body(req)).name || '').trim();
  if (!name) throw new HttpError(400, 'Name is required');
  const last = await Category.findOne().sort({ sortOrder: -1 }).select('sortOrder').lean();
  await Category.create({ name, sortOrder: (last ? last.sortOrder : 0) + 1 });
  return Response.json({ ok: true });
});

export const PUT = wrap(async (req) => {
  await connectDB();
  const b = await body(req);
  const name = String(b.name || '').trim();
  if (!name) throw new HttpError(400, 'Name is required');
  await Category.updateOne({ _id: b._id }, { $set: { name, sortOrder: Number(b.sortOrder) || 0 } });
  return Response.json({ ok: true });
});

export const DELETE = wrap(async (req) => {
  await connectDB();
  const id = new URL(req.url).searchParams.get('id');
  if (await Bill.exists({ categoryId: id })) throw new HttpError(400, 'Category is used by bills');
  await Category.deleteOne({ _id: id });
  return Response.json({ ok: true });
});