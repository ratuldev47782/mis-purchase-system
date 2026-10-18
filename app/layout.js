// app/layout.js

import './globals.css';
import AppShell from './components/AppShell';

export const metadata = { title: 'MIS Purchase Billing ERP' };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}