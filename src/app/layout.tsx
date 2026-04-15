import { Navbar } from "@/components/Navbar";
import { SearchProvider } from "@/contexts/SearchContext";
import { GlobalDetailsModal } from "@/components/GlobalDetailsModal";
import { GlobalFindMyMatchModal } from "@/components/GlobalFindMyMatchModal";
import { GlobalAuthModal } from "@/components/GlobalAuthModal";
import { GlobalOnboarding } from "@/components/OnboardingTour";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { BgTileLoader } from "@/components/BgTileLoader";
import { GlobalAlertsNotifier } from "@/components/GlobalAlertsNotifier";
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
    <html lang="en" className="scroll-smooth" suppressHydrationWarning>
      <head />
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <div className="app-content">
          <ErrorBoundary>
          <SearchProvider>
            <Navbar />
            <Script
              src="https://cdn.lordicon.com/xdjxvujz.js"
              strategy="lazyOnload"
            />
            {/* Suppress noisy unhandled rejections from background auth refresh when offline */}
            <Script id="suppress-auth-refresh-failed" strategy="afterInteractive">
              {`
                try {
                  window.addEventListener('unhandledrejection', function(e){
                    try {
                      var r = e && e.reason; var msg = (r && (r.message || String(r))) || '';
                      if (typeof msg === 'string' && /failed to fetch/i.test(msg)) { e.preventDefault(); }
                    } catch {}
                  });
                } catch {}
              `}
            </Script>
            <BgTileLoader />
            <GlobalAlertsNotifier />
            {children}
            <GlobalDetailsModal />
            <GlobalFindMyMatchModal />
            <GlobalAuthModal />
            <GlobalOnboarding />
          </SearchProvider>
          </ErrorBoundary>
        </div>
      </body>
    </html>
  );
}
