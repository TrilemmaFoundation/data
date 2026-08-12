"use client";

import Image from "next/image";
import Link from "next/link";
import { ExternalLink, Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { siteCopy } from "@/content/site-copy";
import { cn } from "@/lib/utils";
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

export function SiteHeader() {
  const pathname = usePathname();
  const [openPathname, setOpenPathname] = useState<string | null>(null);
  const menuRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const firstMenuLinkRef = useRef<HTMLAnchorElement>(null);
  const menuOpen = openPathname === pathname;

  if (openPathname !== null && !menuOpen) setOpenPathname(null);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 768px)");
    const closeAtDesktop = () => {
      if (desktop.matches) setOpenPathname(null);
    };

    desktop.addEventListener("change", closeAtDesktop);
    return () => desktop.removeEventListener("change", closeAtDesktop);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    firstMenuLinkRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenPathname(null);
        menuButtonRef.current?.focus();
        return;
      }
      if (event.key !== "Tab") return;

      const menuItems = menuRef.current
        ? Array.from(
            menuRef.current.querySelectorAll<HTMLElement>(
              'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
            ),
          )
        : [];
      const focusable = [
        ...(menuButtonRef.current ? [menuButtonRef.current] : []),
        ...menuItems,
      ];
      const first = focusable[0];
      const last = focusable.at(-1);

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-50 bg-linear-to-b from-brand-black to-brand-navy">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center gap-4 px-4 sm:h-16 sm:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <a
            href={FOUNDATION_URL}
            aria-label={siteCopy.foundationAriaLabel}
            className="group shrink-0 rounded-sm"
          >
            <Image
              src="/foundation-white.webp"
              alt=""
              width={1500}
              height={303}
              priority
              className="h-6 w-auto transition-transform group-hover:scale-105 sm:h-8"
            />
          </a>
        </div>

        <nav
          className="hidden items-center gap-3 md:flex"
          aria-label={siteCopy.primaryNavigationLabel}
        >
          <a
            href={CONTRIBUTE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants()}
          >
            {siteCopy.contributeLabel}
            <ExternalLink className="size-3.5" aria-hidden="true" />
          </a>
        </nav>

        <button
          ref={menuButtonRef}
          type="button"
          className="grid size-11 place-items-center rounded-lg text-white transition-colors hover:bg-white/10 md:hidden"
          aria-label={
            menuOpen
              ? siteCopy.closeNavigationLabel
              : siteCopy.openNavigationLabel
          }
          aria-expanded={menuOpen}
          aria-controls="mobile-navigation"
          onClick={() => setOpenPathname(menuOpen ? null : pathname)}
        >
          {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        </button>
      </div>

      {menuOpen && (
        <>
          <nav
            ref={menuRef}
            id="mobile-navigation"
            aria-label={siteCopy.mobileNavigationLabel}
            className="absolute inset-x-0 top-full z-50 border-t border-white/20 bg-linear-to-b from-brand-navy to-brand-black px-4 py-4 shadow-[0_4px_4px_rgba(10,10,20,0.65)] md:hidden"
          >
            <div className="mx-auto grid max-w-7xl gap-2">
              <a
                ref={firstMenuLinkRef}
                href={CONTRIBUTE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(buttonVariants(), "w-full justify-start")}
              >
                {siteCopy.contributeLabel}
                <ExternalLink className="size-3.5" aria-hidden="true" />
              </a>
            </div>
          </nav>
          <button
            type="button"
            tabIndex={-1}
            data-mobile-menu-backdrop
            aria-label={siteCopy.closeNavigationLabel}
            className="fixed inset-x-0 bottom-0 top-14 z-40 cursor-default bg-brand-black/55 backdrop-blur-sm sm:top-16 md:hidden"
            onClick={() => {
              setOpenPathname(null);
              menuButtonRef.current?.focus();
            }}
          />
        </>
      )}
    </header>
  );
}

export function SiteFooter() {
  const copyrightYear = new Date().getFullYear();

  return (
    <>
      <div
        className="flex justify-center bg-background py-6 sm:py-8"
        aria-hidden="true"
      >
        <div className="w-4/5 border-t border-white/20 sm:w-2/3" />
      </div>
      <footer className="bg-linear-to-b from-brand-navy to-brand-black">
        <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
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

          <div className="mt-8 border-t border-white/20 pt-6 sm:mt-12 sm:pt-8">
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
    </>
  );
}
