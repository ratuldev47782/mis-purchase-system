// app/settings/page.js

'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/client';

/* ---------------- Theme: Flat Teal & Zinc (Tailwind only) ---------------- */
const FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700/40';
const CARD = 'overflow-hidden rounded-md border border-zinc-300 bg-white';
const CARD_HEAD = 'border-b border-zinc-200 px-4 py-3';
const LABEL = 'block text-[13px] font-medium text-zinc-800';
const HINT = 'mt-0.5 block text-xs font-normal text-zinc-500';
const FIELD = 'mt-1.5 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/25';
const BTN = `inline-flex h-9 items-center justify-center whitespace-nowrap rounded-md border px-4 text-[13px] font-medium disabled:cursor-not-allowed disabled:opacity-60 ${FOCUS}`;
const BTN_PRI = `${BTN} border-teal-800 bg-teal-800 text-white hover:bg-teal-900`;
const BTN_RED = `inline-flex h-8 items-center justify-center whitespace-nowrap rounded-md border border-red-300 bg-white px-3 text-xs font-medium text-red-700 hover:bg-red-50 ${FOCUS}`;

export default function Settings() {
  const [s, setS] = useState(null); const [cats, setCats] = useState([]); const [name, setName] = useState(''); const [msg, setMsg] = useState('');
  const load = () => { api('/api/settings').then(setS); api('/api/categories').then(setCats); };
  useEffect(() => { load(); }, []);
  const run = async (fn) => { setMsg(''); try { await fn(); load(); } catch (x) { setMsg(x.message); } };

  if (!s) {
    return (
      <div className="mx-auto max-w-5xl">
        <h2 className="text-2xl font-semibold text-zinc-900">Settings</h2>
        <p className="mt-3 text-sm text-zinc-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-4">
        <h2 className="text-2xl font-semibold text-zinc-900">Settings</h2>
        <p className="mt-0.5 text-sm text-zinc-500">Bill numbering, ledger amounts and the item names used in the IT Accessories sheet.</p>
      </div>

      {msg && (
        <div
          role="status"
          className={`mb-4 rounded-md border border-l-4 border-zinc-300 bg-white px-4 py-2.5 text-sm ${
            msg === 'Saved' ? 'border-l-teal-700 text-zinc-800' : 'border-l-red-700 text-red-700'
          }`}
        >
          {msg}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-5">
        {/* General settings */}
        <section className={`${CARD} lg:col-span-2 lg:self-start`}>
          <div className={CARD_HEAD}>
            <h3 className="text-sm font-semibold text-zinc-900">General</h3>
          </div>
          <div className="space-y-4 px-4 py-4">
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
              <h3 className="text-sm font-semibold text-zinc-900">Categories</h3>
              <p className="mt-0.5 text-xs text-zinc-500">Item&apos;s Name in the IT Accessories sheet. Edit a name and click away to save it.</p>
            </div>
            <span className="rounded-md border border-zinc-300 bg-zinc-50 px-2 py-0.5 text-xs font-medium tabular-nums text-zinc-700">{cats.length}</span>
          </div>

          <div className="px-4 py-4">
            {cats.length ? (
              <ul className="divide-y divide-zinc-200 rounded-md border border-zinc-300">
                {cats.map((c, i) => (
                  <li key={c._id} className="flex items-center gap-3 bg-white px-3 py-1.5 hover:bg-zinc-50">
                    <span className="w-6 shrink-0 text-center text-xs tabular-nums text-zinc-500">{i + 1}</span>
                    <input
                      className="h-8 min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-2 text-sm text-zinc-900 outline-none hover:border-zinc-300 focus:border-teal-700 focus:bg-white focus:ring-2 focus:ring-teal-700/25"
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
              <div className="rounded-md border border-dashed border-zinc-300 px-4 py-12 text-center text-sm text-zinc-500">
                No categories yet. Add the first one below.
              </div>
            )}

            <div className="mt-3 flex flex-wrap gap-2">
              <input
                className="h-9 min-w-[200px] flex-1 rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/25"
                placeholder="New category"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <button
                type="button"
                className={BTN_PRI}
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