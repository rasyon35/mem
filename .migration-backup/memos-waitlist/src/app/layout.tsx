import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MemOS | The AI-Powered Living Wiki",
  description: "MemOS turns all company information into a living wiki that evolves safely through Git-style version control and human-reviewed AI updates.",
  keywords: ["AI knowledge system", "living wiki", "git-style control", "company wiki", "knowledge management"],
  openGraph: {
    title: "MemOS | The AI-Powered Living Wiki",
    description: "Experience the future of company knowledge. Secure, AI-driven, and human-verified.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable}`}>
      <body style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)' }}>
        <div className="glow-mesh" />
        {children}
      </body>
    </html>
  );
}
