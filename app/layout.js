import './globals.css';
export const metadata = { title: 'MIS Purchase Billing ERP' };
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <nav>
          <img src="/HKD_LOGO.png" alt="HKD" className="h-8 rounded bg-white p-0.5" />
          <b className="text-white">MIS Purchase Billing ERP</b>
          <a href="/">Dashboard</a><a href="/summary">Purchase Report</a><a href="/ledger">IT Accessories Sheet</a>
          <a href="/suppliers">Suppliers</a><a href="/settings">Settings</a><a href="/api/logout" className="ml-auto">Logout</a>
        </nav>
        <main>{children}</main>
      </body>
    </html>
  );
}