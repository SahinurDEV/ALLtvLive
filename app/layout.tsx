import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Toaster } from "sonner";
import "./globals.css";

const ADSENSE_CLIENT_ID = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ALLtvLive - Free Live TV Channels",
  description:
    "Watch thousands of free live TV channels from around the world.",
  keywords: ["iptv", "live tv", "streaming", "free tv", "channels"],
  openGraph: {
    title: "ALLtvLive - Free Live TV Channels",
    description:
      "Watch thousands of free live TV channels from around the world.",
    type: "website",
    siteName: "ALLtvLive",
  },
  twitter: {
    card: "summary_large_image",
    title: "ALLtvLive - Free Live TV Channels",
    description:
      "Watch thousands of free live TV channels from around the world.",
  },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {ADSENSE_CLIENT_ID && (
          <meta name="google-adsense-account" content={ADSENSE_CLIENT_ID} />
        )}
      </head>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster
            position="bottom-right"
            theme="dark"
            richColors
            closeButton
          />
        </ThemeProvider>
        {ADSENSE_CLIENT_ID && (
          <Script
            id="adsbygoogle-init"
            async
            strategy="afterInteractive"
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`}
            crossOrigin="anonymous"
          />
        )}
      </body>
    </html>
  );
}
