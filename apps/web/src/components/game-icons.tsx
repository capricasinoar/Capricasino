import type { GameIconKey } from "@/lib/games";

/* Iconos SVG inline (sin emojis ni librerías externas), trazo consistente 1.5 */
export function GameIcon({ icon, className = "h-10 w-10" }: { icon: GameIconKey; className?: string }) {
  const common = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (icon) {
    case "dice":
      return (
        <svg {...common}>
          <rect x="4" y="4" width="16" height="16" rx="3" />
          <circle cx="9" cy="9" r="1" fill="currentColor" stroke="none" />
          <circle cx="15" cy="9" r="1" fill="currentColor" stroke="none" />
          <circle cx="9" cy="15" r="1" fill="currentColor" stroke="none" />
          <circle cx="15" cy="15" r="1" fill="currentColor" stroke="none" />
          <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
        </svg>
      );
    case "coin":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
          <circle cx="12" cy="12" r="4.5" />
          <path d="M12 9.5v5" />
        </svg>
      );
    case "mines":
      return (
        <svg {...common}>
          <circle cx="12" cy="14" r="6" />
          <path d="M12 8V5.5M12 5.5l2-2M12 5.5l-2-2" />
          <path d="M9.8 12.2a2.6 2.6 0 0 1 2-1" />
        </svg>
      );
    case "plinko":
      return (
        <svg {...common}>
          <circle cx="12" cy="5" r="1" fill="currentColor" stroke="none" />
          <circle cx="9" cy="9" r="1" fill="currentColor" stroke="none" />
          <circle cx="15" cy="9" r="1" fill="currentColor" stroke="none" />
          <circle cx="6" cy="13" r="1" fill="currentColor" stroke="none" />
          <circle cx="12" cy="13" r="1" fill="currentColor" stroke="none" />
          <circle cx="18" cy="13" r="1" fill="currentColor" stroke="none" />
          <path d="M4 17.5h16M7 20.5h10" />
        </svg>
      );
    case "limbo":
      return (
        <svg {...common}>
          <path d="M4 19L20 5" />
          <path d="M14 5h6v6" />
          <path d="M4 15v4h4" />
        </svg>
      );
    case "crash":
      return (
        <svg {...common}>
          <path d="M3 19c4-1 7-3 9.5-6.5S16.5 6 20 4" />
          <path d="M15.5 4H20v4.5" />
          <path d="M3 15v4h4" opacity=".45" />
        </svg>
      );
    case "slot":
      return (
        <svg {...common}>
          <rect x="3.5" y="6" width="17" height="12" rx="2.5" />
          <path d="M9 6v12M15 6v12" />
          <circle cx="6.2" cy="12" r="0.9" fill="currentColor" stroke="none" />
          <circle cx="12" cy="12" r="0.9" fill="currentColor" stroke="none" />
          <circle cx="17.8" cy="12" r="0.9" fill="currentColor" stroke="none" />
        </svg>
      );
    case "keno":
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="3.2" />
          <circle cx="16" cy="8" r="3.2" />
          <circle cx="8" cy="16" r="3.2" />
          <circle cx="16" cy="16" r="3.2" />
          <path d="M16 14.8v2.4M14.8 16h2.4" />
        </svg>
      );
    case "roulette":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8.5" />
          <circle cx="12" cy="12" r="4.5" />
          <path d="M12 3.5v3M12 17.5v3M3.5 12h3M17.5 12h3M6 6l2.1 2.1M18 6l-2.1 2.1M6 18l2.1-2.1M18 18l-2.1-2.1" />
          <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
        </svg>
      );
    case "blackjack":
      return (
        <svg {...common}>
          <rect x="4" y="5" width="10" height="14" rx="2" transform="rotate(-8 9 12)" />
          <rect x="10" y="5" width="10" height="14" rx="2" transform="rotate(8 15 12)" />
          <path d="M15 10.6c.9-1 2.4-.4 2.4.8 0 1.1-1.3 2-2.4 2.8-1.1-.8-2.4-1.7-2.4-2.8 0-1.2 1.5-1.8 2.4-.8Z" fill="currentColor" stroke="none" />
        </svg>
      );
    case "baccarat":
      return (
        <svg {...common}>
          <path d="M12 4l2 3.5L12 11l-2-3.5L12 4Z" />
          <path d="M6.5 9L12 4l5.5 5L12 20 6.5 9Z" />
        </svg>
      );
  }
}
