/** Chicago Manual of Style headline capitalization (CMOS 8.159–8.161). */

const SMALL_WORDS = new Set([
  "a",
  "an",
  "the",
  "and",
  "but",
  "or",
  "for",
  "nor",
  "as",
  "at",
  "by",
  "from",
  "in",
  "into",
  "of",
  "off",
  "on",
  "onto",
  "out",
  "over",
  "to",
  "up",
  "with",
  "about",
  "across",
  "against",
  "around",
  "inside",
  "per",
  "within",
]);

const PHRASAL_VERBS = new Set(["look up"]);

function lettersOnly(value: string): string {
  return value.replace(/[^A-Za-z]/g, "");
}

function splitAffixes(token: string): { prefix: string; core: string; suffix: string } {
  const match = token.match(/^([^A-Za-z0-9]*)(.*?)([^A-Za-z0-9]*)$/)!;
  const prefix = match[1]!;
  const core = match[2]!;
  const suffix = match[3]!;
  if (!core) {
    return { prefix: "", core: token, suffix: "" };
  }
  return { prefix, core, suffix };
}

function shouldPreserveTitleToken(token: string): boolean {
  const { core } = splitAffixes(token);
  if (/[A-Za-z0-9]\.[A-Za-z0-9]/.test(core)) return true;
  if (/[*&/]/.test(core) && /[A-Z]/.test(core)) return true;
  const base = core.replace(/['’]s$/i, "");
  const letters = lettersOnly(base);
  if (letters.length >= 1 && letters === letters.toUpperCase() && /[A-Z]/.test(letters)) {
    return letters.length > 1 || core === core.toUpperCase();
  }
  if (/[a-z][A-Z]/.test(core) || /[A-Z][a-z]+[A-Z]/.test(core) || /[A-Z]{2,}[a-z]/.test(core)) {
    return true;
  }
  return false;
}

function capitalizeWord(word: string): string {
  const match = word.match(/^([^A-Za-z]*)(.*)$/)!;
  const prefix = match[1]!;
  const rest = match[2]!;
  if (!rest) return word;
  return `${prefix}${rest.charAt(0).toLocaleUpperCase("en-US")}${rest.slice(1).toLocaleLowerCase("en-US")}`;
}

function titleCaseHyphenated(
  token: string,
  forceFirst: boolean,
  forceLast: boolean,
): string {
  const parts = token.split("-");
  return parts
    .map((part, index) => {
      if (shouldPreserveTitleToken(part)) return part;
      const lower = part.toLocaleLowerCase("en-US");
      const isEdge =
        forceFirst && index === 0 ||
        forceLast && index === parts.length - 1 ||
        index === 0;
      if (!isEdge && SMALL_WORDS.has(lower)) {
        return lower;
      }
      return capitalizeWord(part);
    })
    .join("-");
}

function titleCaseToken(
  token: string,
  isFirst: boolean,
  isLast: boolean,
  previous: string | undefined,
): string {
  const { prefix, core, suffix } = splitAffixes(token);
  if (shouldPreserveTitleToken(core)) return token;
  if (core.includes("-")) {
    return `${prefix}${titleCaseHyphenated(core, isFirst, isLast)}${suffix}`;
  }

  const lower = core.toLocaleLowerCase("en-US");
  const previousLower = previous?.toLocaleLowerCase("en-US");
  if (previousLower && PHRASAL_VERBS.has(`${previousLower} ${lower}`)) {
    return `${prefix}${capitalizeWord(core)}${suffix}`;
  }
  if (!isFirst && !isLast && SMALL_WORDS.has(lower)) {
    return `${prefix}${lower}${suffix}`;
  }
  return `${prefix}${capitalizeWord(core)}${suffix}`;
}

function titleCaseClause(clause: string): string {
  const tokens = clause.split(/(\s+)/);
  const words = tokens.filter((token) => !/^\s+$/.test(token) && token.length > 0);
  let wordIndex = 0;
  let previousWord: string | undefined;
  return tokens
    .map((token) => {
      if (/^\s+$/.test(token) || token.length === 0) return token;
      const isFirst = wordIndex === 0;
      const isLast = wordIndex === words.length - 1;
      const next = titleCaseToken(token, isFirst, isLast, previousWord);
      previousWord = lettersOnly(token).toLocaleLowerCase("en-US");
      wordIndex += 1;
      return next;
    })
    .join("");
}

export function toChicagoTitleCase(value: string): string {
  return value
    .split(/(:\s+)/)
    .map((part, index) => (index % 2 === 1 ? part : titleCaseClause(part)))
    .join("");
}

export function isChicagoTitleCase(value: string): boolean {
  return value === toChicagoTitleCase(value);
}
