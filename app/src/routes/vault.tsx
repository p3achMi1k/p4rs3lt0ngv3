import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Copy, Trash2 } from "lucide-react";
import { GameShell } from "@/components/game-shell";
import { SnakeSeal } from "@/components/snake-seal";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { saveChamberDraft } from "@/lib/draft";
import { deleteSeal, importSeals, listSeals, type SealRow } from "@/lib/vault.functions";

export const Route = createFileRoute("/vault")({ component: VaultPage });

function VaultPage() {
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
      <VaultBook />
    </GameShell>
  );
}

async function copyText(value: string) {
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    /* clipboard may be blocked; the text is still on the card */
  }
}

function VaultBook() {
  const navigate = useNavigate();
  const [seals, setSeals] = useState<SealRow[] | null>(null);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [removing, setRemoving] = useState(false);

  async function refresh() {
    try {
      const rows = await listSeals();
      setSeals(rows);
      setError("");
    } catch (reason) {
      setSeals([]);
      setError(reason instanceof Error ? reason.message : "Could not open the vault.");
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!seals) return [];
    if (!needle) return seals;
    return seals.filter((seal) =>
      [seal.scriptName, seal.original, seal.result, seal.direction].join("\n").toLowerCase().includes(needle),
    );
  }, [seals, query]);

  function toggleSelected(id: string) {
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  async function removeSeals(ids: string[]) {
    const unique = [...new Set(ids)].filter(Boolean);
    if (unique.length === 0 || removing) return;
    setRemoving(true);
    setError("");
    setNote("");
    const gone: string[] = [];
    try {
      for (const id of unique) {
        await deleteSeal({ data: { id } });
        gone.push(id);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not delete that seal.");
    } finally {
      if (gone.length > 0) {
        setSeals((current) => current?.filter((item) => !gone.includes(item.id)) ?? []);
        setSelected((current) => current.filter((id) => !gone.includes(id)));
        setNote(gone.length === 1 ? "Removed from Secrets." : `Removed ${gone.length} from Secrets.`);
      }
      setRemoving(false);
    }
  }
  function exportFile() {
    if (!seals) return;
    const payload = {
      kind: "p4r-vault",
      seals: seals.map((seal) => ({
        direction: seal.direction,
        scriptId: seal.scriptId,
        scriptName: seal.scriptName,
        options: seal.options,
        original: seal.original,
        result: seal.result,
      })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "p4r-vault.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function onImport(file: File) {
    setNote("");
    setError("");
    let parsed: unknown;
    try {
      parsed = JSON.parse(await file.text());
    } catch {
      setError("That file is not JSON.");
      return;
    }
    try {
      const result = await importSeals({ data: parsed });
      setNote(`Imported ${result.imported}.`);
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Import failed.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-display text-sm tracking-wide text-bronze">Secrets</p>
          <h1 className="font-display text-3xl">Sealed pairs</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="ghost-btn"
            disabled={removing || selected.length === 0}
            onClick={() => void removeSeals(selected)}
          >
            Delete selected
          </button>
          <button type="button" className="ghost-btn" onClick={exportFile} disabled={!seals?.length}>
            Export JSON
          </button>
          <label className="ghost-btn">
            Import JSON
            <input
              type="file"
              accept="application/json,.json"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void onImport(file);
                event.target.value = "";
              }}
            />
          </label>
        </div>
      </header>
      <p className="max-w-2xl text-sm text-mist">
        Latest 200 seals on this account. Each card is the original beside the encoded, decoded, encrypted, or
        decrypted text. Export only reads what is already stored.
      </p>
      <input
        className="field max-w-md"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search scripts or text"
      />
      {error ? <p className="text-sm text-bronze">{error}</p> : null}
      {note ? <p className="text-sm text-venom">{note}</p> : null}
      {seals === null ? <SnakeSeal className="size-16 text-bronze" /> : null}
      {seals && visible.length === 0 ? (
        <p className="panel p-5 text-mist">
          {seals.length === 0
            ? "Secrets is empty. Transform something in the Spell Book and it will appear here."
            : "Nothing matches that search."}
        </p>
      ) : null}
      <ul className="flex min-w-0 flex-col gap-3">
        {visible.map((seal) => {
          const isSelected = selected.includes(seal.id);
          return (
          <li key={seal.id} className={isSelected ? "panel flex min-w-0 flex-col gap-3 p-4 ring-1 ring-venom" : "panel flex min-w-0 flex-col gap-3 p-4"}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  type="button"
                  className={isSelected ? "seal-pick is-on" : "seal-pick"}
                  aria-pressed={isSelected}
                  aria-label={isSelected ? `Selected ${seal.scriptName}` : `Select ${seal.scriptName}`}
                  onClick={() => toggleSelected(seal.id)}
                >
                  <span className="spell-dot" aria-hidden="true" />
                </button>
                <h2 className="min-w-0 font-display text-lg break-words text-bronze">
                  {seal.scriptName}{" "}
                  <span className="text-sm text-mist">
                    {seal.direction === "decrypt"
                      ? "decrypted"
                      : seal.direction === "encrypt"
                        ? "encrypted"
                        : seal.direction === "decode"
                          ? "decoded"
                          : "encoded"}
                  </span>
                </h2>
              </div>
              <time className="text-xs text-mist">{seal.createdAt}</time>
            </div>
            <div className="grid min-w-0 gap-3 md:grid-cols-2">
              <label className="flex min-w-0 flex-col gap-1 text-sm text-mist">
                <span className="flex items-center justify-between">
                  Original
                  <button type="button" className="text-venom" onClick={() => void copyText(seal.original)}>
                    <Copy className="size-4" aria-label="Copy original" />
                  </button>
                </span>
                <textarea className="seal-box" readOnly rows={6} value={seal.original} aria-label="Original" />
              </label>
              <label className="flex min-w-0 flex-col gap-1 text-sm text-mist">
                <span className="flex items-center justify-between">
                  Result
                  <button type="button" className="text-venom" onClick={() => void copyText(seal.result)}>
                    <Copy className="size-4" aria-label="Copy result" />
                  </button>
                </span>
                <textarea className="seal-box" readOnly rows={6} value={seal.result} aria-label="Result" />
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="ghost-btn"
                onClick={() => {
                  saveChamberDraft({
                    input: seal.original,
                    scriptId: seal.scriptId,
                    options: seal.options,
                  });
                  void navigate({ to: "/chamber" });
                }}
              >
                Open in the Spell Book
              </button>
              <button
                type="button"
                className="ghost-btn"
                disabled={removing}
                onClick={() => void removeSeals([seal.id])}
              >
                <Trash2 className="mr-2 size-4" aria-hidden="true" />
                Delete
              </button>
            </div>
          </li>
          );
        })}
      </ul>
    </div>
  );
}
