// app/layout.js

import './globals.css';
import { Poppins } from 'next/font/google';
import AppShell from './components/AppShell';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-poppins',
});

export const metadata = { title: 'MIS Purchase Billing ERP' };

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${poppins.variable} ${poppins.className}`}>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}