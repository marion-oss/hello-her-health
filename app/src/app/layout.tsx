import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ViewportBlurEdges } from "@/components/ViewportBlurEdges";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Unison — Your AI team needs a workspace",
  description:
    "Unison is an AI-native workspace where humans and AI agents collaborate to get work done.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ViewportBlurEdges />
        {children}
      </body>
    </html>
  );
}
