"use client";

import { useMemo, useRef, useState } from "react";
import { DatasetPage } from "@/components/DatasetPage";
import { Button } from "@/components/ui/button";
import { contributeCopy } from "@/content/site-copy";
import {
  contributionEnumValue,
  parseContributionYaml,
  replaceContributionField,
  stringifyContributionYaml,
} from "@/lib/contribution";
import { CONTRIBUTE_URL } from "@/lib/seo";
import { DATASET_THEMES, DIFFICULTIES } from "@/lib/schema";
import type { VocabularySnapshot } from "@/lib/vocabulary-snapshot";

export function ContributeStudio({
  vocabulary,
  initialYaml,
}: {
  vocabulary: VocabularySnapshot;
  initialYaml: string;
}) {
  const [yamlText, setYamlText] = useState(initialYaml);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const copyGeneration = useRef(0);
  const [downloadError, setDownloadError] = useState(false);
  const parsed = useMemo(
    () => parseContributionYaml(yamlText, vocabulary),
    [vocabulary, yamlText],
  );
  const selectedTheme = contributionEnumValue(yamlText, "theme", DATASET_THEMES);
  const selectedDifficulty = contributionEnumValue(
    yamlText,
    "difficulty",
    DIFFICULTIES,
  );

  function updateYaml(updater: (current: string) => string) {
    copyGeneration.current += 1;
    setCopyState("idle");
    setDownloadError(false);
    setYamlText(updater);
  }

  async function copyYaml() {
    const generation = copyGeneration.current;
    try {
      await navigator.clipboard.writeText(yamlText);
      if (generation !== copyGeneration.current) return;
      setCopyState("copied");
    } catch {
      if (generation !== copyGeneration.current) return;
      setCopyState("error");
    }
  }

  function downloadYaml() {
    let url: string | undefined;
    try {
      setDownloadError(false);
      const blob = new Blob([yamlText], { type: "text/yaml;charset=utf-8" });
      url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${parsed.dataset?.id ?? "dataset"}.yaml`;
      anchor.click();
    } catch {
      setDownloadError(true);
    } finally {
      if (url) URL.revokeObjectURL(url);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="min-w-0 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid min-w-0 gap-2">
            <label className="text-sm font-semibold text-foreground" htmlFor="theme-guide">
              Theme
            </label>
            <select
              id="theme-guide"
              className="h-11 min-w-0 max-w-full rounded-[10px] border border-input bg-background px-3 text-sm text-foreground"
              value={selectedTheme}
              onChange={(event) => {
                updateYaml((current) =>
                  replaceContributionField(current, "theme", event.target.value),
                );
              }}
            >
              <option value="" disabled>Select Theme</option>
              {DATASET_THEMES.map((theme) => (
                <option key={theme}>{theme}</option>
              ))}
            </select>
          </div>
          <div className="grid min-w-0 gap-2">
            <label className="text-sm font-semibold text-foreground" htmlFor="difficulty-guide">
              Difficulty
            </label>
            <select
              id="difficulty-guide"
              className="h-11 min-w-0 max-w-full rounded-[10px] border border-input bg-background px-3 text-sm text-foreground"
              value={selectedDifficulty}
              onChange={(event) => {
                updateYaml((current) =>
                  replaceContributionField(current, "difficulty", event.target.value),
                );
              }}
            >
              <option value="" disabled>Select Difficulty</option>
              {DIFFICULTIES.map((difficulty) => (
                <option key={difficulty}>{difficulty}</option>
              ))}
            </select>
          </div>
        </div>
        <label htmlFor="dataset-yaml" className="block text-sm font-semibold text-foreground">
          {contributeCopy.yamlLabel}
        </label>
        <textarea
          id="dataset-yaml"
          value={yamlText}
          onChange={(event) => updateYaml(() => event.target.value)}
          spellCheck={false}
          className="min-h-[28rem] w-full rounded-xl border border-input bg-background p-4 font-mono text-xs text-foreground"
        />
        <p className="text-sm text-muted-foreground">{contributeCopy.pythonNotice}</p>
        {parsed.issues.length > 0 && (
          <div role="alert" aria-label={contributeCopy.errorsLabel}>
            <h2 className="text-sm font-semibold text-foreground">{contributeCopy.errorsLabel}</h2>
            <ul className="mt-2 space-y-1 text-sm text-link">
              {parsed.issues.map((issue) => (
                <li key={`${issue.path}:${issue.message}`}>
                  <span className="font-mono text-xs text-muted-foreground">{issue.path}</span> {issue.message}
                </li>
              ))}
            </ul>
          </div>
        )}
        {downloadError && <p role="alert" className="text-sm text-destructive">{contributeCopy.downloadError}</p>}
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={downloadYaml}>
            {contributeCopy.downloadLabel}
          </Button>
          <Button type="button" variant="outline" onClick={copyYaml}>
            {copyState === "copied"
              ? contributeCopy.copiedYamlLabel
              : copyState === "error"
                ? contributeCopy.copyYamlErrorLabel
                : contributeCopy.copyYamlLabel}
          </Button>
          <span className="sr-only" aria-live="polite">
            {copyState === "copied" ? contributeCopy.copiedYamlLabel : ""}
            {copyState === "error" ? contributeCopy.copyYamlErrorLabel : ""}
          </span>
          <Button type="button" variant="ghost" onClick={() => updateYaml(() => initialYaml)}>
            {contributeCopy.loadExampleLabel}
          </Button>
          <a
            href={CONTRIBUTE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center font-semibold text-link hover:text-foreground"
          >
            {contributeCopy.githubLabel}
          </a>
        </div>
      </div>
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-foreground">{contributeCopy.previewLabel}</h2>
        {parsed.dataset && parsed.issues.length === 0 ? (
          <div className="mt-3">
            <DatasetPage dataset={parsed.dataset} showValidationBadges={false} />
            <pre className="sr-only">{stringifyContributionYaml(parsed.dataset)}</pre>
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">{contributeCopy.emptyPreview}</p>
        )}
      </div>
    </div>
  );
}
