import { connectDB } from '@/lib/db';
import { wrap, HttpError, body } from '@/lib/http';
import { User } from '@/models';
export const dynamic = 'force-dynamic';
export const POST = wrap(async (req) => {
  const { username, password } = await body(req);
  await connectDB();
  const u = await User.findOne({ username: String(username || ''), password: String(password || '') }).lean();
  if (!u) throw new HttpError(401, 'Wrong username or password');
  const res = Response.json({ ok: true, name: u.name || u.username });
  res.headers.append('Set-Cookie', `misUser=${encodeURIComponent(u.username)}; Path=/; SameSite=Lax; Max-Age=2592000`);
  return res;
});