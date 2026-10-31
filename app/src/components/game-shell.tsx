import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { SignedIn, SignedOut, UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { SnakeSeal } from "@/components/snake-seal";

const LINKS = [
  { to: "/", label: "Manual" },
  { to: "/chamber", label: "Spell Book" },
  { to: "/vault", label: "Secrets" },
  { to: "/grimoire", label: "API" },
] as const;

function AccountSlot() {
  const { user, isPending } = useCurrentUserState();
  if (isPending) return <SnakeSeal className="size-9 text-bronze" />;
  if (!user) {
    return (
      <SignedOut>
        <Link to="/login" className="ghost-btn">
          Login
        </Link>
      </SignedOut>
    );
  }
  return (
    <SignedIn>
      <div className="account-chip max-w-full">
        <UserButton />
      </div>
    </SignedIn>
  );
}

export function GameShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-ink text-parchment">
      <header className="sticky top-0 z-20 border-b border-mist/30 bg-ink/95">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2">
          <Link to="/" className="font-display text-lg tracking-wide text-bronze">
            P4R53L
          </Link>
          <nav className="flex flex-wrap" aria-label="Game menu">
            {LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="nav-link"
                activeOptions={{ exact: true }}
                activeProps={{ className: "nav-link is-active" }}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto">
            <AccountSlot />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
