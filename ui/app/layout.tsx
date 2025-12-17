import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { PriceDialogProvider } from "@/components/global-price-dialog";
import { SuppressHydrationWarning } from "./suppress-hydration";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Fuel Dashboard",
  description: "Dashboard quản lý dữ liệu nhiên liệu",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className="dark" suppressHydrationWarning>
      <head>
        <meta name="darkreader-lock" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <SuppressHydrationWarning />
        <PriceDialogProvider>
          {children}
        </PriceDialogProvider>
      </body>
    </html>
  );
}

