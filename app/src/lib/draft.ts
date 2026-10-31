export type ChamberDraft = {
  input: string;
  scriptId: string;
  options: Record<string, string | number | boolean>;
};

const CHAMBER_KEY = "p4r-chamber-draft";
const GRIMOIRE_KEY = "p4r-grimoire-text";

function read(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (value === null) window.sessionStorage.removeItem(key);
    else window.sessionStorage.setItem(key, value);
  } catch {
    /* storage unavailable */
  }
}

export function saveChamberDraft(draft: ChamberDraft) {
  write(CHAMBER_KEY, JSON.stringify(draft));
}

export function takeChamberDraft(): ChamberDraft | null {
  const raw = read(CHAMBER_KEY);
  write(CHAMBER_KEY, null);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ChamberDraft;
    if (!parsed || typeof parsed.input !== "string" || typeof parsed.scriptId !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveGrimoireText(text: string) {
  write(GRIMOIRE_KEY, text);
}

export function takeGrimoireText(): string | null {
  const raw = read(GRIMOIRE_KEY);
  write(GRIMOIRE_KEY, null);
  return raw;
}
