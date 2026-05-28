const FORMULA_PREFIX_PATTERN = /^[=+\-@]/;

export function safeSheetValue(value: unknown): string {
  const text = value == null ? "" : String(value);
  return FORMULA_PREFIX_PATTERN.test(text.trimStart()) ? `'${text}` : text;
}

export function safeSheetRow(values: unknown[]): string[] {
  return values.map((value) => safeSheetValue(value));
}
