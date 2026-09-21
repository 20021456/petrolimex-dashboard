import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // App không dùng next/image — tắt Image Optimization để đóng hẳn endpoint
  // /_next/image (nơi từng có lỗi RCE khi xử lý ảnh AVIF qua sharp/libheif).
  images: { unoptimized: true },
  // Không gửi header "X-Powered-By: Next.js" cho bot quét phiên bản.
  poweredByHeader: false,
  reactStrictMode: false, // Disable strict mode to avoid double-rendering issues
  // Suppress hydration warnings from browser extensions
  onDemandEntries: {
    // period (in ms) where the server will keep pages in the buffer
    maxInactiveAge: 25 * 1000,
    // number of pages that should be kept simultaneously without being disposed
    pagesBufferLength: 2,
  },
};

export default nextConfig;

