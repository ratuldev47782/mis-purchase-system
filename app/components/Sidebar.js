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
        <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={onClose} />
      )}

      <aside
        className={`noprint fixed inset-y-0 left-0 z-50 flex w-56 flex-col bg-slate-900 text-slate-200 transition-all duration-200
        ${open ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0
        ${collapsed ? 'md:w-14' : 'md:w-56'}`}
      >
        {/* Header */}
        <div className="flex h-12 items-center gap-2 border-b border-slate-700 px-2">
          <img
            src="/HKD_LOGO.png"
            alt="HKD"
            className={`h-8 rounded bg-white p-0.5 ${collapsed ? 'md:hidden' : ''}`}
          />
          <span className={`text-xs font-bold leading-tight text-white ${hideLabel}`}>
            MIS Purchase
            <br />
            Billing ERP
          </span>

          {/* Desktop toggle */}
          <button
            onClick={onToggle}
            className={`hidden !bg-transparent !px-1.5 !py-1.5 text-slate-400 hover:!bg-slate-800 hover:text-white md:block
            ${collapsed ? 'md:mx-auto' : 'md:ml-auto'}`}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand' : 'Collapse'}
          >
            {collapsed ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}
          </button>

          {/* Mobile close */}
          <button
            onClick={onClose}
            className="ml-auto !bg-transparent !px-0 !py-0 text-slate-400 hover:text-white md:hidden"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Links */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              title={collapsed ? label : undefined}
              className={`flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium no-underline transition-colors ${center}
              ${
                isActive(href)
                  ? 'bg-blue-600 !text-white'
                  : '!text-slate-300 hover:bg-slate-800 hover:!text-white'
              }`}
            >
              <Icon size={18} className="shrink-0" />
              <span className={hideLabel}>{label}</span>
            </Link>
          ))}
        </nav>

        {/* Logout */}
        <div className="border-t border-slate-700 p-2">
          <a
            href="/api/logout"
            title={collapsed ? 'Logout' : undefined}
            className={`flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium no-underline transition-colors !text-red-300 hover:bg-red-500/10 hover:!text-red-200 ${center}`}
          >
            <LogOut size={18} className="shrink-0" />
            <span className={hideLabel}>Logout</span>
          </a>
        </div>
      </aside>
    </>
  );
}