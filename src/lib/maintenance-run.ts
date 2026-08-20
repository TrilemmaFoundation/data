import fs from "node:fs";
import path from "node:path";
import { sanitizeDiagnostic } from "./diagnostics";
import {
  formatMaintenanceMarkdown,
  type MaintenanceReport,
} from "./maintenance";
import type { Dataset } from "./schema";
import { exceptionExpiryWarnings } from "./url-validation";

export type UrlValidationResult = {
  errors: Map<string, string[]>;
  warnings: Map<string, string[]>;
};

export async function collectUrlFindings(options: {
  offline: boolean;
  datasets: Dataset[];
  validateUrls?: (datasets: Dataset[]) => Promise<UrlValidationResult>;
  exceptionWarnings?: () => string[];
}): Promise<{ urlErrors: Map<string, string[]>; exceptionWarnings: string[] }> {
  const exceptionWarnings = (options.exceptionWarnings ?? exceptionExpiryWarnings)();
  if (options.offline) {
    return { urlErrors: new Map(), exceptionWarnings };
  }
  if (!options.validateUrls) {
    throw new Error("live maintenance requires a URL validator");
  }

  try {
    const result = await options.validateUrls(options.datasets);
    return {
      urlErrors: result.errors,
      exceptionWarnings: [
        ...exceptionWarnings,
        ...[...result.warnings.values()].flat(),
      ],
    };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return {
      urlErrors: new Map([
        ["live-url-check", [`live URL validation failed: ${sanitizeDiagnostic(detail)}`]],
      ]),
      exceptionWarnings,
    };
  }
}

export function maintenanceExitCode(urlErrors: Map<string, string[]>): 0 | 1 {
  return urlErrors.size > 0 ? 1 : 0;
}

export function sanitizeMaintenanceReport(report: MaintenanceReport): MaintenanceReport {
  return JSON.parse(
    JSON.stringify(report, (_key, value) =>
      typeof value === "string" ? sanitizeDiagnostic(value) : value,
    ),
  ) as MaintenanceReport;
}

export function writeMaintenanceArtifacts(
  report: MaintenanceReport,
  options: {
    outDir: string;
    githubStepSummary?: string;
    mkdir?: (directory: string) => void;
    writeFile?: (file: string, contents: string) => void;
    appendFile?: (file: string, contents: string) => void;
  },
): { markdown: string; json: string } {
  const sanitized = sanitizeMaintenanceReport(report);
  const markdown = formatMaintenanceMarkdown(sanitized);
  const json = `${JSON.stringify(sanitized, null, 2)}\n`;
  const mkdir = options.mkdir ?? ((directory: string) => fs.mkdirSync(directory, { recursive: true }));
  const writeFile = options.writeFile ?? ((file: string, contents: string) => fs.writeFileSync(file, contents));
  const appendFile = options.appendFile ?? ((file: string, contents: string) => fs.appendFileSync(file, contents));

  mkdir(options.outDir);
  writeFile(path.join(options.outDir, "maintenance-report.md"), markdown);
  writeFile(path.join(options.outDir, "maintenance-report.json"), json);
  if (options.githubStepSummary) {
    appendFile(options.githubStepSummary, markdown);
  }
  return { markdown, json };
}
