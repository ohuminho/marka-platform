import Link from "next/link";
import DynamicBackground from "@/design-system/backgrounds/DynamicBackground";
import MarkaHero from "@/frontend/features/landing/components/MarkaHero";
import ProductGrid from "@/frontend/features/marketplace/components/ProductGrid";

export default function Home() {
  return (
    <DynamicBackground>
      <div className="min-h-screen">
        <header className="sticky top-0 z-40 border-b border-[var(--theme-border)] bg-[var(--theme-background)]/85 backdrop-blur-2xl">
          <nav aria-label="Navegação principal" className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
            <Link href="/" aria-label="MARKA início" className="text-xl font-semibold tracking-[-0.08em] text-[var(--theme-text)]">MARKA<span className="ml-1 text-[var(--theme-accent)]">.</span></Link>
            <div className="hidden items-center gap-7 md:flex">
              <Link href="/app/marketplace" className="text-xs text-[var(--theme-text-muted)] transition hover:text-[var(--theme-text)]">Marketplace</Link>
              <Link href="/app" className="text-xs text-[var(--theme-text-muted)] transition hover:text-[var(--theme-text)]">Mobilidade e serviços</Link>
              <Link href="/advertise" className="text-xs text-[var(--theme-text-muted)] transition hover:text-[var(--theme-text)]">Publicidade</Link>
            </div>
            <Link href="/app" className="inline-flex h-10 items-center rounded-full bg-[var(--theme-text)] px-5 text-xs font-semibold text-[var(--theme-background)] transition hover:opacity-85">Entrar na MARKA</Link>
          </nav>
        </header>

        <MarkaHero />

        <main className="mx-auto max-w-7xl px-4 pb-20 sm:px-6">
          <section aria-label="Descobrir produtos e serviços" className="rounded-[2rem] border border-[var(--theme-border)] bg-[var(--theme-background)]/70 p-4 backdrop-blur-xl sm:p-8">
            <ProductGrid />
          </section>
        </main>
      </div>
    </DynamicBackground>
  );
}
