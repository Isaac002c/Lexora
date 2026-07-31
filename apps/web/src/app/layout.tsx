import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Lexora — Gestão Jurídica",
  description: "Lexora, um produto Telun. Plataforma segura de gestão jurídica multi-tenant.",
  applicationName: "Lexora",
  authors: [{ name: "Telun" }],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className="dark">
      <body className={`${inter.variable} min-h-screen font-sans`}>{children}</body>
    </html>
  );
}
