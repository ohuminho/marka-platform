interface VendorTrustBadgeProps {
  verified?: boolean;
}

export default function VendorTrustBadge({ verified = false }: VendorTrustBadgeProps) {
  return verified ? (
    <span
      className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300"
      aria-label="Loja MARKA Verified: identidade e documentação verificadas"
    >
      <span aria-hidden="true">✓</span>
      MARKA Verified
    </span>
  ) : (
    <span
      className="inline-flex items-center gap-2 rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-1.5 text-xs text-[var(--theme-text-muted)]"
      aria-label="A identidade deste vendedor ainda não foi verificada"
    >
      Identidade ainda não verificada
    </span>
  );
}
