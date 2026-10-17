import { connectDB } from '@/lib/db';
import { wrap, HttpError, body } from '@/lib/http';
import { Supplier } from '@/models';
export const dynamic = 'force-dynamic';
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function save(req, isNew) {
  const b = await body(req);
  const name = String(b.name || '').trim();
  if (!name) throw new HttpError(400, 'Supplier name is required');
  const data = { name, phone: b.phone || '', address: b.address || '' };
  const dup = await Supplier
    .findOne({ name: { $regex: '^' + esc(name) + '$', $options: 'i' }, ...(b._id ? { _id: { $ne: b._id } } : {}) })
    .lean();
  if (dup) throw new HttpError(400, 'Supplier already exists');
  if (isNew) {
    const doc = await Supplier.create(data);
    return Response.json({ ok: true, supplier: { ...data, _id: doc._id } });
  }
  await Supplier.updateOne({ _id: b._id }, { $set: data });
  return Response.json({ ok: true });
}
export const GET = wrap(async () => {
  await connectDB();
  return Response.json(await Supplier.find().sort({ name: 1 }).lean());
});
export const POST = wrap((req) => save(req, true));
export const PUT = wrap((req) => save(req, false));