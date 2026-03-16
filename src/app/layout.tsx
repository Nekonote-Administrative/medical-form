import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "被害者請求ヒアリングシート",
  description: "交通事故案件ヒアリングフォーム",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-gf-bg">{children}</body>
    </html>
  );
}
