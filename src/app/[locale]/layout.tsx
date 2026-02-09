import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import ConvexClientProvider from "@/components/providers/convex-client-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next"
import { Inter } from "next/font/google";
import { shadcn } from '@clerk/themes'
import { Toaster } from "@/components/ui/sonner";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { enUS, nlNL } from '@clerk/localizations'
import "../globals.css";

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Metadata' });

  return {
    title: {
      default: "SchockStemmer",
      template: "%s | SchockStemmer"
    },
    description: t('description'),
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
      languages: {
        en: "/en",
        nl: "/nl",
      },
    },
    openGraph: {
      title: "SchockStemmer",
      description: t('ogDescription'),
      url: "https://schockstemmer.hengeveld.dev",
      siteName: "SchockStemmer",
      locale: locale === 'nl' ? 'nl_NL' : 'en_US',
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: "SchockStemmer",
      description: t('twitterDescription'),
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
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  const messages = await getMessages();

  return (
    <ClerkProvider appearance={{ theme: shadcn }} localization={locale === 'nl' ? nlNL : enUS}>
      <html lang={locale} suppressHydrationWarning>
        <body className={`${inter.variable} antialiased min-h-svh bg-background flex flex-col`}>
          <NextIntlClientProvider locale={locale} messages={messages}>
            <ConvexClientProvider>
              <ThemeProvider
                attribute="class"
                defaultTheme="system"
                enableSystem
                disableTransitionOnChange
              >
                <Header />
                <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-3 sm:py-8">
                  {children}
                </main>
                <Footer />
                <Toaster />
              </ThemeProvider>
            </ConvexClientProvider>
          </NextIntlClientProvider>
          <Analytics />
        </body>
      </html>
    </ClerkProvider>
  );
}
