import { useEffect, useState } from "react";
import { SnakeSeal } from "@/components/snake-seal";

const SEEN = "p4r-door-seen";

export function DoorIntro() {
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let seen = false;
    try {
      seen = window.sessionStorage.getItem(SEEN) === "1";
    } catch {
      seen = false;
    }
    if (!seen && !reduce) setOpen(true);
    const replay = () => {
      setReady(false);
      setOpen(true);
    };
    window.addEventListener("p4r-replay-door", replay);
    return () => window.removeEventListener("p4r-replay-door", replay);
  }, []);

  function close() {
    try {
      window.sessionStorage.setItem(SEEN, "1");
    } catch {
      /* ignore */
    }
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-ink text-parchment">
      <video
        className="h-full w-full object-cover"
        src="/chamber/door.mp4"
        autoPlay
        muted
        playsInline
        onCanPlay={() => setReady(true)}
        onEnded={close}
        onError={close}
      />
      {!ready && (
        <div className="absolute inset-0 grid place-items-center bg-ink">
          <div className="flex flex-col items-center gap-4">
            <SnakeSeal className="size-24 text-bronze" />
            <p className="font-display tracking-wide text-bronze">The door is opening</p>
          </div>
        </div>
      )}
      <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4">
        <p className="font-display text-sm tracking-wide text-parchment drop-shadow">P4R53L_ℭᵒ5ᵑeᵒaᵒ2ᵒ9ᵒ2ᵒcᵒb</p>
      </div>
      <div className="absolute inset-x-0 bottom-0 flex justify-end p-4">
        <button type="button" className="ghost-btn bg-ink/70" onClick={close}>
          Step through
        </button>
      </div>
    </div>
  );
}

export function replayDoor() {
  window.dispatchEvent(new Event("p4r-replay-door"));
}
