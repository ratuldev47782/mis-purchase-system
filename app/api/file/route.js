import fs from 'fs';
import path from 'path';
import { connectDB } from '@/lib/db';
import { wrap, HttpError } from '@/lib/http';
import { Bill } from '@/models';

export const dynamic = 'force-dynamic';

const TYPES = {
  '.pdf': 'application/pdf', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp',
};

async function findFile(sp) {
  await connectDB();
  const billNo = Number(sp.get('bill'));
  const bill = await Bill.findOne({ billNo }).lean();
  const f = bill && (bill.files || []).find((x) => x.savedName === sp.get('name'));
  return { billNo, f };
}

// GET /api/file?bill=2155&name=<savedName>   (add &download=1 to download instead of viewing)
export const GET = wrap(async (req) => {
  const sp = new URL(req.url).searchParams;
  const { f } = await findFile(sp);
  if (!f || !fs.existsSync(f.savedPath)) throw new HttpError(404, 'File not found');
  return new Response(fs.readFileSync(f.savedPath), {
    headers: {
      'Content-Type': TYPES[path.extname(f.savedPath).toLowerCase()] || 'application/octet-stream',
      'Content-Disposition': `${sp.get('download') ? 'attachment' : 'inline'}; filename="${encodeURIComponent(f.originalName)}"`,
    },
  });
});

// DELETE /api/file?bill=2155&name=<savedName>   removes the file from disk and from the bill
export const DELETE = wrap(async (req) => {
  const sp = new URL(req.url).searchParams;
  const { billNo, f } = await findFile(sp);
  if (!f) throw new HttpError(404, 'File not found');
  try { if (fs.existsSync(f.savedPath)) fs.unlinkSync(f.savedPath); }
  catch (e) { throw new HttpError(500, 'Could not delete the file from disk: ' + e.message); }
  await Bill.updateOne({ billNo }, { $pull: { files: { savedName: f.savedName } } });
  return Response.json({ ok: true, message: 'File deleted' });
});