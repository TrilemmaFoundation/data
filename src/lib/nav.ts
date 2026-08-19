import { COLLECTIONS_PATH, COMPARE_PATH, CONTRIBUTE_APP_PATH } from "./seo";

function normalizePath(pathname: string): string {
  return pathname.length > 1 && pathname.endsWith("/")
    ? pathname.slice(0, -1)
    : pathname;
}

function isSectionPath(pathname: string, href: string): boolean {
  const path = normalizePath(pathname);
  const base = normalizePath(href);
  return path === base || path.startsWith(`${base}/`);
}

export function isDatasetsPath(pathname: string): boolean {
  const path = normalizePath(pathname);
  return path === "/" || isSectionPath(path, "/datasets") || isSectionPath(path, "/themes");
}

export function isCollectionsPath(pathname: string): boolean {
  return isSectionPath(pathname, COLLECTIONS_PATH);
}

export function isComparePath(pathname: string): boolean {
  return isSectionPath(pathname, COMPARE_PATH);
}

export function isContributePath(pathname: string): boolean {
  return isSectionPath(pathname, CONTRIBUTE_APP_PATH);
}
