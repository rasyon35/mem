import type { Metadata } from 'next';
import './globals.css';
import { WikiProvider } from '@/context/WikiContext';

export const metadata: Metadata = {
  title: 'Mem – Personal Knowledge Wiki',
  description: 'An AI-powered personal wiki and team collaboration tool built with decentralized Git logic.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <WikiProvider>
          {children}
        </WikiProvider>
      </body>
    </html>
  );
}
