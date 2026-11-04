// app/page.js

'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { FileText, Gavel, BarChart3, Package, Truck, Settings, ChevronRight } from 'lucide-react';
import { api } from '@/lib/client';
import { fmt, formatDate, todayStr } from '@/lib/calc';

const FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700/40';
const n0 = (v) => Number(v) || 0;
// amount of a bill: summary amount, else resolution total, else application total
const amountOf = (b) => n0(b.summaryAmount ?? b.resolution?.total ?? b.application?.total);

const shortcuts = [
  { href: '/summary', title: 'Purchase Report', Icon: BarChart3 },
  { href: '/ledger', title: 'IT Accessories Sheet', Icon: Package },
  { href: '/suppliers', title: 'Suppliers', Icon: Truck },
  { href: '/settings', title: 'Settings', Icon: Settings },
];

const th = 'px-3 py-2.5 font-medium whitespace-nowrap';
const td = 'px-3 py-2 align-top';

const Kpi = ({ label, value, sub, tone = 'text-zinc-900' }) => (
  <div className="min-w-0 bg-white px-3 py-2.5">
    <div className="text-xs text-zinc-500">{label}</div>
    <div className={`text-xl font-semibold tabular-nums ${tone}`}>{value}</div>
    {sub != null && <div className="mt-0.5 truncate text-xs tabular-nums text-zinc-500">{sub}</div>}
  </div>
);

export default function Home() {
  const [bills, setBills] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    api('/api/bills').then((r) => setBills(Array.isArray(r) ? r : r.bills || [])).catch((e) => setErr(e.message));
  }, []);

  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const stats = useMemo(() => {
    const list = bills || [];
    const month = todayStr().slice(0, 7);
    const due = list.filter((b) => b.paymentStatus !== 'Paid');
    const paid = list.filter((b) => b.paymentStatus === 'Paid');
    const thisMonth = list.filter((b) => (b.ledgerMonth || b.date || '').slice(0, 7) === month);
    const sum = (a) => a.reduce((s, b) => s + amountOf(b), 0);
    return {
      total: list.length,
      due: due.length, dueAmt: sum(due),
      paid: paid.length, paidAmt: sum(paid),
      month: thisMonth.length, monthAmt: sum(thisMonth),
      recent: [...list].sort((a, b) => n0(b.billNo) - n0(a.billNo)).slice(0, 8),
    };
  }, [bills]);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-4">
      {/* title + primary actions */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-zinc-900">Billing Dashboard</h2>
          <p className="mt-0.5 text-sm tabular-nums text-zinc-500">{today}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/new?type=application"
            className={`inline-flex h-9 items-center gap-1.5 rounded-md border border-teal-800 bg-teal-800 px-3.5 text-[13px] font-medium text-white hover:bg-teal-900 ${FOCUS}`}
          >
            <FileText className="h-4 w-4" aria-hidden="true" /> New Application
          </Link>
          <Link
            href="/new?type=resolution"
            className={`inline-flex h-9 items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-3.5 text-[13px] font-medium text-zinc-700 hover:bg-zinc-50 ${FOCUS}`}
          >
            <Gavel className="h-4 w-4" aria-hidden="true" /> New Resolution
          </Link>
        </div>
      </div>

      {err && (
        <div className="rounded-md border border-l-4 border-zinc-300 border-l-red-700 bg-white px-4 py-2.5 text-sm text-red-700">{err}</div>
      )}

      {/* KPI strip: 1px grid lines from gap-px on a zinc-200 background */}
      <div className="grid grid-cols-2 gap-px border border-zinc-300 bg-zinc-200 lg:grid-cols-4">
        <Kpi label="Total bills" value={bills ? stats.total : '-'} />
        <Kpi label="Due" value={bills ? stats.due : '-'} sub={bills ? fmt(stats.dueAmt) : ''} tone="text-red-700" />
        <Kpi label="Paid" value={bills ? stats.paid : '-'} sub={bills ? fmt(stats.paidAmt) : ''} tone="text-teal-800" />
        <Kpi label="This month" value={bills ? stats.month : '-'} sub={bills ? fmt(stats.monthAmt) : ''} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* recent bills */}
        <section className="min-w-0 rounded-md border border-zinc-300 bg-white lg:col-span-2">
          <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
            <div>
              <h3 className="text-sm font-semibold text-zinc-900">Recent bills</h3>
              <p className="mt-0.5 text-xs text-zinc-500">Latest 8 applications and resolutions</p>
            </div>
            <Link href="/summary" className={`inline-flex items-center gap-0.5 text-xs font-medium text-teal-800 hover:underline ${FOCUS}`}>
              View all <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
          <div className="overflow-auto">
            <table className="w-full min-w-[640px] text-left text-[13px]">
              <thead className="sticky top-0 z-10 border-b border-zinc-300 bg-zinc-50 text-zinc-500">
                <tr>
                  <th className={th}>Bill</th>
                  <th className={th}>Supplier</th>
                  <th className={th}>Applicant</th>
                  <th className={th}>Date</th>
                  <th className={`${th} text-right`}>Amount</th>
                  <th className={th}>Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 text-zinc-800 tabular-nums">
                {!bills && !err && (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-zinc-500">Loading...</td></tr>
                )}
                {bills && stats.recent.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-zinc-500">No bills yet</td></tr>
                )}
                {stats.recent.map((b) => {
                  const paid = b.paymentStatus === 'Paid';
                  return (
                    <tr key={b.billNo} className="hover:bg-zinc-50">
                      <td className={td}>
                        <Link href={`/bill/${b.billNo}`} className={`font-medium text-teal-800 hover:underline ${FOCUS}`}>MIS-{b.billNo}</Link>
                        {b.fileName && <div className="max-w-[16rem] truncate text-xs text-zinc-500">{b.fileName}</div>}
                      </td>
                      <td className={td}>{b.supplierName || '-'}</td>
                      <td className={td}>{b.applicantName || '-'}</td>
                      <td className={`${td} whitespace-nowrap`}>{b.date ? formatDate(b.date) : '-'}</td>
                      <td className={`${td} text-right font-medium text-zinc-900`}>{fmt(amountOf(b))}</td>
                      <td className={td}>
                        <span className={`rounded-md border px-2 py-0.5 text-[11px] font-medium ${paid ? 'border-teal-700/40 bg-teal-50 text-teal-900' : 'border-red-300 bg-white text-red-700'}`}>
                          {paid ? 'Paid' : 'Due'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* side column: image + shortcuts */}
        <div className="space-y-4">
          <div className="overflow-hidden rounded-md border border-zinc-300 bg-white">
            {/* file in /public is "Bill ERP Image.jpg": the space must be %20 in the URL */}
            <img src="/Bill%20ERP%20Image.jpg" alt="Billing ERP" className="block h-auto w-full" />
          </div>

          <section className="rounded-md border border-zinc-300 bg-white">
            <div className="border-b border-zinc-200 px-4 py-3">
              <h3 className="text-sm font-semibold text-zinc-900">Records &amp; settings</h3>
            </div>
            <ul className="divide-y divide-zinc-200">
              {shortcuts.map(({ href, title, Icon }) => (
                <li key={href}>
                  <Link href={href} className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50 ${FOCUS}`}>
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-zinc-100 text-teal-800">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="flex-1">{title}</span>
                    <ChevronRight className="h-4 w-4 text-zinc-400" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}