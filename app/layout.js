import "./globals.css";

export const metadata = {
  title: "Signal Desk Pro",
  description: "发现 → 研究 → 决定 → 复盘 · 个人交易研究台",
};

export const viewport = { width: "device-width", initialScale: 1, themeColor: "#0b1220" };

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&family=Space+Grotesk:wght@500;700&family=Noto+Sans+SC:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
        <link
          rel="icon"
          href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect x='4' y='6' width='10' height='20' rx='2' fill='%23f5b62e'/><rect x='18' y='6' width='10' height='20' rx='2' fill='%233ecfa3' transform='rotate(14 23 16)'/></svg>"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
