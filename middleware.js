import { NextResponse } from 'next/server';
// Simple auth gate: every page and API route needs the plain cookie misUser.
export function middleware(req) {
  const { pathname } = req.nextUrl;
  const open = pathname === '/login' || pathname === '/api/login';
  const has = req.cookies.get('misUser')?.value;
  if (open || has) return NextResponse.next();
  if (pathname.startsWith('/api/')) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });
  const url = req.nextUrl.clone();
  url.pathname = '/login';
  return NextResponse.redirect(url);
}
export const config = { matcher: ['/((?!_next|favicon.ico|HKD_LOGO.png).*)'] };
