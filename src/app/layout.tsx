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
              <main className="flex-1 w-full max-w-7xl mx-auto flex flex-col">
                {children}
              </main>
              <footer className="p-4 text-center text-sm text-muted-foreground border-t mt-4">
                © 2025 SchockStemmer. Made for fun.
              </footer>
              <Toaster />
            </ThemeProvider>
          </ConvexClientProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
