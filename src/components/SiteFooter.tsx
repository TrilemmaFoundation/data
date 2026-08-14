import Image from "next/image";
import Link from "next/link";
import { siteCopy } from "@/content/site-copy";
import {
  CONTRIBUTE_URL,
  FOUNDATION_CHARTER_URL,
  FOUNDATION_PRIVACY_URL,
  FOUNDATION_PROJECTS_URL,
  FOUNDATION_TEAM_URL,
  FOUNDATION_TERMS_URL,
  FOUNDATION_TOURNAMENTS_URL,
  FOUNDATION_URL,
} from "@/lib/seo";

const foundationLinks = [
  { label: siteCopy.foundationHomeLabel, href: FOUNDATION_URL },
  { label: siteCopy.projectsLabel, href: FOUNDATION_PROJECTS_URL },
  { label: siteCopy.tournamentsLabel, href: FOUNDATION_TOURNAMENTS_URL },
  { label: siteCopy.teamLabel, href: FOUNDATION_TEAM_URL },
] as const;

const legalLinks = [
  { label: siteCopy.charterLabel, href: FOUNDATION_CHARTER_URL },
  { label: siteCopy.privacyLabel, href: FOUNDATION_PRIVACY_URL },
  { label: siteCopy.termsLabel, href: FOUNDATION_TERMS_URL },
] as const;

const footerLinkClass =
  "flex min-h-11 items-center rounded-sm py-2 text-sm text-white transition-colors hover:text-primary sm:text-base";

export function SiteFooter() {
  const copyrightYear = new Date().getFullYear();

  return (
    <footer className="mt-4 border-t border-white/20 bg-linear-to-b from-brand-navy to-brand-black">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-8 lg:grid-cols-4">
          <div className="space-y-4 sm:col-span-2">
            <a
              href={FOUNDATION_URL}
              className="inline-flex min-h-11 items-center rounded-sm"
            >
              <Image
                src="/foundation-white.webp"
                alt={siteCopy.foundationName}
                width={1500}
                height={303}
                className="h-6 w-auto sm:h-8"
              />
            </a>
            <p className="max-w-md text-sm leading-relaxed text-white/80 sm:text-base">
              {siteCopy.footerSummary}
            </p>
          </div>

          <div className="space-y-3 sm:space-y-4">
            <h2 className="text-base font-semibold text-white sm:text-lg">
              {siteCopy.productLabel}
            </h2>
            <nav
              className="flex flex-col"
              aria-label={siteCopy.footerDataNavigationLabel}
            >
              <Link href="/" className={footerLinkClass}>
                {siteCopy.datasetsNavigationLabel}
              </Link>
              <a
                href={CONTRIBUTE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={footerLinkClass}
              >
                {siteCopy.contributeLabel}
              </a>
            </nav>
          </div>

          <div className="space-y-3 sm:space-y-4">
            <h2 className="text-base font-semibold text-white sm:text-lg">
              {siteCopy.foundationLinksLabel}
            </h2>
            <nav
              className="flex flex-col"
              aria-label={siteCopy.footerFoundationNavigationLabel}
            >
              {foundationLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className={footerLinkClass}
                >
                  {link.label}
                </a>
              ))}
            </nav>
          </div>
        </div>

        <div className="mt-6 border-t border-white/20 pt-5 sm:mt-8 sm:pt-6">
          <div className="flex flex-col items-center justify-between gap-3 text-xs text-white/80 sm:flex-row sm:text-sm">
            <div className="text-center sm:text-left">
              <p>{siteCopy.copyright(copyrightYear)}</p>
              <p className="mt-1 text-muted-foreground">
                {siteCopy.hostLabel}
              </p>
            </div>
            <nav
              className="flex flex-wrap justify-center gap-x-4 sm:gap-x-6"
              aria-label={siteCopy.footerLegalNavigationLabel}
            >
              {legalLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="flex min-h-11 items-center rounded-sm py-2 transition-colors hover:text-primary"
                >
                  {link.label}
                </a>
              ))}
            </nav>
          </div>
        </div>
      </div>
    </footer>
  );
}
