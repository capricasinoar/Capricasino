import Link from "next/link";
import { Logo } from "./logo";

const nav = [
  { href: "#juegos", label: "Juegos" },
  { href: "#promos", label: "Promociones" },
  { href: "#vip", label: "Club VIP" },
  { href: "#provably-fair", label: "Provably Fair" },
];

export function Header() {
  return (
    <header className="glass fixed inset-x-0 top-0 z-50">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-6">
        <Link href="/" className="cursor-pointer" aria-label="CAPRI CASINO — inicio">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-7 md:flex" aria-label="Principal">
          {nav.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="cursor-pointer text-sm text-ink-soft transition-colors duration-200 hover:text-gold-bright"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2.5">
          <Link
            href="/casino"
            className="cursor-pointer rounded-full border border-line px-4 py-2 text-sm font-medium text-ink-soft transition-colors duration-200 hover:border-gold/60 hover:text-ink"
          >
            Entrar
          </Link>
          <Link
            href="/casino"
            className="cursor-pointer rounded-full bg-gold px-4 py-2 text-sm font-bold text-night shadow-md shadow-gold/20 transition-all duration-200 hover:bg-gold-bright"
          >
            Jugar gratis
          </Link>
        </div>
      </div>
    </header>
  );
}
