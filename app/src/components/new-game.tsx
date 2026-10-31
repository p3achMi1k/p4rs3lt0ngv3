import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { GROK_PROVIDERS, signIn } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { SnakeSeal } from "@/components/snake-seal";

export function NewGame({ to = "/chamber" }: { to?: string }) {
  const { user, isPending } = useCurrentUserState();
  const [error, setError] = useState("");

  if (isPending) {
    return (
      <div className="flex items-center gap-3" aria-live="polite">
        <SnakeSeal className="size-10 text-bronze" />
        <p className="text-mist">Checking the seal on your name…</p>
      </div>
    );
  }

  if (user) {
    return (
      <Link to={to} className="menu-btn">
        Open the Spell Book
      </Link>
    );
  }

  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      <p className="font-display text-sm tracking-wide text-bronze">Login</p>
      {GROK_PROVIDERS.map((provider) => (
        <button
          key={provider.providerId}
          type="button"
          className="menu-btn"
          onClick={() => {
            setError("");
            void signIn(provider.providerId, { callbackURL: to }).catch((reason: unknown) => {
              setError(reason instanceof Error ? reason.message : "Sign-in failed.");
            });
          }}
        >
          Login — {provider.label}
        </button>
      ))}
      {error ? <p className="text-sm text-bronze">{error}</p> : null}
      <p className="text-sm text-mist">
        Google is the linked sign-in. X works the same way. Seals stay on that account, so the same login
        opens them on another device.
      </p>
    </div>
  );
}
