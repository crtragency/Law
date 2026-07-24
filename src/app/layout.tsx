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
  title: {
    default: "مِيزان | منصة إدارة مكاتب المحاماة",
    template: "%s | مِيزان",
  },
  description:
    "منصة عربية متكاملة لإدارة القضايا والموكلين والعقود والمالية والموظفين داخل مكتب المحاماة.",
  applicationName: "مِيزان",
  robots: { index: true, follow: true },
  openGraph: {
    title: "مِيزان | منصة إدارة مكاتب المحاماة",
    description:
      "القضايا والموكلون والعقود والمالية والفريق في مساحة تشغيل واحدة.",
    locale: "ar_SA",
    type: "website",
  },
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
