import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Data Center - Manpower - R&R Dashboard',
  description: 'Roles, Responsibilities & Measurable Objectives Dashboard',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="bg-[#0b111a]">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans antialiased bg-[#0b111a] text-slate-100 h-full">{children}</body>
    </html>
  );
}