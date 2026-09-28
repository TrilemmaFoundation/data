import Image from "next/image";
import Link from "next/link";
import type { AppEntry } from "@/content/apps";
import { appVisuals } from "@/content/app-visuals";
import { appPath } from "@/lib/seo";

export function AppIdentity({ app, level }: { app: AppEntry; level: 1 | 2 }) {
  const Heading = level === 1 ? "h1" : "h2";
  const visual = appVisuals[app.slug as keyof typeof appVisuals];
  const size = level === 1 ? 48 : 40;
  const mark = visual.mark.kind === "wordmark" ? (
    <Image src={visual.mark.src} alt={app.title} width={138} height={48} className="block h-10 w-auto max-w-full sm:h-12" />
  ) : (
    <span className="app-mark" aria-hidden="true">
      {visual.mark.kind === "image" ? (
        <Image src={visual.mark.src} alt="" width={size - 8} height={size - 8} className="h-full w-full object-contain" />
      ) : visual.mark.letter}
    </span>
  );
  const content = (
    <>
      {mark}
      {visual.mark.kind !== "wordmark" && <span className="app-identity-name">{app.title}</span>}
    </>
  );

  return (
    <Heading className={level === 1 ? "min-w-0 font-heading text-3xl font-bold text-feature-foreground sm:text-4xl" : "min-w-0 text-xl font-semibold text-feature-foreground"}>
      {level === 2 ? (
        <Link href={appPath(app.slug)} className="app-identity inline-flex max-w-full items-center gap-3 rounded-sm">
          {content}
        </Link>
      ) : (
        <span className="app-identity inline-flex max-w-full items-center gap-3">{content}</span>
      )}
    </Heading>
  );
}
