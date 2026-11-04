// app/components/AppShell.js

'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import { IBM_Plex_Sans } from 'next/font/google';
import Sidebar from './Sidebar';

const plex = IBM_Plex_Sans({ subsets: ['latin'], weight: ['400', '500', '600'], display: 'swap' });

const FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700/40';

export default function AppShell({ children }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [open, setOpen] = useState(false); // mobile drawer

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem('sidebar-collapsed') === '1');
    } catch {}
  }, []);

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem('sidebar-collapsed', next ? '1' : '0');
    } catch {}
  };

  // Login page: no sidebar, no top bar, no app shell at all
  if (pathname === '/login') {
    return <div className={plex.className}>{children}</div>;
  }

  return (
    <div className={`bg-zinc-100 text-zinc-900 ${plex.className}`}>
      {/* Mobile top bar: flat white, bordered */}
      <div className="noprint fixed inset-x-0 top-0 z-40 flex h-12 items-center gap-3 border-b border-zinc-300 bg-white px-3 md:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`!rounded-md !border-0 !bg-transparent !px-1 !py-1 text-zinc-700 hover:!bg-zinc-100 ${FOCUS}`}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <span className="text-sm font-semibold text-zinc-900">MIS Purchase Billing ERP</span>
      </div>

      <Sidebar
        collapsed={collapsed}
        onToggle={toggle}
        open={open}
        onClose={() => setOpen(false)}
      />

      {/* h-screen + overflow-auto: the page scrolls inside main, so one-viewport pages can size to 100vh */}
      <main
        className={`h-screen min-w-0 overflow-auto bg-zinc-100 transition-[margin] duration-200 ${
          collapsed ? 'md:ml-14' : 'md:ml-56'
        }`}
      >
        <div className="app-content min-w-0 p-4 pt-16 md:p-5 md:pt-5">{children}</div>
      </main>
    </div>
  );
}