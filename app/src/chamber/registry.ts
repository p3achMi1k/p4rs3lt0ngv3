export type SpellOption = {
  id: string;
  label: string;
  type: "boolean" | "select" | "text" | "number" | "password";
  defaultValue: string | number | boolean;
  min?: number;
  max?: number;
  step?: number;
  choices: { value: string; label: string }[];
};

export type Spell = {
  id: string;
  name: string;
  category: string;
  description: string;
  priority: number;
  options: SpellOption[];
  defaults: Record<string, string | number | boolean>;
  encode: (text: string, options: Record<string, unknown>) => string | Promise<string>;
  decode: ((text: string, options: Record<string, unknown>) => string | Promise<string>) | null;
  detect: ((text: string) => boolean) | null;
};

type RawChoice = string | { value?: string; label?: string };
type RawOption = {
  id?: string;
  label?: string;
  type?: string;
  default?: string | number | boolean;
  min?: number;
  max?: number;
  step?: number;
  options?: RawChoice[];
};
type RawTransformer = {
  name?: string;
  func?: (text: string, options?: Record<string, unknown>) => string;
  reverse?: ((text: string, options?: Record<string, unknown>) => string) | null;
  detector?: ((text: string) => boolean) | null;
  canDecode?: boolean;
  priority?: number;
  description?: string;
  configurableOptions?: RawOption[];
};

const CATEGORY_LABELS: Record<string, string> = {
  encoding: "Encodings",
  cipher: "Ciphers",
  crypto: "Encryption",
  concealment: "Concealment",
  format: "Format",
  symbol: "Alphabets",
  unicode: "Unicode styles",
  technical: "Signals",
  visual: "Wordplay",
  case: "Case",
  signwriting: "SignWriting",
  special: "Special",
  wand: "Wand",
};

export function categoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? category;
}

const modules = import.meta.glob("./transformers/**/*.js", {
  eager: true,
}) as Record<string, { default?: RawTransformer }>;

function asOption(raw: RawOption): SpellOption | null {
  if (!raw.id || !raw.label) return null;
  const type =
    raw.type === "boolean" ||
    raw.type === "select" ||
    raw.type === "number" ||
    raw.type === "password" ||
    raw.type === "text"
      ? raw.type
      : "text";
  const choices = (raw.options ?? []).map((choice) =>
    typeof choice === "string"
      ? { value: choice, label: choice }
      : { value: String(choice.value ?? ""), label: String(choice.label ?? choice.value ?? "") },
  );
  const defaultValue =
    raw.default !== undefined
      ? raw.default
      : type === "boolean"
        ? false
        : type === "number"
          ? 0
          : (choices[0]?.value ?? "");
  return {
    id: raw.id,
    label: raw.label,
    type,
    defaultValue,
    min: raw.min,
    max: raw.max,
    step: raw.step,
    choices,
  };
}

function loadSpells(): Spell[] {
  const spells: Spell[] = [];
  for (const [path, mod] of Object.entries(modules)) {
    const raw = mod.default;
    if (!raw || typeof raw.func !== "function" || typeof raw.name !== "string") continue;
    const id = path.replace(/^\.\/transformers\//, "").replace(/\.js$/, "");
    const category = id.split("/")[0] ?? "script";
    const options = (raw.configurableOptions ?? [])
      .map(asOption)
      .filter((option): option is SpellOption => option !== null);
    const defaults: Record<string, string | number | boolean> = {};
    for (const option of options) defaults[option.id] = option.defaultValue;
    const encode = raw.func.bind(raw);
    const decode =
      raw.canDecode === false || typeof raw.reverse !== "function" ? null : raw.reverse.bind(raw);
    const detect = typeof raw.detector === "function" ? raw.detector.bind(raw) : null;
    spells.push({
      id,
      name: raw.name,
      category,
      description: raw.description?.trim() || `${raw.name} from the ${categoryLabel(category)} shelf.`,
      priority: typeof raw.priority === "number" ? raw.priority : 85,
      options,
      defaults,
      encode,
      decode,
      detect,
    });
  }
  spells.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
  return spells;
}

export const SPELLS: Spell[] = loadSpells();

export function spellById(id: string): Spell | undefined {
  return SPELLS.find((spell) => spell.id === id);
}

/** Ciphers and the passphrase shelf use Encrypt / Decrypt. Encodings stay on Encode / Decode. */
export function usesKeyActions(spell: { category: string } | undefined): boolean {
  return spell?.category === "cipher" || spell?.category === "crypto";
}

export function coerceOptions(
  spell: Spell,
  options: Record<string, string | number | boolean>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...spell.defaults, ...options };
  for (const option of spell.options) {
    if (option.type === "number") out[option.id] = Number(out[option.id]);
    if (option.type === "boolean") out[option.id] = Boolean(out[option.id]);
  }
  return out;
}

export type Reading = {
  id: string;
  name: string;
  text: string;
  priority: number;
};

/** High-confidence reads only. Loose ciphers (Caesar and kin) match ordinary prose, so they stay manual. */
export function readSeal(input: string): Reading[] {
  const found: Reading[] = [];
  const seen = new Set<string>();
  for (const spell of SPELLS) {
    if (!spell.detect || !spell.decode || spell.priority < 100) continue;
    let hit = false;
    try {
      hit = spell.detect(input);
    } catch {
      hit = false;
    }
    if (!hit) continue;
    let text = "";
    try {
      const decoded = spell.decode(input, spell.defaults);
      if (typeof decoded !== "string") continue;
      text = decoded;
    } catch {
      continue;
    }
    if (typeof text !== "string" || !text || text === input || seen.has(text)) continue;
    seen.add(text);
    found.push({ id: spell.id, name: spell.name, text, priority: spell.priority });
  }
  found.sort((a, b) => b.priority - a.priority);
  return found.slice(0, 8);
}
