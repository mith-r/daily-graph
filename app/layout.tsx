import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { DEBUG_AUTH_ENABLED } from "@/lib/debug";
import { AnalyticsTracker } from "@/components/AnalyticsTracker";
import { PushRegistrar } from "@/components/PushRegistrar";

const geistSans = Geist({
  variable: "--font-geist-sans",
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
      className={`${geistSans.variable} antialiased`}
    >
      <body className="min-h-[100dvh] flex flex-col">
        {/* Mark the native (Capacitor) shell synchronously, before first paint,
            so the no-scroll layout (gated on `html.native`) applies without a
            flash. The Capacitor bridge injects window.Capacitor at document
            start; PushRegistrar re-applies this post-hydration as a fallback. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var c=window.Capacitor;if(c&&c.isNativePlatform&&c.isNativePlatform())document.documentElement.classList.add('native')}catch(e){}",
          }}
        />
        <AnalyticsTracker />
        <PushRegistrar />
        {DEBUG_AUTH_ENABLED && (
          <div className="bg-amber-500 text-black text-center text-xs font-medium px-3 py-1">
            ⚠️ Debug auth bypass active — you are the “Debug User”. Disable
            DEBUG_BYPASS_AUTH before deploying.
          </div>
        )}
        {children}
      </body>
    </html>
  );
}
