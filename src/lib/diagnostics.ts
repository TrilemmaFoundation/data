const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f-\u009f]/gu;

export function sanitizeDiagnostic(value: string): string {
  return value.replace(CONTROL_CHARACTERS, (character) =>
    `\\u${character.codePointAt(0)!.toString(16).padStart(4, "0")}`,
  );
}
