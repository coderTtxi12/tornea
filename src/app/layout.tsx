import type { Metadata, Viewport } from "next";
import { Geist_Mono, Poppins } from "next/font/google";

import { AuthProvider } from "@/components/providers/AuthProvider";

import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Tornea",
    template: "%s · Tornea",
  },
  description:
    "Organize tournaments and leagues across sports — Tornea connects competitive communities.",
  applicationName: "Tornea",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#020818",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      data-theme="dark"
      suppressHydrationWarning
      className={`${poppins.variable} ${geistMono.variable} h-full`}
    >
      <body className="flex min-h-dvh flex-col">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
