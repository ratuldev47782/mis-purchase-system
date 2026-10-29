// app/settings/page.js

'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/client';

/* ---------------- Tailwind class sets ---------------- */
const FOCUS = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0E7C7B]';
const CARD = 'overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm';
const CARD_HEAD = 'border-b border-slate-200 bg-slate-50 px-5 py-3.5';
const LABEL = 'block text-[13px] font-semibold text-slate-700';
const HINT = 'mt-0.5 block text-xs font-normal text-slate-500';
const FIELD = 'mt-2 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 transition focus:border-[#0E7C7B] focus:outline-none focus:ring-2 focus:ring-teal-100';
const BTN = `inline-flex h-10 items-center justify-center whitespace-nowrap rounded-lg border px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS}`;
const BTN_PRI = `${BTN} border-[#12263F] bg-[#12263F] text-white hover:bg-[#1B3555]`;
const BTN_TEAL = `${BTN} border-[#0E7C7B] bg-[#0E7C7B] text-white hover:bg-[#0B6968]`;
const BTN_RED = `inline-flex h-9 items-center justify-center whitespace-nowrap rounded-lg border border-red-200 bg-white px-3 text-[13px] font-semibold text-red-700 transition hover:bg-red-50 ${FOCUS}`;

export default function Settings() {
  const [s, setS] = useState(null); const [cats, setCats] = useState([]); const [name, setName] = useState(''); const [msg, setMsg] = useState('');
  const load = () => { api('/api/settings').then(setS); api('/api/categories').then(setCats); };
  useEffect(() => { load(); }, []);
  const run = async (fn) => { setMsg(''); try { await fn(); load(); } catch (x) { setMsg(x.message); } };

  if (!s) {
    return (
      <div className="mx-auto max-w-5xl">
        <h1 className="!m-0 text-2xl font-bold tracking-tight text-slate-900">Settings</h1>
        <p className="mt-3 text-sm text-slate-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-5">
        <h1 className="!m-0 text-2xl font-bold tracking-tight text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">Bill numbering, ledger amounts and the item names used in the IT Accessories sheet.</p>
      </div>

      {msg && (
        <div
          role="status"
          className={`mb-4 rounded-lg border px-4 py-2.5 text-sm font-medium ${
            msg === 'Saved'
              ? 'border-green-200 bg-green-50 text-green-800'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {msg}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-5">
        {/* General settings */}
        <section className={`${CARD} lg:col-span-2 lg:self-start`}>
          <div className={CARD_HEAD}>
            <h2 className="!m-0 text-base font-semibold text-slate-900">General</h2>
          </div>
          <div className="space-y-5 p-5">
            <label className={LABEL}>
              Starting Bill No
              <span className={HINT}>Used only when there are no bills yet.</span>
              <input
                className={`${FIELD} tabular-nums`}
                type="number"
                value={s.startingBillNo}
                onChange={(e) => setS({ ...s, startingBillNo: e.target.value })}
              />
            </label>

            <label className={LABEL}>
              Ledger Amount mode
              <span className={HINT}>Which amount goes into the IT Accessories sheet.</span>
              <select
                className={FIELD}
                value={s.ledgerAmountMode}
                onChange={(e) => setS({ ...s, ledgerAmountMode: e.target.value })}
              >
                <option value="subtotal">Subtotal (without AIT/VAT/TAX)</option>
                <option value="total">Total (with tax)</option>
              </select>
            </label>

            <button
              type="button"
              className={`${BTN_PRI} w-full`}
              onClick={() => run(async () => { await api('/api/settings', { method: 'PUT', body: s }); setMsg('Saved'); })}
            >
              Save settings
            </button>
          </div>
        </section>

        {/* Categories */}
        <section className={`${CARD} lg:col-span-3`}>
          <div className={`${CARD_HEAD} flex items-center justify-between gap-3`}>
            <div>
              <h2 className="!m-0 text-base font-semibold text-slate-900">Categories</h2>
              <p className="mt-0.5 text-xs text-slate-500">Item&apos;s Name in the IT Accessories sheet. Edit a name and click away to save it.</p>
            </div>
            <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-700">{cats.length}</span>
          </div>

          <div className="p-5">
            {cats.length ? (
              <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                {cats.map((c, i) => (
                  <li key={c._id} className="flex items-center gap-3 bg-white px-3 py-2 transition hover:bg-slate-50">
                    <span className="w-6 shrink-0 text-center text-xs tabular-nums text-slate-400">{i + 1}</span>
                    <input
                      className="h-9 min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-2 text-sm text-slate-900 transition hover:border-slate-300 focus:border-[#0E7C7B] focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-100"
                      defaultValue={c.name}
                      aria-label={`Category ${i + 1} name`}
                      onBlur={(e) => e.target.value !== c.name && run(() => api('/api/categories', { method: 'PUT', body: { ...c, name: e.target.value } }))}
                    />
                    <button
                      type="button"
                      className={BTN_RED}
                      onClick={() => confirm('Delete category?') && run(() => api('/api/categories?id=' + c._id, { method: 'DELETE' }))}
                    >
                      Delete
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-400">
                No categories yet. Add the first one below.
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              <input
                className="h-10 min-w-[200px] flex-1 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 transition focus:border-[#0E7C7B] focus:outline-none focus:ring-2 focus:ring-teal-100"
                placeholder="New category"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <button
                type="button"
                className={BTN_TEAL}
                onClick={() => run(async () => { await api('/api/categories', { method: 'POST', body: { name } }); setName(''); })}
              >
                Add category
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}