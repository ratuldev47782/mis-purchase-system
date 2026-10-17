import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/db';
import { wrap, HttpError, body } from '@/lib/http';
export const dynamic = 'force-dynamic';
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
async function save(req, isNew) {
  const col = (await getDb()).collection('suppliers');
  const b = await body(req);
  const name = String(b.name || '').trim();
  if (!name) throw new HttpError(400, 'Supplier name is required');
  const data = { name, phone: b.phone || '', address: b.address || '' };
  const dup = await col.findOne({ name: { $regex: '^' + esc(name) + '$', $options: 'i' }, ...(b._id ? { _id: { $ne: new ObjectId(b._id) } } : {}) });
  if (dup) throw new HttpError(400, 'Supplier already exists');
  if (isNew) { const r = await col.insertOne(data); return Response.json({ ok: true, supplier: { _id: r.insertedId, ...data } }); }
  await col.updateOne({ _id: new ObjectId(b._id) }, { $set: data });
  return Response.json({ ok: true });
}
export const GET = wrap(async () => Response.json(await (await getDb()).collection('suppliers').find().sort({ name: 1 }).toArray()));
export const POST = wrap((req) => save(req, true));
export const PUT = wrap((req) => save(req, false));
