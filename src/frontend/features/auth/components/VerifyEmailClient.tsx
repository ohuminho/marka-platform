"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type VerificationState =
  | "verifying"
  | "success"
  | "error";

interface VerifyEmailClientProps {
  token: string;
}

export default function VerifyEmailClient({
  token,
}: VerifyEmailClientProps) {
  const [state, setState] =
    useState<VerificationState>(
      token ? "verifying" : "error"
    );

  const [message, setMessage] = useState(
    token
      ? ""
      : "This verification link is invalid or incomplete."
  );

  useEffect(() => {
    if (!token) {
      return;
    }

    let cancelled = false;

    async function verify() {
      try {
        const response = await fetch(
          "/api/auth/verify-email",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              token,
            }),
          }
        );

        const data =
          await response.json().catch(() => null);

        if (cancelled) {
          return;
        }

        if (!response.ok) {
          setState("error");

          setMessage(
            typeof data?.message === "string"
              ? data.message
              : "We could not verify your email address."
          );

          return;
        }

        setState("success");

        setMessage(
          "Your email has been verified successfully."
        );
      } catch {
        if (cancelled) {
          return;
        }

        setState("error");

        setMessage(
          "We could not complete email verification. Please try again."
        );
      }
    }

    void verify();

    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <main className="min-h-screen bg-black px-6 py-16 text-white">
      <div className="mx-auto flex min-h-[70vh] w-full max-w-xl items-center justify-center">
        <section className="w-full rounded-[32px] border border-white/10 bg-white/[0.04] p-8 text-center shadow-2xl shadow-black/40 sm:p-12">
          <div className="mb-8">
            <div className="text-3xl font-semibold tracking-[0.28em] text-white">
              MARKA
            </div>

            <p className="mt-3 text-xs uppercase tracking-[0.22em] text-white/35">
              Global Digital Economy
            </p>
          </div>

          {state === "verifying" && (
            <>
              <div className="mx-auto mb-6 h-10 w-10 animate-spin rounded-full border-2 border-white/15 border-t-white" />

              <h1 className="text-2xl font-semibold">
                Verifying your email
              </h1>

              <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-white/50">
                Please wait while we securely verify
                your MARKA account.
              </p>
            </>
          )}

          {state === "success" && (
            <>
              <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full border border-white/15 bg-white/[0.06] text-xl">
                ✓
              </div>

              <h1 className="text-2xl font-semibold">
                Email verified
              </h1>

              <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-white/50">
                {message}
              </p>

              <Link
                href="/auth/login"
                className="mt-8 inline-flex rounded-2xl bg-white px-6 py-3.5 text-sm font-medium text-black transition hover:bg-white/90"
              >
                Enter MARKA
              </Link>
            </>
          )}

          {state === "error" && (
            <>
              <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-xl text-white/70">
                !
              </div>

              <h1 className="text-2xl font-semibold">
                Verification unsuccessful
              </h1>

              <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-white/50">
                {message}
              </p>

              <Link
                href="/auth/login"
                className="mt-8 inline-flex rounded-2xl border border-white/15 bg-white/[0.06] px-6 py-3.5 text-sm font-medium text-white transition hover:bg-white/[0.1]"
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
