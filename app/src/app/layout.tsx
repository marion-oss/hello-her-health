import type { Metadata } from "next";
import { Outfit, Geist_Mono } from "next/font/google";
import { ViewportBlurEdges } from "@/components/ViewportBlurEdges";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Takumiro — Jede Kundenanfrage wird zu organisierter Arbeit",
  description:
    "Takumiro erfasst Anrufe, WhatsApp-Nachrichten und E-Mails und wandelt sie automatisch in strukturierte Aufgaben um.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${outfit.variable} ${geistMono.variable} antialiased`}
        style={{ fontFamily: 'var(--font-outfit), sans-serif' }}
      >
        <ViewportBlurEdges />
        {children}
      </body>
    </html>
  );
}
