"use client";

import { useMemo, useState } from "react";
import { DatasetPage } from "@/components/DatasetPage";
import { Button } from "@/components/ui/button";
import { contributeCopy } from "@/content/site-copy";
import { parseContributionYaml, stringifyContributionYaml } from "@/lib/contribution";
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
  const parsed = useMemo(
    () => parseContributionYaml(yamlText, vocabulary),
    [vocabulary, yamlText],
  );

  async function copyYaml() {
    try {
      await navigator.clipboard.writeText(yamlText);
      setCopyState("copied");
    } catch {
      setCopyState("error");
    }
  }

  function downloadYaml() {
    const blob = new Blob([yamlText], { type: "text/yaml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const id = parsed.dataset?.id ?? "dataset";
    anchor.href = url;
    anchor.download = `${id}.yaml`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <label className="text-sm font-semibold text-white" htmlFor="theme-guide">
            Theme
          </label>
          <select
            id="theme-guide"
            className="h-11 rounded-[10px] border border-white/15 bg-brand-black px-3 text-sm text-white"
            defaultValue={DATASET_THEMES[0]}
            onChange={(event) => {
              setYamlText((current) =>
                current.replace(/^theme: .*$/m, `theme: ${event.target.value}`),
              );
            }}
          >
            {DATASET_THEMES.map((theme) => (
              <option key={theme}>{theme}</option>
            ))}
          </select>
          <label className="text-sm font-semibold text-white" htmlFor="difficulty-guide">
            Difficulty
          </label>
          <select
            id="difficulty-guide"
            className="h-11 rounded-[10px] border border-white/15 bg-brand-black px-3 text-sm text-white"
            defaultValue="beginner"
            onChange={(event) => {
              setYamlText((current) =>
                current.replace(/^difficulty: .*$/m, `difficulty: ${event.target.value}`),
              );
            }}
          >
            {DIFFICULTIES.map((difficulty) => (
              <option key={difficulty}>{difficulty}</option>
            ))}
          </select>
        </div>
        <label htmlFor="dataset-yaml" className="block text-sm font-semibold text-white">
          {contributeCopy.yamlLabel}
        </label>
        <textarea
          id="dataset-yaml"
          value={yamlText}
          onChange={(event) => setYamlText(event.target.value)}
          spellCheck={false}
          className="min-h-[28rem] w-full rounded-xl border border-white/15 bg-brand-black p-4 font-mono text-xs text-white"
        />
        <p className="text-sm text-muted-foreground">{contributeCopy.pythonNotice}</p>
        {parsed.issues.length > 0 && (
          <div role="alert" aria-label={contributeCopy.errorsLabel}>
            <h2 className="text-sm font-semibold text-white">{contributeCopy.errorsLabel}</h2>
            <ul className="mt-2 space-y-1 text-sm text-primary">
              {parsed.issues.map((issue) => (
                <li key={`${issue.path}:${issue.message}`}>
                  <span className="font-mono text-xs text-white/70">{issue.path}</span> {issue.message}
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={downloadYaml}>
            {contributeCopy.downloadLabel}
          </Button>
          <Button type="button" variant="outline" onClick={copyYaml}>
            {copyState === "copied" ? contributeCopy.copiedYamlLabel : contributeCopy.copyYamlLabel}
          </Button>
          <Button type="button" variant="ghost" onClick={() => setYamlText(initialYaml)}>
            {contributeCopy.loadExampleLabel}
          </Button>
          <a
            href={CONTRIBUTE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center font-semibold text-primary hover:text-white"
          >
            {contributeCopy.githubLabel}
          </a>
        </div>
      </div>
      <div>
        <h2 className="text-sm font-semibold text-white">{contributeCopy.previewLabel}</h2>
        {parsed.dataset && parsed.issues.length === 0 ? (
          <div className="mt-3">
            <DatasetPage dataset={parsed.dataset} />
            <pre className="sr-only">{stringifyContributionYaml(parsed.dataset)}</pre>
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">{contributeCopy.emptyPreview}</p>
        )}
      </div>
    </div>
  );
}
