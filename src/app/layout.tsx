import { Navbar } from "@/components/Navbar";
import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "PawSagip - Community Pet Rescue",
  description:
    "Report lost or found pets, coordinate rescues, and support community adoption efforts with PawSagip.",
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
        <Navbar />
        <Script
          src="https://cdn.lordicon.com/xdjxvujz.js"
          strategy="afterInteractive"
        />
        {children}
      </body>
    </html>
  );
}
