import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { Header } from "@/components/layout/Header";
import { MotionProvider } from "@/lib/motion/MotionProvider";
import { SITE_URL, SITE_LIVE } from "@/lib/site";
import "./styles/reference.css";
import "./styles/catalogue.css";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["500", "600", "700", "800"], variable: "--font-jakarta", display: "swap" });
const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Indian Scientific Mart — Laboratory glassware & equipment, Cuttack", template: "%s · Indian Scientific Mart" },
  description: "Wholesale supply of laboratory glassware, chemicals, plastic labware and equipment from Cuttack, Odisha. Browse 29 makers' price lists and request a quote.",
  openGraph: { type: "website", siteName: "Indian Scientific Mart", locale: "en_IN" },
  robots: SITE_LIVE ? { index: true, follow: true } : { index: false, follow: false },
};
export const viewport: Viewport = { themeColor: "#0277B6", width: "device-width", initialScale: 1 };

/* Mark JS early so reveal states apply before first paint (no flash), exactly as the
   reference. If the motion bundle never reports in, drop `.js` so nothing stays hidden. */
const BOOT = `(function(){var d=document.documentElement;d.classList.add("js");
if(matchMedia("(prefers-reduced-motion: reduce)").matches)d.classList.add("reduce");
setTimeout(function(){if(!window.__ismMotion)d.classList.remove("js")},4000);})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={`${jakarta.variable} ${inter.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: BOOT }} />
        <link rel="preconnect" href="https://images.unsplash.com" />
      </head>
      <body>
        <a href="#main" className="skip">Skip to content</a>
        <MotionProvider>
          <Header />
          {children}
        </MotionProvider>
      </body>
    </html>
  );
}
