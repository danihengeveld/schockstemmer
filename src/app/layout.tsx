import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import ConvexClientProvider from "@/components/providers/convex-client-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next"
import { Inter } from "next/font/google";
import { shadcn } from '@clerk/themes'
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: {
    default: "SchockStemmer",
    template: "%s | SchockStemmer"
  },
  description: "The ultimate Schocken companion app. Track your games, vote on losers, and avoid buying the round.",
  keywords: ["Schocken", "Drinking Game", "Companion App", "SchockStemmer", "Game Tracker", "Schocken App"],
  authors: [{ name: "Dani Hengeveld", url: "https://dani.hengeveld.dev" }],
  creator: "Dani Hengeveld",
  publisher: "SchockStemmer",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL("https://schockstemmer.hengeveld.dev"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "SchockStemmer",
    description: "The ultimate Schocken companion app. Place your bets, track your losses.",
    url: "https://schockstemmer.hengeveld.dev",
    siteName: "SchockStemmer",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SchockStemmer",
    description: "The ultimate Schocken companion app.",
    creator: "@DHengeveld",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  }
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#020617" }, // Matching shadcn slate-950 background
  ],
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider appearance={{ theme: shadcn }}>
      <html lang="en" suppressHydrationWarning>
        <body className={`${inter.variable} antialiased min-h-screen bg-background flex flex-col`}>
          <ConvexClientProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              <Header />
              <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-4 sm:py-8">
                {children}
              </main>
              <Footer />
              <Toaster />
            </ThemeProvider>
          </ConvexClientProvider>
          <Analytics />
        </body>
      </html>
    </ClerkProvider>
  );
}
