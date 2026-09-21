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
    <main className="min-h-screen bg-black px-6 py-16 text-white">
      <div className="mx-auto flex min-h-[70vh] w-full max-w-xl items-center justify-center">
        <section className="w-full rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 text-center shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-12">
          <div className="mb-8 text-3xl font-semibold tracking-[0.28em]">
            MARKA
          </div>

          {verified ? (
            <>
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-white/20 bg-white/10">
                <span
                  aria-hidden="true"
                  className="text-2xl"
                >
                  ✓
                </span>
              </div>

              <h1 className="text-2xl font-semibold">
                Email verified
              </h1>

              <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-white/55">
                Your email address has been verified successfully. Your MARKA account is now active.
              </p>

              <Link
                href="/auth/login"
                className="mt-8 inline-flex w-full items-center justify-center rounded-2xl bg-white px-6 py-4 font-medium text-black transition hover:bg-white/90"
              >
                Enter MARKA
              </Link>
            </>
          ) : (
            <>
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/[0.03]">
                <span
                  aria-hidden="true"
                  className="text-xl text-white/60"
                >
                  !
                </span>
              </div>

              <h1 className="text-2xl font-semibold">
                Verification link unavailable
              </h1>

              <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-white/55">
                This verification link is invalid, expired, already used, or missing. Request a new verification email to continue.
              </p>

              <Link
                href="/auth/login"
                className="mt-8 inline-flex w-full items-center justify-center rounded-2xl border border-white/15 bg-white/[0.06] px-6 py-4 font-medium text-white transition hover:bg-white/[0.1]"
              >
                Return to sign in
              </Link>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
