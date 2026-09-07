import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AGENTX - Autonomous AI Social Media Manager for X',
  description:
    'Mobile-first agentic AI manager for solopreneurs on X. Research, strategy, drafting, triage, compliance guard, and safe self-evolution.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'AGENTX',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#090a0f',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#090a0f] text-gray-100 selection:bg-cyan-500 selection:text-black">
        {children}
      </body>
    </html>
  );
}
