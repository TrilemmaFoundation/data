"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { AnchorHTMLAttributes } from "react";
import FoundationHeader from "./foundation/FoundationHeader";
import { siteCopy } from "@/content/site-copy";
import { isCollectionsPath, isContributePath, isDatasetsPath } from "@/lib/nav";

function LocalLink({ href, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  return <Link href={href} prefetch={false} {...props} />;
}

export function SiteHeader() {
  const pathname = usePathname();
  return <FoundationHeader app="data" pathname={pathname} LinkComponent={LocalLink}>
    <nav className="foundation-local-inner" aria-label="Data navigation">
      <Link href="/" className="foundation-local-brand" aria-label="Trilemma Data home">Data</Link>
      <Link href="/" aria-current={isDatasetsPath(pathname) ? "page" : undefined}>{siteCopy.datasetsNavigationLabel}</Link>
      <Link href="/collections" aria-current={isCollectionsPath(pathname) ? "page" : undefined}>{siteCopy.collectionsNavigationLabel}</Link>
      <Link href="/contribute" prefetch={false} aria-current={isContributePath(pathname) ? "page" : undefined}>{siteCopy.contributeLabel}</Link>
    </nav>
  </FoundationHeader>;
}
