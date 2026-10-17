import { getDb } from '@/lib/db';
import { wrap, HttpError, body } from '@/lib/http';
export const dynamic = 'force-dynamic';
export const POST = wrap(async (req) => {
  const { username, password } = await body(req);
  const db = await getDb();
  const u = await db.collection('users').findOne({ username: String(username || ''), password: String(password || '') });
  if (!u) throw new HttpError(401, 'Wrong username or password');
  const res = Response.json({ ok: true, name: u.name || u.username });
  res.headers.append('Set-Cookie', `misUser=${encodeURIComponent(u.username)}; Path=/; SameSite=Lax; Max-Age=2592000`);
  return res;
});
