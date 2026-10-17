export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
// Wraps an App Router route handler: errors become { error } JSON and are logged in the terminal
export const wrap = (fn) => async (req, ctx) => {
  try { return await fn(req, ctx); }
  catch (e) {
    console.error(`[API ${req.method} ${new URL(req.url).pathname}]`, e);
    return Response.json({ error: e.message || 'Server error' }, { status: e.status || 500 });
  }
};
export const body = (req) => req.json().catch(() => ({}));