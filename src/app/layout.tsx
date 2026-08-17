import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Source_Sans_3, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/components/auth/auth-provider";
import { GoogleAnalytics } from "@next/third-parties/google";
import Script from "next/script";
import { PwaRegister } from "@/components/garden/pwa";

const headingFont = Plus_Jakarta_Sans({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const bodyFont = Source_Sans_3({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

const monoFont = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://gardenx.qzz.io"),
  title: "Garden — a digital garden",
  description:
    "A personal digital garden. Notes, essays, and ideas grown in Obsidian and published with a single command.",
  keywords: [
    "digital garden",
    "obsidian",
    "second brain",
    "notes",
    "zettelkasten",
    "knowledge graph",
  ],
  authors: [{ name: "Garden" }],
  icons: {
    icon: "/favicon.svg",
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Garden",
  },
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: "Garden — a digital garden",
    description: "Notes grown in Obsidian, published with a single command.",
    siteName: "Garden",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Garden — a digital garden",
    description: "Notes grown in Obsidian, published with a single command.",
  },
  verification: {
    google: "lqmsnOldQ009_3Y3_afQx7No9_MqhQ5SXXbfDpsJBlI",
  },
  other: {
    "google-adsense-account": process.env.NEXT_PUBLIC_ADSENSE_ID || "",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <head>
        {/* No-flash theme bootstrap — defaults to dark */}
        <script
          id="theme-initializer"
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('garden-theme');if(t==='light'){document.documentElement.classList.remove('dark');document.documentElement.classList.add('light');}}catch(e){}})();`,
          }}
        />
        {/* Deep-link boot veil — the page is static and always ships the home
            view; when a note/view link is opened directly (?p=, ?view=, ?tag=,
            ?q=), hide the app until the client router renders the right view,
            so home never flashes first. Safety-removed after 4s no matter what. */}
        <script
          id="garden-boot"
          dangerouslySetInnerHTML={{
            __html: `(function(){try{if(/[?&](p|view|tag|q)=[^&]/.test(location.search)){var c=document.documentElement.classList;c.add('garden-boot');setTimeout(function(){c.remove('garden-boot');},4000);}}catch(e){}})();`,
          }}
        />
        {/* Google AdSense */}
        {process.env.NEXT_PUBLIC_ADSENSE_ID && (
          <Script
            id="adsense"
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${process.env.NEXT_PUBLIC_ADSENSE_ID}`}
            crossOrigin="anonymous"
            strategy="afterInteractive"
          />
        )}
      </head>
      <body
        className={`${headingFont.variable} ${bodyFont.variable} ${monoFont.variable} antialiased bg-background text-foreground font-sans`}
      >
        <AuthProvider>
          <ThemeProvider>{children}</ThemeProvider>
          <Toaster />
        </AuthProvider>
        <PwaRegister />

        {process.env.NEXT_PUBLIC_GA_ID && (
          <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />
        )}
      </body>
    </html>
  );
}
