import Link from "next/link";

const CONTRIBUTE_URL =
  "https://github.com/TrilemmaFoundation/data/blob/main/CONTRIBUTING.md";

export function SiteHeader() {
  return (
    <header className="border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="font-heading text-sm font-semibold tracking-tight">
          Open Dataset Knowledge Graph
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/" className="text-muted-foreground hover:text-foreground">
            Datasets
          </Link>
          <Link
            href="/graph"
            className="text-muted-foreground hover:text-foreground"
          >
            Graph
          </Link>
          <a
            href={CONTRIBUTE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground"
          >
            Contribute
          </a>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>
          MIT licensed application code. Dataset files themselves are not
          redistributed or relicensed — we link to authoritative sources.
        </p>
        <p>data.trilemma.foundation</p>
      </div>
    </footer>
  );
}
