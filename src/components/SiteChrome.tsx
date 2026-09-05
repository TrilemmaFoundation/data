"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { siteCopy } from "@/content/site-copy";
import { isCollectionsPath, isContributePath, isDatasetsPath } from "@/lib/nav";

export function SiteHeader() {
  const pathname = usePathname();
  const header = useRef<HTMLElement>(null);
  useEffect(() => {
    const node = header.current;
    if (!node) return;
    const update = () => document.documentElement.style.setProperty("--foundation-shell-height", `${node.getBoundingClientRect().height}px`);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => { observer.disconnect(); document.documentElement.style.removeProperty("--foundation-shell-height"); };
  }, []);
  return <header ref={header} className="data-header foundation-local-nav">
    <nav className="foundation-local-inner" aria-label="Data navigation">
      <Link href="/" className="foundation-local-brand" aria-label="Trilemma Data home">Data</Link>
      <Link href="/" aria-current={isDatasetsPath(pathname) ? "page" : undefined}>{siteCopy.datasetsNavigationLabel}</Link>
      <Link href="/collections" aria-current={isCollectionsPath(pathname) ? "page" : undefined}>{siteCopy.collectionsNavigationLabel}</Link>
      <Link href="/contribute" prefetch={false} aria-current={isContributePath(pathname) ? "page" : undefined}>{siteCopy.contributeLabel}</Link>
    </nav>
  </header>;
}
