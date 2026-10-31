import { createFileRoute } from "@tanstack/react-router";
import { GameShell } from "@/components/game-shell";
import { NewGame } from "@/components/new-game";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  return (
    <GameShell>
      <section className="mx-auto flex max-w-lg flex-col gap-6 py-8">
        <p className="font-display text-sm tracking-wide text-bronze">Secrets</p>
        <h1 className="font-display text-3xl text-parchment">Login</h1>
        <p className="text-mist">
          Signing in links Secrets to you. Transforms stay on your account, not in a shared book.
        </p>
        <NewGame to="/chamber" />
      </section>
    </GameShell>
  );
}
