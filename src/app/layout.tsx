import type { Metadata } from "next";
import { Alexandria, IBM_Plex_Sans_Arabic } from "next/font/google";
import "./globals.css";

// خط العناوين: Alexandria — هندسي حديث بشخصية واضحة.
const alexandria = Alexandria({
  subsets: ["arabic", "latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

// خط النصوص والواجهة: IBM Plex Sans Arabic — احترافي ومقروء في الأحجام الصغيرة.
const plex = IBM_Plex_Sans_Arabic({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "نظام مكتب المحاماة",
  description: "نظام إدارة القضايا والموظفين والمواعيد لمكتب المحاماة",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" className={`${alexandria.variable} ${plex.variable}`}>
      <body>{children}</body>
    </html>
  );
}
