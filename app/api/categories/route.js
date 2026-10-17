import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/db';
import { wrap, HttpError, body } from '@/lib/http';
export const dynamic = 'force-dynamic';
const col = async () => (await getDb()).collection('categories');
export const GET = wrap(async () => Response.json(await (await col()).find().sort({ sortOrder: 1, name: 1 }).toArray()));
export const POST = wrap(async (req) => {
  const c = await col(); const name = String((await body(req)).name || '').trim();
  if (!name) throw new HttpError(400, 'Name is required');
  const last = await c.find().sort({ sortOrder: -1 }).limit(1).next();
  await c.insertOne({ name, sortOrder: (last ? last.sortOrder : 0) + 1 });
  return Response.json({ ok: true });
});
export const PUT = wrap(async (req) => {
  const b = await body(req); const name = String(b.name || '').trim();
  if (!name) throw new HttpError(400, 'Name is required');
  await (await col()).updateOne({ _id: new ObjectId(b._id) }, { $set: { name, sortOrder: Number(b.sortOrder) || 0 } });
  return Response.json({ ok: true });
});
export const DELETE = wrap(async (req) => {
  const id = new URL(req.url).searchParams.get('id');
  if (await (await getDb()).collection('bills').findOne({ categoryId: id })) throw new HttpError(400, 'Category is used by bills');
  await (await col()).deleteOne({ _id: new ObjectId(id) });
  return Response.json({ ok: true });
});
