import './globals.css';
export const metadata = { title: 'MIS Purchase Billing ERP' };
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <nav>
          <b style={{ color: '#fff' }}>MIS Purchase Billing ERP</b>
          <a href="/">Dashboard</a><a href="/summary">Purchase Report</a><a href="/ledger">IT Accessories Sheet</a>
          <a href="/suppliers">Suppliers</a><a href="/settings">Settings</a><a href="/api/logout">Logout</a>
        </nav>
        <main>{children}</main>
      </body>
    </html>
  );
}
