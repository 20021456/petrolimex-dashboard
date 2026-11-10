import type { Metadata } from "next";
// Font Inter tự host qua gói @fontsource-variable/inter (file .woff2 nằm sẵn
// trong node_modules, có đủ subset latin + vietnamese, weight 100–900).
// KHÔNG dùng next/font/google: nó tải font từ Google ngay lúc `next build`,
// nên build/deploy hỏng mỗi khi Google trả về định dạng khác hoặc mạng chập
// chờn ("An error occurred in `next/font`"). Biến --font-inter khai báo trong
// globals.css.
import "@fontsource-variable/inter";
import "./globals.css";
import { PriceDialogProvider } from "@/components/global-price-dialog";
import { SuppressHydrationWarning } from "./suppress-hydration";

export const metadata: Metadata = {
  title: "Fuel Dashboard",
  description: "Dashboard quản lý dữ liệu nhiên liệu",
  icons: {
    icon: [
      { url: '/favicon.png', type: 'image/png' },
      { url: '/icon.png', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
    shortcut: '/favicon.png',
  },
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
        className="antialiased"
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

