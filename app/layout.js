import "./globals.css";

export const metadata = {
  title: "Signal Desk Pro",
  description: "JingLiang 的交易研究台：今日简报、行情、热点和研究",
};

export const viewport = { width: "device-width", initialScale: 1, themeColor: "#000000" };

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..900&family=IBM+Plex+Mono:wght@500;600&family=Noto+Sans+SC:wght@400;500;700;900&display=swap"
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
