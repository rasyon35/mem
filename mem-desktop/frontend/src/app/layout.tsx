import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mem – Personal Knowledge Wiki",
  description: "An AI-powered personal wiki that ingests your notes and builds a queryable knowledge base using Groq LLM.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
