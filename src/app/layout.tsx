import type { Metadata } from "next";
import { Schibsted_Grotesk, Source_Sans_3, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import { GoogleAnalytics } from "@next/third-parties/google";

const headingFont = Schibsted_Grotesk({
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
  },
  openGraph: {
    title: "Garden — a digital garden",
    description: "Notes grown in Obsidian, published with a single command.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Garden — a digital garden",
    description: "Notes grown in Obsidian, published with a single command.",
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
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('garden-theme');if(t==='light'){document.documentElement.classList.remove('dark');document.documentElement.classList.add('light');}}catch(e){}})();`,
          }}
        />
      </head>
      <body
        className={`${headingFont.variable} ${bodyFont.variable} ${monoFont.variable} antialiased bg-background text-foreground font-sans`}
      >
        <ThemeProvider>{children}</ThemeProvider>
        <Toaster />
        {process.env.NEXT_PUBLIC_GA_ID && (
          <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />
        )}
      </body>
    </html>
  );
}
