import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: { default: "Lexora — Gestão Jurídica", template: "%s · Lexora" },
  description: "Lexora, um produto Telun. Plataforma segura de gestão jurídica multi-tenant.",
  applicationName: "Lexora",
  authors: [{ name: "Telun" }],
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg", shortcut: "/icon.svg", apple: "/icon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className="dark" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: `(function(){try{var p=localStorage.getItem('lexora:theme:global')||'dark';var d=p==='system'?matchMedia('(prefers-color-scheme: dark)').matches:p==='dark';document.documentElement.classList.toggle('dark',d);document.documentElement.dataset.theme=d?'dark':'light';document.documentElement.style.colorScheme=d?'dark':'light'}catch(e){}})()` }} /></head>
      <body className={`${inter.variable} min-h-screen font-sans`}>{children}</body>
    </html>
  );
}
