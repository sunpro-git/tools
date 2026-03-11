import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "サンプロ お客様アンケート",
  description: "サンプロのお引渡し後のお客様アンケートにご協力ください",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="antialiased min-h-screen">{children}</body>
    </html>
  );
}
