export function SnakeSeal({ className = "size-16" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden="true">
      <circle cx="60" cy="60" r="56" fill="#0c1a14" stroke="currentColor" strokeWidth="3" />
      {Array.from({ length: 16 }, (_, index) => {
        const angle = (index / 16) * Math.PI * 2;
        return (
          <circle
            key={index}
            cx={60 + Math.cos(angle) * 50}
            cy={60 + Math.sin(angle) * 50}
            r="1.6"
            className="fill-bronze"
          />
        );
      })}
      <circle cx="60" cy="60" r="36" fill="none" stroke="currentColor" strokeWidth="2" className="text-bronze/70" />
      <path
        d="M30 58c12-14 28-16 42-8M30 66c14 12 32 14 44 4M32 50c8-2 18 2 24 8"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        className="text-bronze/80"
      />
      <g className="snake-spin">
        <circle
          cx="60"
          cy="60"
          r="46"
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray="70 220"
          className="text-venom"
        />
        <circle cx="106" cy="60" r="4.2" className="fill-venom" />
        <circle cx="104.2" cy="58.4" r="1.1" className="fill-ink" />
      </g>
    </svg>
  );
}
