import { Navbar } from "@/components/Navbar";
import { SearchProvider } from "@/contexts/SearchContext";
import { GlobalDetailsModal } from "@/components/GlobalDetailsModal";
import { GlobalAuthModal } from "@/components/GlobalAuthModal";
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
      <head>
        {/* Preload background images so the composed tile appears without flash */}
        <link rel="preload" as="image" href="/HeaderBackground.png" />
        <link rel="preload" as="image" href="/Continuation.png" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <div className="app-content">
          <SearchProvider>
            <Navbar />
            <Script
              src="https://cdn.lordicon.com/xdjxvujz.js"
              strategy="afterInteractive"
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
            {/* Compose a single tile from HeaderBackground.png + Continuation.png and set as CSS var */}
            <Script id="bg-pair-tile" strategy="beforeInteractive">
              {`
              (function(){
                function composePairTile(header, cont){
                  var w = Math.max(header.naturalWidth || 0, cont.naturalWidth || 0);
                  if(!w) return null;
                  var h1 = Math.round((header.naturalHeight || 0) * (w / (header.naturalWidth || w)));
                  var h2 = Math.round((cont.naturalHeight || 0) * (w / (cont.naturalWidth || w)));
                  var canvas = document.createElement('canvas');
                  canvas.width = w; canvas.height = h1 + h2;
                  var ctx = canvas.getContext('2d');
                  if(!ctx) return null;
                  ctx.drawImage(header, 0, 0, w, h1);
                  ctx.drawImage(cont, 0, h1, w, h2);
                  return 'url(' + canvas.toDataURL('image/png') + ')';
                }
                try {
                  var a = new Image();
                  var b = new Image();
                  var ready = 0;
                  function done(){
                    ready++;
                    if(ready < 2) return;
                    var url = composePairTile(a,b);
                    if(url){
                      document.documentElement.style.setProperty('--bg-pattern-url', url);
                    }
                  }
                  a.onload = done; b.onload = done;
                  a.src = '/HeaderBackground.png';
                  b.src = '/Continuation.png';
                } catch (e) { /* no-op */ }
              })();
            `}
            </Script>
            {children}
            <GlobalDetailsModal />
            <GlobalAuthModal />
          </SearchProvider>
        </div>
      </body>
    </html>
  );
}
