import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import ConvexClientProvider from "@/components/providers/convex-client-provider";
import { Toaster } from "sonner";
import { Header } from "@/components/layout/header";
import { ThemeProvider } from "@/components/theme-provider"

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
    images: [
      {
        url: "/og-image.png",
        width: 512,
        height: 512,
        alt: "SchockStemmer - The Ultimate Schocken Companion",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SchockStemmer",
    description: "The ultimate Schocken companion app.",
    images: ["/og-image.png"],
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
  },
  manifest: "/manifest.json"
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#020617" }, // Matching shadcn slate-950 background
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
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
              <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-8">
                {children}
              </main>
              <footer className="w-full border-t bg-muted/30">
                <div className="max-w-5xl mx-auto px-4 py-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex flex-col items-center md:items-start gap-1">
                    <p className="font-semibold text-foreground">© 2025 SchockStemmer</p>
                    <p>Built with ❤️ by <a href="https://github.com/danihengeveld" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">Dani Hengeveld</a></p>
                  </div>

                  <div className="flex items-center gap-6">
                    <a
                      href="https://github.com/danihengeveld/schockstemmer"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-primary transition-all flex items-center gap-2"
                    >
                      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" aria-hidden="true">
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12c0-6.627-5.373-12-12-12" />
                      </svg>
                      <span>Repository</span>
                    </a>
                    <div className="flex flex-col items-center md:items-end gap-1">
                      <span className="font-mono text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full bg-muted border">v1.2.4</span>
                      <span className="text-[10px]">Production</span>
                    </div>
                  </div>
                </div>
              </footer>
              <Toaster />
            </ThemeProvider>
          </ConvexClientProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
