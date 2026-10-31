import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Copy } from "lucide-react";
import { GameShell } from "@/components/game-shell";
import { SnakeSeal } from "@/components/snake-seal";
import {
  SPELLS,
  categoryLabel,
  coerceOptions,
  readSeal,
  spellById,
  usesKeyActions,
  type Spell,
} from "@/chamber/registry";
import { saveGrimoireText, takeChamberDraft } from "@/lib/draft";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { addSeal } from "@/lib/vault.functions";

export const Route = createFileRoute("/chamber")({ component: ChamberPage });

const FAV_KEY = "p4r-spell-favs";
const RECENT_KEY = "p4r-spell-recent";
const OPT_KEY = "p4r-spell-opts";

function ChamberPage() {
  const { user, isPending } = useCurrentUserState();
  if (isPending) {
    return (
      <GameShell>
        <div className="grid min-h-[50vh] place-items-center">
          <SnakeSeal className="size-24 text-bronze" />
        </div>
      </GameShell>
    );
  }
  if (!user) return <RedirectToSignIn />;
  return (
    <GameShell>
      <Workbench />
    </GameShell>
  );
}

function sideDirection(spell: Spell, side: "forward" | "back"): "encode" | "decode" | "encrypt" | "decrypt" {
  const keyed = usesKeyActions(spell);
  if (side === "forward") return keyed ? "encrypt" : "encode";
  return keyed ? "decrypt" : "decode";
}

function methodLabel(name: string, direction: string): string {
  if (direction === "encrypt") return `${name} · encrypted`;
  if (direction === "decrypt") return `${name} · decrypted`;
  if (direction === "decode") return `${name} · decoded`;
  return name;
}

function plainOptions(used: Record<string, unknown>): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(used)) {
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") out[key] = value;
  }
  return out;
}

function storedOptions(spell: Spell, options: Record<string, string | number | boolean>) {
  const copy = { ...options };
  if (spell.category === "crypto") delete copy.passphrase;
  return copy;
}

function readList(key: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || "[]") as unknown;
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function writeList(key: string, values: string[]) {
  try {
    window.localStorage.setItem(key, JSON.stringify(values));
  } catch {
    /* ignore */
  }
}

function readOptionStore(): Record<string, Record<string, string | number | boolean>> {
  if (typeof window === "undefined") return {};
  try {
    const parsed = JSON.parse(window.localStorage.getItem(OPT_KEY) || "{}") as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed as Record<string, Record<string, string | number | boolean>>;
  } catch {
    return {};
  }
}

function previewText(spell: Spell, sample: string, options: Record<string, unknown>, side: "forward" | "back") {
  if (!sample.trim()) return "";
  if (spell.category === "crypto") return "passphrase";
  const fn = side === "back" ? spell.decode : spell.encode;
  if (!fn) return "no reverse";
  try {
    const out = fn(sample, options);
    if (typeof out !== "string") return "keyed";
    const flat = out.replace(/\s+/g, " ").trim();
    if (!flat) return "\u2014";
    return flat.length > 36 ? `${flat.slice(0, 36)}\u2026` : flat;
  } catch {
    return "\u2014";
  }
}

async function copyText(value: string) {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

function Workbench() {
  const navigate = useNavigate();
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [side, setSide] = useState<"forward" | "back">("forward");
  const [activeId, setActiveId] = useState("");
  const [output, setOutput] = useState("");
  const [method, setMethod] = useState("");
  const [error, setError] = useState("");
  const [saveNote, setSaveNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [readings, setReadings] = useState<{ id: string; name: string; text: string }[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [optionStore, setOptionStore] = useState<Record<string, Record<string, string | number | boolean>>>({});
  const [optionSpell, setOptionSpell] = useState<Spell | null>(null);
  const [optionDraft, setOptionDraft] = useState<Record<string, string | number | boolean>>({});

  useEffect(() => {
    setFavorites(readList(FAV_KEY));
    setRecent(readList(RECENT_KEY));
    setOptionStore(readOptionStore());
    const draft = takeChamberDraft();
    if (!draft) return;
    const next = spellById(draft.scriptId);
    if (next) {
      setActiveId(next.id);
      setOptionStore((current) => ({ ...current, [next.id]: { ...next.defaults, ...draft.options } }));
    }
    setInput(draft.input);
    setSaveNote("Loaded from Secrets.");
  }, []);

  const categories = useMemo(() => {
    const seen: string[] = [];
    for (const spell of SPELLS) if (!seen.includes(spell.category)) seen.push(spell.category);
    return seen;
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return SPELLS.filter((spell) => {
      if (category && spell.category !== category) return false;
      if (!needle) return true;
      return (
        spell.name.toLowerCase().includes(needle) ||
        spell.category.includes(needle) ||
        categoryLabel(spell.category).toLowerCase().includes(needle)
      );
    });
  }, [query, category]);

  const groups = useMemo(() => {
    const map = new Map<string, Spell[]>();
    for (const spell of filtered) {
      const list = map.get(spell.category) ?? [];
      list.push(spell);
      map.set(spell.category, list);
    }
    return [...map.entries()];
  }, [filtered]);

  const sample = useMemo(() => [...input].slice(0, 12).join(""), [input]);

  function optionsFor(spell: Spell) {
    return coerceOptions(spell, { ...spell.defaults, ...optionStore[spell.id] });
  }

  function remember(id: string) {
    setRecent((current) => {
      const next = [id, ...current.filter((item) => item !== id)].slice(0, 8);
      writeList(RECENT_KEY, next);
      return next;
    });
  }

  function toggleFavorite(id: string) {
    setFavorites((current) => {
      const next = current.includes(id) ? current.filter((item) => item !== id) : [id, ...current];
      writeList(FAV_KEY, next);
      return next;
    });
  }

  async function seal(
    direction: "encode" | "decode" | "encrypt" | "decrypt",
    script: Spell,
    original: string,
    result: string,
    used: Record<string, string | number | boolean>,
  ) {
    setSaveNote("");
    try {
      await addSeal({
        data: {
          direction,
          scriptId: script.id,
          scriptName: script.name,
          options: storedOptions(script, used),
          original,
          result,
        },
      });
      setSaveNote("Sealed in Secrets.");
    } catch (reason) {
      setSaveNote(reason instanceof Error ? reason.message : "Could not seal this.");
    }
  }

  async function apply(spell: Spell) {
    setError("");
    setReadings([]);
    setActiveId(spell.id);
    if (!input.trim()) {
      setError("Enter text to transform.");
      return;
    }
    if (input.length > 20000) {
      setError("The spell book holds 20,000 characters at a time.");
      return;
    }
    if (side === "back" && !spell.decode) {
      setError(`${spell.name} can run forward, but it has no reverse.`);
      return;
    }
    setBusy(true);
    try {
      const used = optionsFor(spell);
      const produced = side === "forward" ? spell.encode(input, used) : (spell.decode?.(input, used) ?? "");
      const result = await produced;
      if (typeof result !== "string" || !result.trim()) {
        setError("The script returned nothing.");
        setOutput(typeof result === "string" ? result : "");
        return;
      }
      const direction = sideDirection(spell, side);
      setOutput(result);
      setMethod(methodLabel(spell.name, direction));
      remember(spell.id);
      const copied = await copyText(result);
      await seal(direction, spell, input, result, plainOptions(used));
      if (copied) setSaveNote((note) => (note ? `${note} Copied.` : "Copied."));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The script failed.");
    } finally {
      setBusy(false);
    }
  }

  async function read() {
    if (!input.trim()) {
      setError("Enter text to transform.");
      return;
    }
    setError("");
    setBusy(true);
    try {
      const found = readSeal(input);
      setReadings(found.map((item) => ({ id: item.id, name: item.name, text: item.text })));
      const top = found[0];
      if (!top) {
        setError("No high-confidence script matched. Pick one and use Decode / Decrypt. Caesar is not guessed.");
        return;
      }
      const matched = spellById(top.id);
      setOutput(top.text);
      setMethod(`${top.name} \u00b7 read`);
      setActiveId(top.id);
      if (matched) {
        remember(matched.id);
        await seal(usesKeyActions(matched) ? "decrypt" : "decode", matched, input, top.text, matched.defaults);
        await copyText(top.text);
      }
    } finally {
      setBusy(false);
    }
  }

  function openOptions(spell: Spell) {
    setOptionSpell(spell);
    setOptionDraft({ ...spell.defaults, ...optionStore[spell.id] });
  }

  function commitOptions() {
    if (!optionSpell) return;
    const spell = optionSpell;
    const nextStore = { ...optionStore, [spell.id]: optionDraft };
    setOptionStore(nextStore);
    const persisted: Record<string, Record<string, string | number | boolean>> = {};
    for (const [id, value] of Object.entries(nextStore)) {
      const owner = spellById(id);
      if (!owner) continue;
      const copy = { ...value };
      for (const option of owner.options) {
        if (option.type === "password") delete copy[option.id];
      }
      persisted[id] = copy;
    }
    try {
      window.localStorage.setItem(OPT_KEY, JSON.stringify(persisted));
    } catch {
      /* ignore */
    }
    setOptionSpell(null);
  }

  const favoriteSpells = filtered.filter((spell) => favorites.includes(spell.id));
  const recentSpells = recent
    .map((id) => filtered.find((spell) => spell.id === id))
    .filter((spell): spell is Spell => Boolean(spell));
  const active = spellById(activeId);

  return (
    <div className="spellbook">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-display text-sm tracking-wide text-bronze">Spell Book</p>
          <h1 className="font-display text-3xl">Transforms</h1>
        </div>
        <p className="max-w-sm text-sm text-mist">
          {SPELLS.length} scripts. Type, then click a card. The result is copied and sealed in Secrets.
        </p>
      </header>

      <label className="flex flex-col gap-2">
        <span className="font-display text-sm text-bronze">Text</span>
        <textarea
          id="transform-input"
          className="field min-h-32 resize-y"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Enter text to transform..."
          spellCheck={false}
        />
      </label>

      <div className="flex flex-wrap items-center gap-2">
        <div className="spell-mode" role="group" aria-label="Direction">
          <button type="button" className={side === "forward" ? "is-on" : ""} onClick={() => setSide("forward")}>
            Encode / Encrypt
          </button>
          <button type="button" className={side === "back" ? "is-on" : ""} onClick={() => setSide("back")}>
            Decode / Decrypt
          </button>
        </div>
        <button type="button" className="ghost-btn" disabled={busy} onClick={() => void read()}>
          Read
        </button>
        <button
          type="button"
          className="ghost-btn"
          onClick={() => {
            saveGrimoireText(output || input);
            void navigate({ to: "/grimoire" });
          }}
        >
          Take to the API
        </button>
      </div>

      {active ? <p className="text-sm text-mist">{active.description}</p> : null}
      {error ? <p className="text-sm text-bronze">{error}</p> : null}
      {saveNote ? <p className="text-sm text-venom">{saveNote}</p> : null}

      <section className="spell-filter">
        <div className="spell-search">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search transforms..."
            aria-label="Search transforms"
            spellCheck={false}
          />
          {query || category ? (
            <button
              type="button"
              className="spell-clear"
              onClick={() => {
                setQuery("");
                setCategory("");
              }}
              aria-label="Clear filters"
            >
              Clear
            </button>
          ) : null}
        </div>
        <div>
          <p className="spell-filter-label">Category</p>
          <div className="spell-chips" role="group" aria-label="Filter by category">
            <button
              type="button"
              className={category ? "spell-chip" : "spell-chip is-on"}
              onClick={() => setCategory("")}
            >
              All
            </button>
            {categories.map((id) => (
              <button
                key={id}
                type="button"
                data-cat={id}
                className={category === id ? "spell-chip is-on" : "spell-chip"}
                onClick={() => setCategory((current) => (current === id ? "" : id))}
              >
                {categoryLabel(id)}
              </button>
            ))}
          </div>
        </div>
      </section>

      {favoriteSpells.length > 0 ? (
        <section className="spell-section">
          <h2 className="spell-section-title">Favorites</h2>
          <SpellGrid
            spells={favoriteSpells}
            activeId={activeId}
            busy={busy}
            favorites={favorites}
            sample={sample}
            side={side}
            optionStore={optionStore}
            onApply={(spell) => void apply(spell)}
            onFavorite={toggleFavorite}
            onOptions={openOptions}
          />
        </section>
      ) : null}

      {recentSpells.length > 0 ? (
        <section className="spell-section">
          <h2 className="spell-section-title">Last used</h2>
          <SpellGrid
            spells={recentSpells}
            activeId={activeId}
            busy={busy}
            favorites={favorites}
            sample={sample}
            side={side}
            optionStore={optionStore}
            onApply={(spell) => void apply(spell)}
            onFavorite={toggleFavorite}
            onOptions={openOptions}
          />
        </section>
      ) : null}

      {groups.length === 0 ? (
        <div className="panel p-5 text-mist">
          <p>No transforms match your filters.</p>
          <button
            type="button"
            className="ghost-btn mt-3"
            onClick={() => {
              setQuery("");
              setCategory("");
            }}
          >
            Clear filters
          </button>
        </div>
      ) : (
        groups.map(([id, spells]) => (
          <section key={id} className="spell-section">
            <h2 className="spell-section-title" data-cat={id}>
              {categoryLabel(id)}
            </h2>
            <SpellGrid
              spells={spells}
              activeId={activeId}
              busy={busy}
              favorites={favorites}
              sample={sample}
              side={side}
              optionStore={optionStore}
              onApply={(spell) => void apply(spell)}
              onFavorite={toggleFavorite}
              onOptions={openOptions}
            />
          </section>
        ))
      )}

      {output ? (
        <section className="spell-output">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-lg text-bronze">
              Transformed message {method ? <small className="text-mist">({method})</small> : null}
            </h2>
            <button type="button" className="ghost-btn" onClick={() => void copyText(output)}>
              <Copy className="mr-2 size-4" aria-hidden="true" />
              Copy
            </button>
          </div>
          <textarea className="field min-h-32 resize-y" readOnly value={output} aria-label="Transformed text output" />
          <p className="text-sm text-mist">
            Copy this text and share it. Switch to Decode / Decrypt and run the same script to reverse it.
          </p>
        </section>
      ) : null}

      {readings.length > 1 ? (
        <div className="flex flex-col gap-2">
          <h3 className="font-display text-sm text-bronze">Other confident readings</h3>
          {readings.slice(1).map((item) => (
            <button
              key={item.id}
              type="button"
              className="panel p-3 text-left"
              onClick={() => {
                setOutput(item.text);
                setMethod(`${item.name} \u00b7 read`);
                setActiveId(item.id);
                const matched = spellById(item.id);
                if (matched) {
                  void seal(
                    usesKeyActions(matched) ? "decrypt" : "decode",
                    matched,
                    input,
                    item.text,
                    matched.defaults,
                  );
                }
              }}
            >
              <span className="font-display text-sm text-venom">{item.name}</span>
              <span className="mt-1 block max-h-24 overflow-auto text-sm break-words text-mist">{item.text}</span>
            </button>
          ))}
        </div>
      ) : null}

      {optionSpell ? (
        <div className="spell-modal-back" onClick={() => setOptionSpell(null)}>
          <div
            className="spell-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="spell-options-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3">
              <h2 id="spell-options-title" className="font-display text-xl text-bronze">
                {optionSpell.name}
              </h2>
              <button type="button" className="ghost-btn" onClick={() => setOptionSpell(null)}>
                Close
              </button>
            </div>
            <div className="mt-4 flex flex-col gap-3">
              {optionSpell.options.map((option) => (
                <label key={option.id} className="flex flex-col gap-1 text-sm text-mist">
                  {option.label}
                  {option.type === "boolean" ? (
                    <input
                      type="checkbox"
                      className="size-5"
                      checked={Boolean(optionDraft[option.id])}
                      onChange={(event) =>
                        setOptionDraft((current) => ({ ...current, [option.id]: event.target.checked }))
                      }
                    />
                  ) : option.type === "select" ? (
                    <select
                      className="field"
                      value={String(optionDraft[option.id] ?? "")}
                      onChange={(event) =>
                        setOptionDraft((current) => ({ ...current, [option.id]: event.target.value }))
                      }
                    >
                      {option.choices.map((choice) => (
                        <option key={choice.value} value={choice.value}>
                          {choice.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      className="field"
                      type={option.type === "number" ? "number" : option.type === "password" ? "password" : "text"}
                      autoComplete={option.type === "password" ? "off" : undefined}
                      min={option.min}
                      max={option.max}
                      step={option.step}
                      value={String(optionDraft[option.id] ?? "")}
                      onChange={(event) =>
                        setOptionDraft((current) => ({
                          ...current,
                          [option.id]: option.type === "number" ? Number(event.target.value) : event.target.value,
                        }))
                      }
                    />
                  )}
                </label>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                className="ghost-btn"
                onClick={() => setOptionDraft({ ...optionSpell.defaults })}
              >
                Reset defaults
              </button>
              <button type="button" className="ghost-btn" onClick={() => setOptionSpell(null)}>
                Cancel
              </button>
              <button type="button" className="menu-btn" onClick={commitOptions}>
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SpellGrid({
  spells,
  activeId,
  busy,
  favorites,
  sample,
  side,
  optionStore,
  onApply,
  onFavorite,
  onOptions,
}: {
  spells: Spell[];
  activeId: string;
  busy: boolean;
  favorites: string[];
  sample: string;
  side: "forward" | "back";
  optionStore: Record<string, Record<string, string | number | boolean>>;
  onApply: (spell: Spell) => void;
  onFavorite: (id: string) => void;
  onOptions: (spell: Spell) => void;
}) {
  return (
    <div className="spell-grid">
      {spells.map((spell) => {
        const preview = previewText(
          spell,
          sample,
          coerceOptions(spell, { ...spell.defaults, ...optionStore[spell.id] }),
          side,
        );
        return (
          <div key={spell.id} className="spell-card-wrap">
            <button
              type="button"
              data-cat={spell.category}
              disabled={busy}
              className={spell.id === activeId ? "spell-card is-active" : "spell-card"}
              onClick={() => onApply(spell)}
              title={`Click to transform and copy: ${spell.name}`}
            >
              <span className="spell-card-name">{spell.name}</span>
              {preview ? <small>{preview}</small> : null}
            </button>
            <div className="spell-card-actions">
              {spell.options.length > 0 ? (
                <button type="button" onClick={() => onOptions(spell)}>
                  Options
                </button>
              ) : (
                <span />
              )}
              <button
                type="button"
                className={favorites.includes(spell.id) ? "spell-fav is-on" : "spell-fav"}
                aria-pressed={favorites.includes(spell.id)}
                aria-label={favorites.includes(spell.id) ? "Favorited" : "Favorite"}
                title={favorites.includes(spell.id) ? "Favorited" : "Favorite"}
                onClick={() => onFavorite(spell.id)}
              >
                {favorites.includes(spell.id) ? (
                  <span className="spell-snake" aria-hidden="true">\uD83D\uDC0D</span>
                ) : (
                  <span className="spell-dot" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
