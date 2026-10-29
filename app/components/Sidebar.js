// app/components/Sidebar.js

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  Laptop,
  Truck,
  Settings,
  LogOut,
  X,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';

const links = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/summary', label: 'Purchase Report', icon: FileText },
  { href: '/ledger', label: 'IT Accessories Sheet', icon: Laptop },
  { href: '/suppliers', label: 'Suppliers', icon: Truck },
  { href: '/settings', label: 'Settings', icon: Settings },
];

const FOCUS =
  'focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-teal-300';

export default function Sidebar({ collapsed, onToggle, open, onClose }) {
  const pathname = usePathname();

  const isActive = (href) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  // labels hide only on desktop when collapsed
  const hideLabel = collapsed ? 'md:hidden' : '';
  const center = collapsed ? 'md:justify-center md:px-0' : '';

  return (
    <>
      {/* Overlay (mobile) */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-[1px] md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`noprint fixed inset-y-0 left-0 z-50 flex w-56 flex-col border-r border-white/5 bg-[#12263F] text-slate-300 shadow-xl transition-all duration-200 md:shadow-none
        ${open ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0
        ${collapsed ? 'md:w-14' : 'md:w-56'}`}
      >
        {/* Header */}
        <div className="flex h-12 items-center gap-2.5 border-b border-white/10 px-2.5">
          <img
            src="/HKD_LOGO.png"
            alt="HKD"
            className={`h-8 w-auto shrink-0 rounded-md bg-white p-0.5 ${collapsed ? 'md:hidden' : ''}`}
          />
          <span className={`min-w-0 leading-tight ${hideLabel}`}>
            <span className="block text-[13px] font-semibold text-white">MIS Purchase</span>
            <span className="block text-[11px] text-slate-400">Billing ERP</span>
          </span>

          {/* Desktop toggle */}
          <button
            type="button"
            onClick={onToggle}
            className={`hidden rounded-md !bg-transparent !px-1.5 !py-1.5 text-slate-400 transition-colors hover:!bg-white/10 hover:text-white md:block ${FOCUS}
            ${collapsed ? 'md:mx-auto' : 'md:ml-auto'}`}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand' : 'Collapse'}
          >
            {collapsed ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}
          </button>

          {/* Mobile close */}
          <button
            type="button"
            onClick={onClose}
            className={`ml-auto rounded-md !bg-transparent !px-1.5 !py-1.5 text-slate-400 transition-colors hover:!bg-white/10 hover:text-white md:hidden ${FOCUS}`}
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Links */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-3" aria-label="Main">
          {links.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                title={collapsed ? label : undefined}
                aria-current={active ? 'page' : undefined}
                className={`relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium no-underline transition-colors ${center} ${FOCUS}
                ${
                  active
                    ? 'bg-white/10 !text-white before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:rounded-r-full before:bg-teal-300'
                    : '!text-slate-300 hover:bg-white/5 hover:!text-white'
                }`}
              >
                <Icon size={18} className={`shrink-0 ${active ? 'text-teal-300' : ''}`} />
                <span className={`truncate ${hideLabel}`}>{label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="border-t border-white/10 p-2">
          <a
            href="/api/logout"
            title={collapsed ? 'Logout' : undefined}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium no-underline transition-colors !text-red-300 hover:bg-red-500/15 hover:!text-red-200 ${center} ${FOCUS}`}
          >
            <LogOut size={18} className="shrink-0" />
            <span className={hideLabel}>Logout</span>
          </a>
        </div>
      </aside>
    </>
  );
}