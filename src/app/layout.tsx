import type { Metadata } from "next";
import { Geist_Mono, Roboto } from "next/font/google";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { SITE_URL } from "@/lib/seo";
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
    default: "Trilemma Data",
    template: "%s · Trilemma Data",
  },
  description:
    "Find actively maintained, authoritative datasets and start a practical data science project.",
  referrer: "strict-origin-when-cross-origin",
  applicationName: "Trilemma Data",
  authors: [{ name: "Trilemma Foundation", url: "https://www.trilemma.foundation/" }],
  creator: "Trilemma Foundation",
  publisher: "Trilemma Foundation",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Trilemma Data",
    title: "Trilemma Data",
    description:
      "Find actively maintained, authoritative datasets and start a practical data science project.",
    images: [
      {
        url: "/foundation-white.webp",
        width: 1500,
        height: 303,
        alt: "Trilemma Foundation",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Trilemma Data",
    description:
      "Find actively maintained, authoritative datasets and start a practical data science project.",
    images: ["/foundation-white.webp"],
  },
  icons: {
    icon: "/favicon-32x32.png",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${roboto.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        <SiteHeader />
        <main id="main-content" className="flex-1" tabIndex={-1}>
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
