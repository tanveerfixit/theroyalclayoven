/**
 * Safe localStorage utilities — prevent JSON.parse crashes from corrupted/stale data.
 */

/**
 * Read and parse a JSON value from localStorage.
 * Returns `fallback` silently if the key is missing or the value is malformed.
 */
export function safeLocalGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/**
 * Read a raw string from localStorage with a fallback.
 */
export function safeLocalGetString(key: string, fallback: string): string {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

/**
 * Read a boolean setting stored as the string "true" / "false".
 */
export function safeLocalGetBool(key: string, fallback: boolean): boolean {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return raw !== 'false';
  } catch {
    return fallback;
  }
}

/**
 * Read a numeric setting, returning `fallback` for missing or NaN values.
 */
export function safeLocalGetNumber(key: string, fallback: number): number {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const parsed = parseFloat(raw);
    return isNaN(parsed) ? fallback : parsed;
  } catch {
    return fallback;
  }
}

/**
 * Write a JSON-serializable value to localStorage.
 * Silently swallows write errors (e.g. private browsing storage limit).
 */
export function safeLocalSet(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
  } catch {
    // Silently ignore — e.g. storage full or private browsing mode
  }
}
