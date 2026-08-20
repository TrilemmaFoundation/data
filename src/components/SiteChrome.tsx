"use client";

import Image from "next/image";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { siteCopy } from "@/content/site-copy";
import {
  isCollectionsPath,
  isContributePath,
  isDatasetsPath,
} from "@/lib/nav";
import { cn } from "@/lib/utils";
import {
  COLLECTIONS_PATH,
  CONTRIBUTE_APP_PATH,
  FOUNDATION_URL,
} from "@/lib/seo";

const primaryLinks = [
  { href: "/", label: siteCopy.datasetsNavigationLabel, current: isDatasetsPath },
  {
    href: COLLECTIONS_PATH,
    label: siteCopy.collectionsNavigationLabel,
    current: isCollectionsPath,
  },
] as const;

function desktopLinkClass(current: boolean) {
  return cn(
    "inline-flex min-h-11 items-center rounded-sm text-sm font-medium no-underline transition-colors xl:text-base",
    current ? "text-primary" : "text-white hover:text-primary",
  );
}

function mobileLinkClass(current: boolean) {
  return cn(
    "flex min-h-11 items-center rounded-lg px-4 text-base font-medium transition-colors",
    current
      ? "bg-primary/20 text-primary"
      : "text-white hover:bg-white/10 hover:text-primary",
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const [openPathname, setOpenPathname] = useState<string | null>(null);
  const menuRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const firstMenuLinkRef = useRef<HTMLAnchorElement>(null);
  const menuOpen = openPathname === pathname;

  if (openPathname !== null && !menuOpen) setOpenPathname(null);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1024px)");
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
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center gap-3 px-4 sm:h-16 sm:px-6">
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
          <span className="hidden h-5 w-px shrink-0 bg-white/20 sm:block" aria-hidden="true" />
          <Link
            href="/"
            aria-label={siteCopy.name}
            className="inline-flex min-h-11 shrink-0 items-center rounded-sm text-sm font-bold tracking-wide text-primary no-underline hover:text-white"
          >
            {siteCopy.productLabel}
          </Link>
        </div>

        <nav
          className="hidden items-center gap-8 lg:flex"
          aria-label={siteCopy.primaryNavigationLabel}
        >
          <div className="flex items-center gap-5 xl:gap-7">
            {primaryLinks.map((link) => {
              const current = link.current(pathname);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={current ? "page" : undefined}
                  className={desktopLinkClass(current)}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
          <Link
            href={CONTRIBUTE_APP_PATH}
            aria-current={isContributePath(pathname) ? "page" : undefined}
            className={buttonVariants()}
          >
            {siteCopy.contributeLabel}
          </Link>
        </nav>

        <button
          ref={menuButtonRef}
          type="button"
          className="ml-auto grid size-11 shrink-0 place-items-center rounded-lg text-white transition-colors hover:bg-white/10 lg:hidden"
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
            className="absolute inset-x-0 top-full z-50 border-t border-white/20 bg-linear-to-b from-brand-navy to-brand-black px-4 py-4 shadow-[0_4px_4px_rgba(10,10,20,0.65)] lg:hidden"
          >
            <div className="mx-auto grid max-w-7xl gap-2">
              {primaryLinks.map((link, index) => {
                const current = link.current(pathname);
                return (
                  <Link
                    key={link.href}
                    ref={index === 0 ? firstMenuLinkRef : undefined}
                    href={link.href}
                    aria-current={current ? "page" : undefined}
                    className={mobileLinkClass(current)}
                    onClick={() => setOpenPathname(null)}
                  >
                    {link.label}
                  </Link>
                );
              })}
              <Link
                href={CONTRIBUTE_APP_PATH}
                aria-current={isContributePath(pathname) ? "page" : undefined}
                className={cn(buttonVariants(), "w-full justify-start")}
                onClick={() => setOpenPathname(null)}
              >
                {siteCopy.contributeLabel}
              </Link>
            </div>
          </nav>
          <button
            type="button"
            tabIndex={-1}
            data-mobile-menu-backdrop
            aria-label={siteCopy.closeNavigationLabel}
            className="fixed inset-x-0 bottom-0 top-14 z-40 cursor-default bg-brand-black/80 backdrop-blur-sm sm:top-16 lg:hidden"
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
