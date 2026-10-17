import { getDb } from '@/lib/db';
import { wrap, HttpError, body } from '@/lib/http';
export const dynamic = 'force-dynamic';
import { nextBillNo } from '@/lib/billService';
export const GET = wrap(async () => Response.json({ nextBillNo: await nextBillNo(await getDb()) }));
