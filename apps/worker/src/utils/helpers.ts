export function generateUUID(): string {
  return crypto.randomUUID();
}

export function nowMs(): number {
  return Date.now();
}

export function msFromNow(ms: number): number {
  return Date.now() + ms;
}

export const DAY_MS = 24 * 60 * 60 * 1000;
export const THIRTY_DAYS_MS = 30 * DAY_MS;

export function countWords(markdown: string): number {
  return markdown
    .replace(/[#*_~`>\[\]()!]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
}
