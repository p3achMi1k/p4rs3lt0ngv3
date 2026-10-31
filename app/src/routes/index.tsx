import { createFileRoute, Link } from "@tanstack/react-router";
import { GameShell } from "@/components/game-shell";
import { NewGame } from "@/components/new-game";
import { replayDoor } from "@/components/door-intro";

export const Route = createFileRoute("/")({ component: Manual });

function Manual() {
  return (
    <GameShell>
      <article className="flex flex-col gap-8">
        <header className="flex flex-col gap-4">
          <p className="font-display text-sm tracking-wide text-bronze">Field manual</p>
          <h1 className="font-display text-4xl leading-tight text-parchment sm:text-5xl">
            P4R53L_ℭ𝔥𝔞𝔪𝔢𝔩𝔢𝔬𝔫
          </h1>
          <p className="max-w-2xl text-lg text-mist">
            A spellbook for real text scripts. You write, the chamber encodes or decodes, and both sides are
            sealed in Secrets.
          </p>
          <div className="flex flex-wrap gap-3">
            <NewGame />
            <button type="button" className="ghost-btn" onClick={() => replayDoor()}>
              Watch the door
            </button>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
          <div className="panel flex flex-col gap-3 p-5">
            <h2 className="font-display text-xl text-bronze">How a turn works</h2>
            <ol className="flex list-decimal flex-col gap-2 pl-5 text-parchment">
              <li>The round door plays once while the chamber wakes. Step through whenever you like.</li>
              <li>Login signs you in with Google, or with X. That account is the lock on Secrets.</li>
              <li>In the Spell Book, type in the box. Cards preview the transform. Click one to run it, copy it, and seal both sides.</li>
              <li>Encode / Encrypt runs forward. Decode / Decrypt reverses. Read only accepts a high-confidence match.</li>
              <li>Open Secrets to search, copy, or delete what you sealed.</li>
              <li>API is optional. The OpenAI conversation uses a server secret. The other three spells use a key you paste in this browser.</li>
            </ol>
          </div>
          <figure className="panel overflow-hidden">
            <img
              src="/chamber/basilisk.jpg"
              alt="A blind emerald basilisk coiled in a dark stone chamber"
              className="max-h-96 w-full bg-ink object-contain object-center"
            />
            <figcaption className="p-4 text-sm text-mist">
              The basilisk is the ward. It blocks grimoire spells that ask a model to slip past a safety system.
              Ordinary ciphers still run on your own text.
            </figcaption>
          </figure>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="panel flex flex-col gap-2 p-5">
            <h2 className="font-display text-lg text-bronze">Spell Book</h2>
            <p>
              The script list is the working set from{" "}
              <a className="text-venom underline" href="https://github.com/p3achMi1k/p4rs3lt0ngv3">
                P4RS3LT0NGV3
              </a>
              : encodings, ciphers, alphabets, unicode styles, signals, and the rest of that shelf. Random Mix
              and Emoji Speak are left out because they need extra data this build does not ship. A script that
              cannot decode says so. Read only accepts a high-confidence match, so Caesar is never guessed from
              ordinary writing. New ciphers include Enigma, RC4, Myszkowski, a keyed rail fence, Fibonacci, Kamasutra,
              a straddling checkerboard, a one-time pad, variant Beaufort, Gromark, Morbit, an Alberti disk, and
              Nicodemus. The encryption shelf is AES-GCM, AES-CBC, and ChaCha20. Each takes a passphrase that is
              not stored in Secrets.
            </p>
          </div>
          <div className="panel flex flex-col gap-2 p-5">
            <h2 className="font-display text-lg text-bronze">Secrets</h2>
            <p>
              A separate page. Each seal keeps the original, the result, the script, and any shift or keyword.
              Search, copy either side, open it back in the Spell Book, export JSON, or import a file Secrets
              exported. Nothing here is a sample row.
            </p>
          </div>
          <div className="panel flex flex-col gap-2 p-5">
            <h2 className="font-display text-lg text-bronze">API</h2>
            <p>
              The OpenAI conversation calls the Responses API from the server. Set OPENAI_API_KEY in the project
              Secrets, then publish. That key is never shown in the browser. A separate section still lets you
              paste your own xAI, OpenRouter, OpenAI, or Groq key for translate, gloss, and chameleon voice. Those
              keys stay in this browser and are sent only when you cast.
            </p>
          </div>
        </section>

        <section className="panel flex flex-col gap-3 p-5">
          <h2 className="font-display text-xl text-bronze">Menus</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            <li>
              <Link to="/chamber" className="text-venom underline">
                Spell Book
              </Link>{" "}
              — type, preview, and click a transform.
            </li>
            <li>
              <Link to="/vault" className="text-venom underline">
                Secrets
              </Link>{" "}
              — your sealed pairs.
            </li>
            <li>
              <Link to="/grimoire" className="text-venom underline">
                API
              </Link>{" "}
              — OpenAI conversation, or link a model key and cast.
            </li>
            <li>
              <Link to="/login" className="text-venom underline">
                Login
              </Link>{" "}
              — Google or X.
            </li>
          </ul>
          <p className="text-sm text-mist">
            Spell Book scripts are from P4RS3LT0NGV3 (AGPL-3.0). Secrets is the part of promptVault that belongs
            here: your prompts, original beside result, on your account. The profile README at p3achMi1k/.github
            describes a different TypingMind app and is not part of this book.
          </p>
        </section>
      </article>
    </GameShell>
  );
}
