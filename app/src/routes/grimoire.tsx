import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { GameShell } from "@/components/game-shell";
import { SnakeSeal } from "@/components/snake-seal";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { takeGrimoireText } from "@/lib/draft";
import {
  PROVIDERS,
  clearGrimoire,
  loadGrimoire,
  maskKey,
  saveGrimoire,
  type ProviderId,
} from "@/lib/grimoire-store";
import { castSpell } from "@/lib/llm.functions";
import {
  checkOpenAIKey,
  clearOpenAIConversation,
  listOpenAITurns,
  openaiStatus,
  sendOpenAIMessage,
  type OpenAITurn,
} from "@/lib/openai.functions";
import { wardReason } from "@/lib/ward";

export const Route = createFileRoute("/grimoire")({ component: GrimoirePage });

const LANGUAGES = [
  "Spanish",
  "French",
  "German",
  "Italian",
  "Portuguese",
  "Latin",
  "Ancient Greek",
  "Japanese",
  "Mandarin Chinese",
  "Korean",
  "Arabic",
  "Hindi",
];

function GrimoirePage() {
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
      <div className="flex flex-col gap-6">
        <OpenAIConversation />
        <GrimoireBook />
      </div>
    </GameShell>
  );
}

function OpenAIConversation() {
  const [turns, setTurns] = useState<OpenAITurn[]>([]);
  const [draft, setDraft] = useState("");
  const [model, setModel] = useState("");
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [keyNote, setKeyNote] = useState("");
  const [keyOk, setKeyOk] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const threadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [status, history, key] = await Promise.all([
          openaiStatus(),
          listOpenAITurns(),
          checkOpenAIKey(),
        ]);
        if (cancelled) return;
        setConfigured(status.configured && key.loaded);
        setModel(status.model);
        setTurns(history);
        setKeyOk(key.accepted);
        setKeyNote(key.message);
      } catch (reason) {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "Could not load the conversation.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const node = threadRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [turns, busy]);

  async function send(event: FormEvent) {
    event.preventDefault();
    const message = draft.trim();
    if (!message || busy) return;
    setError("");
    setBusy(true);
    try {
      const result = await sendOpenAIMessage({ data: message });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setTurns((current) => [...current, result.user, result.assistant]);
      setModel(result.model);
      setDraft("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The message failed.");
    } finally {
      setBusy(false);
    }
  }

  async function clear() {
    setError("");
    setBusy(true);
    try {
      await clearOpenAIConversation();
      setTurns([]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not clear the conversation.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel flex flex-col gap-3 p-5">
      <header className="flex flex-col gap-1">
        <p className="font-display text-sm tracking-wide text-bronze">OpenAI</p>
        <h1 className="font-display text-3xl">Conversation</h1>
        <p className="max-w-2xl text-mist">
          Replies come from the Responses API on the server. Your key never enters this page. Earlier turns in
          this account are sent with each new message so the thread stays in context.
          {model ? ` Model: ${model}.` : ""}
        </p>
      </header>
      {keyNote ? (
        <p className="border border-bronze/50 p-3 text-sm text-bronze" role="status">
          {keyOk ? "Key check passed. " : "Key check failed. "}
          {keyNote}
        </p>
      ) : null}
      <div
        ref={threadRef}
        className="flex max-h-96 min-h-40 flex-col gap-3 overflow-auto border border-mist/30 p-3"
        aria-live="polite"
      >
        {turns.length === 0 ? (
          <p className="text-sm text-mist">No messages yet. Ask something and the reply appears here.</p>
        ) : (
          turns.map((turn) => (
            <article
              key={turn.id}
              className={
                turn.role === "user"
                  ? "ml-8 border border-bronze/40 bg-ink p-3"
                  : "mr-8 border border-venom/40 bg-venom/10 p-3"
              }
            >
              <p className="font-display text-xs tracking-wide text-bronze">
                {turn.role === "user" ? "You" : "Assistant"}
              </p>
              <p className="whitespace-pre-wrap break-words">{turn.content}</p>
            </article>
          ))
        )}
        {busy ? <p className="text-sm text-mist">Waiting for OpenAI\u2026</p> : null}
      </div>
      {error ? (
        <p className="text-sm text-bronze" role="alert">
          {error}
        </p>
      ) : null}
      <form className="flex flex-col gap-2" onSubmit={(event) => void send(event)}>
        <label className="flex flex-col gap-1 text-sm text-mist">
          Message
          <textarea
            className="field min-h-24"
            value={draft}
            maxLength={4000}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Continue the conversation."
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <button type="submit" className="menu-btn" disabled={busy || configured === false || !draft.trim()}>
            Send
          </button>
          <button type="button" className="ghost-btn" disabled={busy || turns.length === 0} onClick={() => void clear()}>
            Clear conversation
          </button>
        </div>
      </form>
    </section>
  );
}

function GrimoireBook() {
  const starter = PROVIDERS[0];
  const [providerId, setProviderId] = useState<ProviderId>(starter.id);
  const [baseUrl, setBaseUrl] = useState(starter.baseUrl);
  const [model, setModel] = useState(starter.model);
  const [apiKey, setApiKey] = useState("");
  const [savedMask, setSavedMask] = useState("");
  const [text, setText] = useState("");
  const [language, setLanguage] = useState(LANGUAGES[0]);
  const [customLanguage, setCustomLanguage] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [reply, setReply] = useState("");
  const [warded, setWarded] = useState(false);

  const provider = PROVIDERS.find((item) => item.id === providerId) ?? starter;

  useEffect(() => {
    const stored = loadGrimoire();
    if (stored) {
      setProviderId(stored.providerId);
      setBaseUrl(stored.baseUrl);
      setModel(stored.model);
      setApiKey(stored.apiKey);
      setSavedMask(maskKey(stored.apiKey));
    }
    const carried = takeGrimoireText();
    if (carried) setText(carried);
  }, []);

  function chooseProvider(id: ProviderId) {
    const next = PROVIDERS.find((item) => item.id === id);
    if (!next) return;
    setProviderId(next.id);
    setBaseUrl(next.baseUrl);
    setModel(next.model);
  }

  function remember() {
    const key = apiKey.trim();
    if (!key) {
      setNote("Paste a key before saving it on this device.");
      return;
    }
    saveGrimoire({ providerId, baseUrl: baseUrl.trim(), model: model.trim(), apiKey: key });
    setSavedMask(maskKey(key));
    setNote("Key saved in this browser only. It is not written into Secrets.");
  }

  function forget() {
    clearGrimoire();
    setApiKey("");
    setSavedMask("");
    setNote("Key removed from this browser.");
  }

  async function cast(kind: "ping" | "translate" | "gloss" | "chameleon") {
    setNote("");
    setReply("");
    setWarded(false);
    const languageName = customLanguage.trim() || language;
    const reason = wardReason(`${text}\n${languageName}`);
    if (reason && kind !== "ping") {
      setWarded(true);
      setNote(reason);
      return;
    }
    setBusy(true);
    try {
      const result = await castSpell({
        data: {
          kind,
          text,
          language: languageName,
          apiKey: apiKey.trim(),
          baseUrl: baseUrl.trim(),
          model: model.trim(),
          providerLabel: provider.label,
        },
      });
      if (!result.ok) {
        setWarded(result.warded);
        setNote(result.message);
        return;
      }
      setReply(result.text);
      setNote(
        kind === "ping"
          ? result.text.includes("AWAKE")
            ? `Key answered through ${result.via} (${result.model}).`
            : `The provider answered through ${result.via}, but not with the expected word. The raw reply is below.`
          : `Cast through ${result.via} (${result.model}). Both sides are in Secrets.`,
      );
    } catch (reason) {
      setNote(reason instanceof Error ? reason.message : "The spell failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="font-display text-sm tracking-wide text-bronze">Your own keys</p>
        <h2 className="font-display text-3xl">Link a model key</h2>
        <p className="max-w-2xl text-mist">
          Scripts in the Spell Book do not need a key. These three spells do: translate, plain gloss, and
          chameleon voice. A blank key tries the chamber\u2019s own Grok when that is available.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1fr_16rem]">
        <section className="panel flex flex-col gap-4 p-5">
          <h2 className="font-display text-xl text-bronze">How to link</h2>
          <ol className="list-decimal pl-5">
            <li>Choose a provider. Only these four hosts are accepted.</li>
            <li>Open that provider and create a key. The steps under the menu match the site you picked.</li>
            <li>Paste the key and the model id. Save on this device.</li>
            <li>Press Test key. A working key returns the word AWAKE. Any other answer, including an error code, is shown as the provider sent it.</li>
            <li>Write text and cast. The original and the reply are sealed in <Link to="/vault" className="text-venom underline">Secrets</Link>.</li>
          </ol>
          <div className="flex flex-wrap gap-2">
            {PROVIDERS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={item.id === providerId ? "menu-btn" : "ghost-btn"}
                onClick={() => chooseProvider(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <ol className="list-decimal pl-5 text-sm text-mist">
            {provider.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <a className="text-venom underline" href={provider.keyUrl} target="_blank" rel="noreferrer">
            Open {provider.label} keys
          </a>
          <label className="flex flex-col gap-1 text-sm text-mist">
            Base URL
            <input className="field" value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-sm text-mist">
            Model id
            <input className="field" value={model} onChange={(event) => setModel(event.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-sm text-mist">
            API key {savedMask ? <span className="text-venom">saved as {savedMask}</span> : null}
            <input
              className="field"
              type="password"
              autoComplete="off"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="menu-btn" onClick={remember}>
              Save key on this device
            </button>
            <button type="button" className="ghost-btn" onClick={forget}>
              Forget key
            </button>
            <button type="button" className="ghost-btn" disabled={busy} onClick={() => void cast("ping")}>
              Test key
            </button>
          </div>
        </section>

        <aside className={warded ? "panel border-venom p-3" : "panel p-3"}>
          <img
            src="/chamber/basilisk.jpg"
            alt="The basilisk ward, a blind emerald serpent"
            className="aspect-[3/4] w-full object-cover"
          />
          <p className="mt-3 text-sm text-mist">
            {warded
              ? "The ward is shut. Rewrite the request without asking a model to drop its rules."
              : "Ward awake. API spells that ask to bypass a safety system stop here."}
          </p>
        </aside>
      </div>

      <section className="panel flex flex-col gap-3 p-5">
        <h2 className="font-display text-xl text-bronze">Cast</h2>
        <textarea
          className="field min-h-36"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Text to translate, gloss, or restyle."
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm text-mist">
            Translate into
            <select className="field" value={language} onChange={(event) => setLanguage(event.target.value)}>
              {LANGUAGES.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm text-mist">
            Or type a language
            <input
              className="field"
              value={customLanguage}
              onChange={(event) => setCustomLanguage(event.target.value)}
              placeholder="Sanskrit, Old English\u2026"
            />
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="menu-btn" disabled={busy} onClick={() => void cast("translate")}>
            Translate
          </button>
          <button type="button" className="menu-btn" disabled={busy} onClick={() => void cast("gloss")}>
            Plain gloss
          </button>
          <button type="button" className="menu-btn" disabled={busy} onClick={() => void cast("chameleon")}>
            Chameleon voice
          </button>
        </div>
        {note ? <p className="text-sm text-bronze">{note}</p> : null}
        {reply ? (
          <pre className="max-h-80 overflow-auto border border-mist/30 p-3 text-sm break-words whitespace-pre-wrap">
            {reply}
          </pre>
        ) : null}
      </section>
    </div>
  );
}
