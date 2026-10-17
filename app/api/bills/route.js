import { getDb } from '@/lib/db';
import { wrap, HttpError, body } from '@/lib/http';
export const dynamic = 'force-dynamic';
import { saveBill } from '@/lib/billService';
export const GET = wrap(async () => Response.json(await (await getDb()).collection('bills').find().sort({ date: 1, billNo: 1 }).toArray()));
export const POST = wrap(async (req) => Response.json({ ok: true, message: 'Saved', bill: await saveBill(await getDb(), await body(req)) }));
