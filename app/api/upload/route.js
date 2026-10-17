import fs from 'fs';
import path from 'path';
import { getDb } from '@/lib/db';
import { wrap, HttpError } from '@/lib/http';
export const dynamic = 'force-dynamic';
const ALLOWED = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.webp'];

// POST /api/upload?bill=2155&category=application|resolution   (multipart, field name "file")
export const POST = wrap(async (req) => {
  const sp = new URL(req.url).searchParams;
  const billNo = Number(sp.get('bill')); const category = String(sp.get('category'));
  if (!['application', 'resolution'].includes(category)) throw new HttpError(400, 'Invalid category');
  const db = await getDb();
  if (!(await db.collection('bills').findOne({ billNo }))) throw new HttpError(404, 'Bill not found');

  // Falls back to ./uploads inside the project when UPLOAD_DIR is not set
  const base = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
  const dir = path.join(base, String(billNo));
  try { fs.mkdirSync(dir, { recursive: true }); }
  catch (e) { throw new HttpError(500, `Cannot create upload folder "${dir}" (${e.code}). Check UPLOAD_DIR in .env.local and restart npm run dev.`); }

  let form;
  try { form = await req.formData(); }
  catch (e) { throw new HttpError(400, 'Could not read the uploaded file: ' + e.message); }
  const list = form.getAll('file').filter((f) => typeof f !== 'string' && f.size > 0);
  if (!list.length) throw new HttpError(400, 'No file selected');

  const saved = [];
  for (const f of list) {
    const original = path.basename(f.name || 'file');
    if (!ALLOWED.includes(path.extname(original).toLowerCase())) throw new HttpError(400, 'Only PDF and image files are allowed');
    if (f.size > 25 * 1024 * 1024) throw new HttpError(400, 'File is larger than 25 MB');
    const savedName = `${category}_${Date.now()}_${original.replace(/[^\w.\- ]+/g, '_')}`;
    const savedPath = path.join(dir, savedName);
    fs.writeFileSync(savedPath, Buffer.from(await f.arrayBuffer()));
    saved.push({ category, originalName: original, savedName, savedPath, uploadedAt: new Date() });
  }
  await db.collection('bills').updateOne({ billNo }, { $push: { files: { $each: saved } } });
  return Response.json({ ok: true, message: `${saved.length} file(s) uploaded`, files: saved });
});