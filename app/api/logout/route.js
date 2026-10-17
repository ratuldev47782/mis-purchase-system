export const dynamic = 'force-dynamic';
export async function GET(req) {
  return new Response(null, { status: 302, headers: { Location: new URL('/login', req.url).toString(), 'Set-Cookie': 'misUser=; Path=/; Max-Age=0' } });
}
