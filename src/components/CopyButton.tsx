"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { copyButtonCopy } from "@/content/site-copy";

export function CopyButton({ value }: { value: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");
  const resetTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (resetTimer.current !== null) window.clearTimeout(resetTimer.current);
    },
    [],
  );

  async function copy() {
    if (resetTimer.current !== null) window.clearTimeout(resetTimer.current);
    try {
      await navigator.clipboard.writeText(value);
      setStatus("copied");
      resetTimer.current = window.setTimeout(() => {
        setStatus("idle");
        resetTimer.current = null;
      }, 2000);
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button type="button" variant="ghost" size="sm" onClick={copy}>
        {status === "copied" ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
        {status === "copied"
          ? copyButtonCopy.copiedLabel
          : status === "error"
            ? copyButtonCopy.errorLabel
            : copyButtonCopy.idleLabel}
      </Button>
      <span className="sr-only" aria-live="polite">
        {status === "copied" ? copyButtonCopy.copiedAnnouncement : ""}
        {status === "error" ? copyButtonCopy.errorAnnouncement : ""}
      </span>
    </div>
  );
}
