import Link from "next/link";
import { GAMES } from "@/lib/games";
import { GameCard } from "./game-card";
import { Logo } from "./logo";

/* ─────────────────────────── HERO ─────────────────────────── */

export function Hero() {
  return (
    <section className="relative overflow-hidden pb-20 pt-36 md:pb-28 md:pt-44">
      {/* halos decorativos */}
      <div className="orb left-[-10%] top-[-15%] h-[26rem] w-[26rem] bg-azure-deep/40" />
      <div className="orb right-[-12%] top-[25%] h-[30rem] w-[30rem] bg-gold-dim/25" />

      <div className="relative mx-auto max-w-6xl px-4 md:px-6">
        <div className="max-w-2xl">
          <p className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-3.5 py-1.5 text-xs font-semibold tracking-wide text-gold-bright">
            <span className="h-1.5 w-1.5 rounded-full bg-win" />
            100% play money · Provably Fair · Sin dinero real
          </p>

          <h1 className="font-display mt-6 text-4xl font-semibold leading-[1.08] md:text-6xl">
            El lujo de Capri.
            <br />
            La emoción del casino.
            <br />
            <span className="text-gold-gradient">Cero riesgo.</span>
          </h1>

          <p className="mt-6 max-w-xl text-base leading-relaxed text-ink-soft md:text-lg">
            Juega a slots, crash y originals verificables con <strong className="text-ink">100.000 FUN</strong> de
            bienvenida — nuestra moneda ficticia. Toda la experiencia de un casino premium, sin apostar dinero real.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/casino"
              className="cursor-pointer rounded-full bg-gold px-7 py-3.5 text-base font-bold text-night shadow-lg shadow-gold/25 transition-all duration-200 hover:scale-[1.03] hover:bg-gold-bright"
            >
              Jugar gratis ahora
            </Link>
            <a
              href="#juegos"
              className="cursor-pointer rounded-full border border-line px-7 py-3.5 text-base font-medium text-ink-soft transition-colors duration-200 hover:border-azure/60 hover:text-ink"
            >
              Ver los juegos
            </a>
          </div>
        </div>

        {/* franja de métricas */}
        <dl className="mt-16 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-4">
          {[
            ["17+", "juegos en el lobby"],
            ["99%", "RTP máximo (Dice y Limbo)"],
            ["100.000", "FUN de bienvenida"],
            ["Verificable", "cada ronda, provably fair"],
          ].map(([value, label]) => (
            <div key={label} className="bg-surface px-5 py-5">
              <dt className="text-[0.7rem] uppercase tracking-wider text-ink-mute">{label}</dt>
              <dd className="font-display mt-1 text-2xl font-semibold text-gold-bright">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

/* ──────────────────── JUEGOS DESTACADOS ───────────────────── */

export function FeaturedGames() {
  const featured = GAMES.filter((g) => g.featured);
  return (
    <section id="juegos" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-16 md:px-6 md:py-24">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-azure">Capri Originals</p>
          <h2 className="font-display mt-2 text-3xl font-semibold md:text-4xl">Juegos de la casa, verificables</h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink-soft">
            Diseñados por nosotros con RNG <em>provably fair</em>: el hash se publica antes de cada ronda y la semilla
            se revela después. Nadie —ni siquiera la casa— puede alterar el resultado.
          </p>
        </div>
        <Link
          href="/casino"
          className="hidden shrink-0 cursor-pointer rounded-full border border-line px-5 py-2.5 text-sm font-medium text-ink-soft transition-colors duration-200 hover:border-gold/60 hover:text-ink md:block"
        >
          Entrar al lobby →
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4">
        {featured.map((game) => (
          <GameCard key={game.slug} game={game} />
        ))}
      </div>

      <Link
        href="/casino"
        className="mt-6 block cursor-pointer rounded-full border border-line py-3 text-center text-sm font-medium text-ink-soft transition-colors duration-200 hover:border-gold/60 hover:text-ink md:hidden"
      >
        Entrar al lobby →
      </Link>
    </section>
  );
}

/* ─────────────────────── CÓMO FUNCIONA ────────────────────── */

export function HowItWorks() {
  const steps = [
    {
      n: "01",
      title: "Crea tu cuenta gratis",
      body: "Solo un email. Sin tarjeta, sin depósito, sin datos bancarios: aquí no existe el dinero real.",
    },
    {
      n: "02",
      title: "Recibe 100.000 FUN",
      body: "Tu saldo de bienvenida en FUN, la moneda ficticia de CAPRI. Se agota; pides más con un clic.",
    },
    {
      n: "03",
      title: "Juega y compite",
      body: "Slots, crash y originals. Sube niveles VIP, entra en rankings y verifica cada resultado.",
    },
  ];
  return (
    <section className="border-y border-line bg-surface/60">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 md:grid-cols-3 md:px-6 md:py-20">
        {steps.map((s) => (
          <div key={s.n}>
            <span className="font-display text-4xl font-semibold text-gold/35">{s.n}</span>
            <h3 className="mt-3 text-lg font-semibold text-ink">{s.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">{s.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ───────────────────────── PROMOCIONES ────────────────────── */

export function Promos() {
  const promos = [
    {
      tag: "Bienvenida",
      title: "100.000 FUN al registrarte",
      body: "Saldo inicial instantáneo para explorar todo el lobby. Sin condiciones ocultas: el rollover de cada bono se muestra siempre con su progreso exacto.",
      accent: "from-gold/25 to-transparent border-gold/40",
    },
    {
      tag: "Semanal",
      title: "Cashback del 10%",
      body: "Cada lunes devolvemos el 10% de tus pérdidas netas de la semana, calculado directamente del ledger. Transparencia contable, literal.",
      accent: "from-azure/25 to-transparent border-azure/40",
    },
    {
      tag: "Diaria",
      title: "Free spins en Capri Fruits",
      body: "Giros gratis todos los días en nuestra slot insignia. Los premios van a tu saldo de bono con el progreso de liberación siempre visible.",
      accent: "from-win/20 to-transparent border-win/40",
    },
  ];
  return (
    <section id="promos" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-16 md:px-6 md:py-24">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-azure">Promociones</p>
      <h2 className="font-display mt-2 text-3xl font-semibold md:text-4xl">Generosos con el FUN</h2>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {promos.map((p) => (
          <article key={p.tag} className={`rounded-2xl border bg-gradient-to-b p-6 ${p.accent}`}>
            <span className="text-[0.65rem] font-bold uppercase tracking-[0.25em] text-ink-mute">{p.tag}</span>
            <h3 className="font-display mt-2 text-xl font-semibold text-ink">{p.title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">{p.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

/* ─────────────────────────── CLUB VIP ─────────────────────── */

export function Vip() {
  const tiers = [
    { name: "Marina", req: "Desde el registro", perks: "Free spins diarios y soporte estándar", color: "text-ink-soft" },
    { name: "Anacapri", req: "500K FUN apostados", perks: "Cashback 10% y límites de mesa ampliados", color: "text-azure" },
    { name: "Faraglioni", req: "5M FUN apostados", perks: "Cashback 15%, bonos a medida y rakeback", color: "text-gold-bright" },
    { name: "Grotta Azzurra", req: "Solo por invitación", perks: "Anfitrión personal y recompensas únicas", color: "text-gold-gradient" },
  ];
  return (
    <section id="vip" className="scroll-mt-24 border-y border-line bg-surface/60">
      <div className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-24">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-azure">Club VIP</p>
        <h2 className="font-display mt-2 text-3xl font-semibold md:text-4xl">
          Cuatro niveles, un solo destino: <span className="text-gold-gradient">la Grotta Azzurra</span>
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-soft">
          Tu volumen de juego (en FUN) te hace ascender por los rincones de la isla. Cada nivel mejora tu cashback, tus
          bonos y tu trato.
        </p>

        <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {tiers.map((t, i) => (
            <li key={t.name} className="relative rounded-2xl border border-line bg-card p-6 transition-colors duration-200 hover:border-gold/40">
              <span className="text-[0.65rem] font-bold tracking-[0.25em] text-ink-mute">NIVEL {i + 1}</span>
              <h3 className={`font-display mt-1 text-2xl font-semibold ${t.color}`}>{t.name}</h3>
              <p className="mt-2 text-xs font-medium uppercase tracking-wide text-ink-mute">{t.req}</p>
              <p className="mt-3 text-sm leading-relaxed text-ink-soft">{t.perks}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ──────────────────────── PROVABLY FAIR ───────────────────── */

export function ProvablyFair() {
  return (
    <section id="provably-fair" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-16 md:px-6 md:py-24">
      <div className="grid items-center gap-10 lg:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-azure">Provably Fair</p>
          <h2 className="font-display mt-2 text-3xl font-semibold md:text-4xl">La casa no puede hacer trampa. Compruébalo.</h2>
          <p className="mt-4 text-sm leading-relaxed text-ink-soft md:text-base">
            Antes de cada ronda publicamos el <strong className="text-ink">hash SHA-256</strong> del resultado ya
            decidido. Cuando la ronda termina, revelamos la semilla: cualquiera puede recalcular el hash y verificar
            que el resultado no se alteró después de tu apuesta.
          </p>
          <ul className="mt-6 space-y-3 text-sm text-ink-soft">
            {[
              "El servidor decide el resultado y publica su hash — tu apuesta llega después.",
              "Tu semilla de cliente se combina con la del servidor: nadie controla el RNG en solitario.",
              "Historial completo de rondas con verificador integrado en tu cuenta.",
            ].map((line) => (
              <li key={line} className="flex gap-3">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                {line}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-line bg-card p-5 font-mono text-xs leading-relaxed text-ink-soft shadow-2xl shadow-black/40">
          <p className="mb-3 flex items-center gap-2 text-[0.65rem] uppercase tracking-widest text-ink-mute">
            <span className="h-2 w-2 rounded-full bg-win" /> verificador · ronda #48291
          </p>
          <p><span className="text-azure">hash publicado</span> · antes de apostar</p>
          <p className="break-all text-ink/80">9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08</p>
          <p className="mt-3"><span className="text-azure">semilla revelada</span> · al cerrar la ronda</p>
          <p className="break-all text-ink/80">capri:48291:cf1e9a…d27b</p>
          <p className="mt-3"><span className="text-azure">resultado</span></p>
          <p className="text-ink/80">dice → 7.31 <span className="text-win">✓ hash verificado</span></p>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── CTA + FOOTER ───────────────────── */

export function FinalCta() {
  return (
    <section className="relative overflow-hidden border-t border-line">
      <div className="orb left-1/2 top-[-40%] h-[24rem] w-[36rem] -translate-x-1/2 bg-gold-dim/20" />
      <div className="relative mx-auto max-w-6xl px-4 py-20 text-center md:px-6 md:py-28">
        <h2 className="font-display mx-auto max-w-2xl text-3xl font-semibold md:text-5xl">
          Tu mesa en la isla está <span className="text-gold-gradient">reservada</span>
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-sm text-ink-soft md:text-base">
          100.000 FUN te esperan. Sin tarjeta, sin depósito, sin letra pequeña.
        </p>
        <Link
          href="/casino"
          className="mt-8 inline-block cursor-pointer rounded-full bg-gold px-9 py-4 text-base font-bold text-night shadow-xl shadow-gold/25 transition-all duration-200 hover:scale-[1.03] hover:bg-gold-bright"
        >
          Crear cuenta gratis
        </Link>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-line bg-surface/80">
      <div className="mx-auto max-w-6xl px-4 py-12 md:px-6">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            <Logo />
            <p className="mt-4 text-xs leading-relaxed text-ink-mute">
              CAPRI CASINO es una plataforma de entretenimiento con dinero <strong>100% ficticio</strong> (play money).
              No se apuesta, deposita ni gana dinero real bajo ninguna circunstancia. Proyecto demostrativo de
              plataforma de casino.
            </p>
          </div>

          <nav className="grid grid-cols-2 gap-x-12 gap-y-2 text-sm text-ink-soft" aria-label="Pie de página">
            <a href="#juegos" className="cursor-pointer transition-colors hover:text-gold-bright">Juegos</a>
            <a href="#promos" className="cursor-pointer transition-colors hover:text-gold-bright">Promociones</a>
            <a href="#vip" className="cursor-pointer transition-colors hover:text-gold-bright">Club VIP</a>
            <a href="#provably-fair" className="cursor-pointer transition-colors hover:text-gold-bright">Provably Fair</a>
            <Link href="/casino" className="cursor-pointer transition-colors hover:text-gold-bright">Lobby</Link>
          </nav>
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-4 border-t border-line pt-6 text-xs text-ink-mute md:flex-row md:items-center">
          <p>© {new Date().getFullYear()} CAPRI CASINO · Juego ficticio, diversión real.</p>
          <p className="flex items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-ink-mute/50 text-[0.6rem] font-bold">18+</span>
            Solo mayores de edad. Juega con cabeza, incluso con dinero de mentira.
          </p>
        </div>
      </div>
    </footer>
  );
}
