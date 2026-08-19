"use client";

import Image from "next/image";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { siteCopy } from "@/content/site-copy";
import { cn } from "@/lib/utils";
import {
  COLLECTIONS_PATH,
  CONTRIBUTE_APP_PATH,
  FOUNDATION_URL,
} from "@/lib/seo";

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
          <Link
            href="/"
            aria-current={pathname === "/" ? "page" : undefined}
            className={buttonVariants({ variant: "ghost" })}
          >
            {siteCopy.datasetsNavigationLabel}
          </Link>
          <Link
            href={COLLECTIONS_PATH}
            aria-current={pathname.startsWith(COLLECTIONS_PATH) ? "page" : undefined}
            className={buttonVariants({ variant: "ghost" })}
          >
            {siteCopy.collectionsNavigationLabel}
          </Link>
          <Link
            href={CONTRIBUTE_APP_PATH}
            aria-current={pathname === CONTRIBUTE_APP_PATH ? "page" : undefined}
            className={buttonVariants()}
          >
            {siteCopy.contributeLabel}
          </Link>
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
              <Link
                ref={firstMenuLinkRef}
                href="/"
                aria-current={pathname === "/" ? "page" : undefined}
                className={cn(
                  buttonVariants({ variant: "ghost" }),
                  "w-full justify-start",
                )}
                onClick={() => setOpenPathname(null)}
              >
                {siteCopy.datasetsNavigationLabel}
              </Link>
              <Link
                href={COLLECTIONS_PATH}
                aria-current={pathname.startsWith(COLLECTIONS_PATH) ? "page" : undefined}
                className={cn(buttonVariants({ variant: "ghost" }), "w-full justify-start")}
                onClick={() => setOpenPathname(null)}
              >
                {siteCopy.collectionsNavigationLabel}
              </Link>
              <Link
                href={CONTRIBUTE_APP_PATH}
                aria-current={pathname === CONTRIBUTE_APP_PATH ? "page" : undefined}
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
            className="fixed inset-x-0 bottom-0 top-14 z-40 cursor-default bg-brand-black/80 backdrop-blur-sm sm:top-16 md:hidden"
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
