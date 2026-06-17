import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { DEBUG_AUTH_ENABLED } from "@/lib/debug";
import { AnalyticsTracker } from "@/components/AnalyticsTracker";
import { PushRegistrar } from "@/components/PushRegistrar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Daily Graph",
  description: "A new graph every day. Place yourself, then see where everyone else landed.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0a192f",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-[100dvh] flex flex-col">
        <AnalyticsTracker />
        <PushRegistrar />
        {DEBUG_AUTH_ENABLED && (
          <div className="bg-amber-500 text-black text-center text-xs font-medium px-3 py-1">
            ⚠️ Debug auth bypass active — you are the “Debug User”. Disable
            DEBUG_BYPASS_AUTH before deploying.
          </div>
        )}
        {children}
        <footer className="mt-auto px-4 py-3 sm:py-6 text-center text-[11px] leading-relaxed text-white/30">
          Celebrity placements are parody, randomly generated each day, and not
          affiliated with, endorsed by, or representative of any real person.
        </footer>
      </body>
    </html>
  );
}
