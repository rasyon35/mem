import type { Metadata } from 'next';
import './globals.css';
import { WikiProvider } from '@/context/WikiContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { WorkspaceProvider } from '@/context/WorkspaceContext';
import { TeamProvider } from '@/context/TeamContext';

export const metadata: Metadata = {
  title: 'Mem Desktop - Local-First Research Workspace',
  description:
    'Capture research, class notes, and team knowledge into a private local workspace with cloud billing and account management only.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <WikiProvider>
            <WorkspaceProvider>
              <TeamProvider>
                {children}
              </TeamProvider>
            </WorkspaceProvider>
          </WikiProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
