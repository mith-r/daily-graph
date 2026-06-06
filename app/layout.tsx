import type { Metadata, Viewport } from "next";
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
  title: "Daily Graph",
  description: "A new graph every day. Place yourself, then see where everyone else landed.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0a0a0a",
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
      <body className="min-h-full flex flex-col">
        <div aria-hidden className="px-3 pt-2 sm:px-4 sm:pt-3">
          <span className="text-pink-400 text-sm sm:text-2xl font-bold italic [text-shadow:0_1px_3px_rgba(0,0,0,0.7)]">
            {"“More fun than porn.”"}
          </span>
        </div>
        {children}
      </body>
    </html>
  );
}
