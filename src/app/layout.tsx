import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import ConvexClientProvider from "@/components/providers/convex-client-provider";
import { Toaster } from "sonner";
import { Header } from "@/components/layout/header";
import { ThemeProvider } from "@/components/theme-provider"

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: "SchockStemmer",
  description: "The ultimate Schocken companion app. Track your games, vote on losers, and avoid buying the round.",
  openGraph: {
    title: "SchockStemmer",
    description: "The ultimate Schocken companion app.",
    type: "website",
  },
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
                <div className="max-w-5xl mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
                  © 2025 SchockStemmer. Made for fun.
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
