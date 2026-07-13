export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5 select-none">
      {/* Monograma: rombo dorado con doble C */}
      <svg viewBox="0 0 40 40" className="h-9 w-9 shrink-0" aria-hidden>
        <rect x="6" y="6" width="28" height="28" rx="6" transform="rotate(45 20 20)" fill="none" stroke="#d4af37" strokeWidth="1.6" />
        <rect x="10.5" y="10.5" width="19" height="19" rx="4" transform="rotate(45 20 20)" fill="none" stroke="#38b6da" strokeWidth="1" opacity="0.7" />
        <text x="20" y="25" textAnchor="middle" fontFamily="serif" fontSize="13.5" fill="#ecc960" fontWeight="600">
          C
        </text>
      </svg>
      {!compact && (
        <span className="leading-none">
          <span className="font-display block text-[1.05rem] font-semibold tracking-[0.22em] text-ink">CAPRI</span>
          <span className="block text-[0.6rem] font-medium tracking-[0.5em] text-gold">CASINO</span>
        </span>
      )}
    </span>
  );
}
