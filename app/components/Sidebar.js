// app/components/Sidebar.js

'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  FilePlus2,
  Gavel,
  Laptop,
  Truck,
  Settings,
  LogOut,
  X,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';

const sections = [
  {
    label: 'Create',
    links: [
      { href: '/new?type=application', label: 'New Application', icon: FilePlus2 },
      { href: '/new?type=resolution', label: 'New Resolution', icon: Gavel },
    ],
  },
  {
    label: 'Records',
    links: [
      { href: '/', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/summary', label: 'Purchase Report', icon: FileText },
      { href: '/ledger', label: 'IT Accessories Sheet', icon: Laptop },
      { href: '/suppliers', label: 'Suppliers', icon: Truck },
      { href: '/settings', label: 'Settings', icon: Settings },
    ],
  },
];

const FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700/40';

function SidebarInner({ collapsed, onToggle, open, onClose }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const type = params.get('type');

  const isActive = (href) => {
    if (href.startsWith('/new')) {
      // "/new?type=application" is active only on /new with that type
      const t = new URLSearchParams(href.split('?')[1]).get('type');
      return pathname === '/new' && type === t;
    }
    if (href === '/') return pathname === '/';
    if (href === '/summary') return pathname.startsWith('/summary') || pathname.startsWith('/bill');
    return pathname.startsWith(href);
  };

  // labels hide only on desktop when collapsed
  const hideLabel = collapsed ? 'md:hidden' : '';
  const center = collapsed ? 'md:justify-center md:px-0' : '';

  return (
    <>
      {/* Overlay (mobile) */}
      {open && (
        <div className="fixed inset-0 z-40 bg-zinc-900/40 md:hidden" onClick={onClose} />
      )}

      <aside
        className={`noprint fixed inset-y-0 left-0 z-50 flex w-56 flex-col border-r border-zinc-300 bg-white text-zinc-700 transition-all duration-200
        ${open ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0
        ${collapsed ? 'md:w-14' : 'md:w-56'}`}
      >
        {/* Header */}
        <div className="flex h-12 items-center gap-2.5 border-b border-zinc-200 px-2.5">
          <img
            src="/HKD_LOGO.png"
            alt="HKD"
            className={`h-8 w-auto shrink-0 ${collapsed ? 'md:hidden' : ''}`}
          />
          <span className={`min-w-0 leading-tight ${hideLabel}`}>
            <span className="block text-[13px] font-semibold text-zinc-900">MIS Purchase</span>
            <span className="block text-[11px] text-zinc-500">Billing ERP</span>
          </span>

          {/* Desktop toggle */}
          <button
            type="button"
            onClick={onToggle}
            className={`hidden rounded-md !bg-transparent !px-1.5 !py-1.5 text-zinc-500 transition-colors hover:!bg-zinc-100 hover:text-zinc-900 md:block ${FOCUS}
            ${collapsed ? 'md:mx-auto' : 'md:ml-auto'}`}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand' : 'Collapse'}
          >
            {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
          </button>

          {/* Mobile close */}
          <button
            type="button"
            onClick={onClose}
            className={`ml-auto rounded-md !bg-transparent !px-1.5 !py-1.5 text-zinc-500 transition-colors hover:!bg-zinc-100 hover:text-zinc-900 md:hidden ${FOCUS}`}
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Links */}
        <nav className="flex-1 overflow-y-auto px-2 py-3" aria-label="Main">
          {sections.map((sec, si) => (
            <div key={sec.label} className={si > 0 ? 'mt-3 border-t border-zinc-200 pt-3' : ''}>
              <div className={`px-3 pb-1 text-[11px] font-medium uppercase tracking-wide text-zinc-500 ${hideLabel}`}>
                {sec.label}
              </div>
              <div className="space-y-0.5">
                {sec.links.map(({ href, label, icon: Icon }) => {
                  const active = isActive(href);
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={onClose}
                      title={collapsed ? label : undefined}
                      aria-current={active ? 'page' : undefined}
                      className={`relative flex items-center gap-3 rounded-md px-3 py-2 text-[13px] font-medium no-underline transition-colors ${center} ${FOCUS}
                      ${
                        active
                          ? 'bg-zinc-100 !text-teal-900 before:absolute before:inset-y-1.5 before:left-0 before:w-[3px] before:rounded-r-sm before:bg-teal-800'
                          : '!text-zinc-700 hover:bg-zinc-50 hover:!text-zinc-900'
                      }`}
                    >
                      <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-teal-800' : 'text-zinc-500'}`} />
                      <span className={`truncate ${hideLabel}`}>{label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Logout */}
        <div className="border-t border-zinc-200 p-2">
          <a
            href="/api/logout"
            title={collapsed ? 'Logout' : undefined}
            className={`flex items-center gap-3 rounded-md px-3 py-2 text-[13px] font-medium no-underline transition-colors !text-red-700 hover:bg-red-50 ${center} ${FOCUS}`}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span className={hideLabel}>Logout</span>
          </a>
        </div>
      </aside>
    </>
  );
}

// useSearchParams needs a Suspense boundary for production builds
export default function Sidebar(props) {
  return (
    <Suspense fallback={null}>
      <SidebarInner {...props} />
    </Suspense>
  );
}