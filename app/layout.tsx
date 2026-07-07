import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { AppDataProvider } from "@/lib/app-data";
import { PwaSetup } from "@/components/PwaSetup";

export const metadata: Metadata = {
  title: "TimeSight — See where your time actually goes",
  description: "TimeSight learns how long your life actually takes, then helps you plan around reality.",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "TimeSight" },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
};
export const viewport: Viewport = {
  themeColor: "#0B0E14",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AuthProvider>
          <AppDataProvider>
            <PwaSetup />
            {children}
          </AppDataProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
