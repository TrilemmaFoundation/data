"use client";

import Image from "next/image";
import Link from "next/link";
import { ExternalLink, Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const FOUNDATION_URL = "https://www.trilemma.foundation/";
const CONTRIBUTE_URL =
  "https://github.com/TrilemmaFoundation/data/blob/main/CONTRIBUTING.md";

const navigation = [
  { href: "/", label: "Datasets" },
  { href: "/graph", label: "Connections" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!menuOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setMenuOpen(false);
      menuButtonRef.current?.focus();
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [menuOpen]);

  const isActive = (href: string) =>
    href === "/"
      ? pathname === "/" || pathname.startsWith("/datasets/")
      : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0a0a14]/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-4 px-4 sm:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <a
            href={FOUNDATION_URL}
            aria-label="Trilemma Foundation main website"
            className="shrink-0 rounded-sm"
          >
            <Image
              src="/foundation-white.webp"
              alt="Trilemma Foundation"
              width={120}
              height={32}
              priority
              className="h-7 w-auto"
            />
          </a>
          <span className="h-6 w-px bg-white/20" aria-hidden="true" />
          <Link
            href="/"
            className="truncate rounded-sm text-sm font-semibold tracking-wide text-white"
          >
            Data
          </Link>
        </div>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {navigation.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`min-h-11 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                  active
                    ? "bg-primary/15 text-primary"
                    : "text-white/75 hover:bg-white/5 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          <a
            href={CONTRIBUTE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-11 items-center gap-1.5 rounded-lg px-4 py-3 text-sm font-medium text-white/75 transition-colors hover:bg-white/5 hover:text-white"
          >
            Contribute <ExternalLink className="size-3.5" aria-hidden="true" />
          </a>
        </nav>

        <button
          ref={menuButtonRef}
          type="button"
          className="grid size-11 place-items-center rounded-lg text-white transition-colors hover:bg-white/10 md:hidden"
          aria-label={menuOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={menuOpen}
          aria-controls="mobile-navigation"
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        </button>
      </div>

      {menuOpen && (
        <nav
          id="mobile-navigation"
          aria-label="Mobile primary"
          className="absolute inset-x-0 top-full border-b border-white/10 bg-[#0a0a14]/98 px-4 py-3 shadow-2xl backdrop-blur-xl md:hidden"
        >
          <div className="mx-auto grid max-w-7xl gap-1">
            {navigation.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={`min-h-11 rounded-lg px-3 py-3 text-sm font-medium ${
                    active ? "bg-primary/15 text-primary" : "text-white/80"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
            <a
              href={CONTRIBUTE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-11 items-center gap-1.5 rounded-lg px-3 py-3 text-sm font-medium text-white/80"
            >
              Contribute <ExternalLink className="size-3.5" aria-hidden="true" />
            </a>
          </div>
        </nav>
      )}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-white/10 bg-[#0a0a14]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-8 text-sm text-muted-foreground sm:px-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl space-y-3">
          <a
            href={FOUNDATION_URL}
            className="inline-flex min-h-11 items-center text-white hover:text-primary"
          >
            Trilemma Foundation
          </a>
          <p className="leading-relaxed">
            A curated starting point for free, openly licensed data. We link to
            authoritative sources; dataset files are not redistributed or relicensed.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <a
            href={CONTRIBUTE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center gap-1.5 text-white/80 hover:text-primary"
          >
            Contribute <ExternalLink className="size-3.5" aria-hidden="true" />
          </a>
          <span>data.trilemma.foundation</span>
        </div>
      </div>
    </footer>
  );
}
