import type { Metadata } from "next";
import { Geist_Mono, Roboto } from "next/font/google";
import { SiteHeader } from "@/components/SiteChrome";
import { SiteFooter } from "@/components/SiteFooter";
import { ShortlistProvider } from "@/components/ShortlistProvider";
import { ShortlistBar } from "@/components/ShortlistBar";
import { PageviewAnalytics } from "@/components/PageviewAnalytics";
import { getCatalogDatasets } from "@/lib/datasets";
import { FOUNDATION_URL, SITE_URL } from "@/lib/seo";
import { siteCopy } from "@/content/site-copy";
import "./globals.css";

const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: siteCopy.name,
    template: `%s · ${siteCopy.name}`,
  },
  description: siteCopy.metadataDescription,
  referrer: "strict-origin-when-cross-origin",
  applicationName: siteCopy.name,
  authors: [{ name: siteCopy.foundationName, url: FOUNDATION_URL }],
  creator: siteCopy.foundationName,
  publisher: siteCopy.foundationName,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: siteCopy.name,
    title: siteCopy.name,
    description: siteCopy.metadataDescription,
    images: [
      {
        url: "/foundation-white.webp",
        width: 1500,
        height: 303,
        alt: siteCopy.foundationName,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteCopy.name,
    description: siteCopy.metadataDescription,
    images: ["/foundation-white.webp"],
  },
  icons: {
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  const knownIds = getCatalogDatasets().map((dataset) => dataset.id);

  return (
    <html
      lang="en"
      className={`${roboto.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <a href="#main-content" className="skip-link">
          {siteCopy.skipLinkLabel}
        </a>
        <ShortlistProvider knownIds={knownIds}>
          <SiteHeader />
          <main id="main-content" className="flex-1" tabIndex={-1}>
            {children}
          </main>
          <ShortlistBar />
          <SiteFooter />
        </ShortlistProvider>
        <PageviewAnalytics />
      </body>
    </html>
  );
}
