import type { Metadata, Viewport } from "next";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import AuthGuard from "@/components/AuthGuard";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import XpToastHost from "@/components/XpToastHost";

export const metadata: Metadata = {
  title: "FridgeAI – Smart Meal Tracker",
  description:
    "Scanne deinen Kühlschrank per KI, verwalte Lebensmittel und erhalte passende Rezeptvorschläge.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "FridgeAI",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#16a34a",
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body className="font-sans antialiased">
        <ServiceWorkerRegister />
        <XpToastHost />
        <div className="max-w-md mx-auto min-h-screen pb-24 relative">
          <AuthGuard>{children}</AuthGuard>
        </div>
        <BottomNav />
      </body>
    </html>
  );
}
