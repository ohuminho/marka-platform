import Link from "next/link";

import { VerificationService } from "@/core/auth/verification/verification.service";

type VerifyEmailPageProps = {
  searchParams: Promise<{
    token?: string | string[];
  }>;
};

export const dynamic = "force-dynamic";

export default async function VerifyEmailPage({
  searchParams,
}: VerifyEmailPageProps) {
  const params = await searchParams;

  const token =
    typeof params.token === "string"
      ? params.token.trim()
      : "";

  let verified = false;

  if (token) {
    const verificationService =
      new VerificationService();

    const user =
      await verificationService.verifyToken(token);

    verified = Boolean(user);
  }

  return (
    <main className="min-h-screen bg-[var(--theme-background)] px-6 py-16 text-[var(--theme-text)]">
      <div className="mx-auto flex min-h-[70vh] w-full max-w-xl items-center justify-center">
        <section className="w-full rounded-[2rem] border border-[var(--theme-border)] bg-[var(--theme-surface)] p-8 text-center shadow-2xl backdrop-blur-xl sm:p-12">
          <div className="mb-8 text-3xl font-semibold tracking-[0.28em]">
            MARKA
          </div>

          {verified ? (
            <>
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface-strong)]">
                <span aria-hidden="true" className="text-2xl text-[var(--theme-accent)]">✓</span>
              </div>

              <h1 className="text-2xl font-semibold">Email verified</h1>

              <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-[var(--theme-text-muted)]">
                Your email address has been verified successfully. Your MARKA account is now active.
              </p>

              <Link href="/auth/login" className="mt-8 inline-flex w-full items-center justify-center rounded-2xl bg-[var(--theme-accent)] px-6 py-4 font-medium text-[var(--theme-background)] transition hover:opacity-90">
                Enter MARKA
              </Link>
            </>
          ) : (
            <>
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface)]">
                <span aria-hidden="true" className="text-xl text-[var(--theme-text-muted)]">!</span>
              </div>

              <h1 className="text-2xl font-semibold">Verification link unavailable</h1>

              <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-[var(--theme-text-muted)]">
                This verification link is invalid, expired, already used, or missing. Request a new verification email to continue.
              </p>

              <Link href="/auth/login" className="mt-8 inline-flex w-full items-center justify-center rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-6 py-4 font-medium text-[var(--theme-text)] transition hover:bg-[var(--theme-surface-strong)]">
                Return to sign in
              </Link>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
