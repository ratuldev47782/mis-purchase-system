import Link from 'next/link';

const Icon = ({ children }) => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

const icons = {
  file: <Icon><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /><path d="M9 13h6M9 17h4" /></Icon>,
  gavel: <Icon><path d="M14 4l6 6" /><path d="M11 7l6 6-4 4-6-6z" /><path d="M3 21l6-6" /></Icon>,
  chart: <Icon><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></Icon>,
  box: <Icon><path d="M21 8l-9-5-9 5 9 5z" /><path d="M3 8v8l9 5 9-5V8" /><path d="M12 13v8" /></Icon>,
  truck: <Icon><path d="M2 6h11v10H2zM13 10h5l3 3v3h-8z" /><circle cx="6.5" cy="18" r="1.8" /><circle cx="17.5" cy="18" r="1.8" /></Icon>,
  cog: <Icon><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></Icon>,
};

const actions = [
  { href: '/new?type=application', title: 'New Application', hint: 'Start a purchase application', icon: icons.file, tone: 'bg-[#12263F] text-white hover:bg-[#1B3555]', sub: 'text-slate-300' },
  { href: '/new?type=resolution', title: 'New Resolution', hint: 'Record a committee resolution', icon: icons.gavel, tone: 'bg-[#0E7C7B] text-white hover:bg-[#0B6968]', sub: 'text-teal-50/80' },
];

const shortcuts = [
  { href: '/summary', title: 'Purchase Report', hint: 'Totals and purchase history', icon: icons.chart },
  { href: '/ledger', title: 'IT Accessories Sheet', hint: 'Stock and accessory ledger', icon: icons.box },
  { href: '/suppliers', title: 'Suppliers', hint: 'Vendor contacts and details', icon: icons.truck },
  { href: '/settings', title: 'Settings', hint: 'Preferences and configuration', icon: icons.cog },
];

const focus = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0E7C7B]';

export default function Home() {
  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="mx-auto w-full max-w-6xl">
      {/* <div className="mb-6">
        <h1 className="!mb-0 text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-slate-500">{today}</p>
      </div> */}

      {/* Image (shown in full) + primary actions */}
      <section className="mb-6 grid gap-4 lg:grid-cols-3">
        <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200 lg:col-span-2">
          <img src="/HKD_Building_image.jpeg" alt="HKD building" className="block h-auto w-full" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          {actions.map((a) => (
            <Link key={a.href} href={a.href} className={`flex flex-col justify-between rounded-xl p-6 shadow-sm transition ${a.tone} ${focus}`}>
              <span className="mb-8 flex h-10 w-10 items-center justify-center rounded-lg bg-white/15">{a.icon}</span>
              <span>
                <span className="block text-xl font-semibold">{a.title}</span>
                <span className={`mt-1 block text-sm ${a.sub}`}>{a.hint}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Shortcuts */}
      <section aria-label="Records and settings" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {shortcuts.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className={`flex items-start gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 transition hover:ring-[#0E7C7B] ${focus}`}
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#E3F1F1] text-[#0E7C7B]">{s.icon}</span>
            <span>
              <span className="block font-medium text-slate-900">{s.title}</span>
              <span className="mt-0.5 block text-sm text-slate-500">{s.hint}</span>
            </span>
          </Link>
        ))}
      </section>
    </div>
  );
}