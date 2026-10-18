// app/components/AppShell.js

'use client';

import { useEffect, useState } from 'react';
import { Menu } from 'lucide-react';
import Sidebar from './Sidebar';

export default function AppShell({ children }) {
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

  return (
    <>
      {/* Mobile top bar */}
      <div className="noprint fixed inset-x-0 top-0 z-40 flex h-12 items-center gap-3 bg-slate-900 px-3 md:hidden">
        <button
          onClick={() => setOpen(true)}
          className="!bg-transparent !px-0 !py-0 text-white"
          aria-label="Open menu"
        >
          <Menu size={22} />
        </button>
        <span className="text-sm font-semibold text-white">MIS Purchase Billing ERP</span>
      </div>

      <Sidebar
        collapsed={collapsed}
        onToggle={toggle}
        open={open}
        onClose={() => setOpen(false)}
      />

      <main
        className={`min-h-screen min-w-0 pt-12 transition-[margin] duration-200 md:pt-0 ${
          collapsed ? 'md:ml-14' : 'md:ml-56'
        }`}
      >
        <div className="app-content min-w-0 p-2 md:p-3">{children}</div>
      </main>
    </>
  );
}