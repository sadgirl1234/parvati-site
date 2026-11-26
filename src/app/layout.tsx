import type { Metadata } from "next";
import { Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import FlowerBurst from "@/components/FlowerBurst";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-heading",
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Kumari Parvati Singh | Official Website",
  description: "Welcome to Kumari Parvati Singh's personal website.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable}`}
    >
      <body className="min-h-screen flex flex-col bg-gradient-to-br from-rose-50 via-white to-pink-50 text-slate-900 antialiased relative">
        <FlowerBurst />
        <Navbar />
        <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 pt-24 pb-16">
          {children}
        </main>
        <footer className="py-6 text-center text-xs font-mono text-slate-500 border-t border-rose-100 bg-white/60">
          © 2026 Kumari Parvati Singh 🌸
        </footer>
      </body>
    </html>
  );
}