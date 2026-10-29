"use client";

import { useState } from "react";

import {
  login,
  register,
} from "../services/auth.client";

type AuthMode = "login" | "register";

export default function LoginForm() {
  const [mode, setMode] =
    useState<AuthMode>("login");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] =
    useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [resending, setResending] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [showResend, setShowResend] =
    useState(false);

  const isRegistering =
    mode === "register";

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setMessage("");
    setShowResend(false);

    if (isRegistering) {
      if (password !== confirmPassword) {
        setMessage(
          "Passwords do not match."
        );
        return;
      }

      if (password.length < 12) {
        setMessage(
          "Password must contain at least 12 characters."
        );
        return;
      }
    }

    setLoading(true);

    try {
      if (isRegistering) {
        await register(
          name,
          email,
          password
        );

        setMessage(
          "Account created. Check your email to verify your account."
        );

        setPassword("");
        setConfirmPassword("");
        return;
      }

      await login(email, password);

      window.location.href =
        "/app/dashboard";
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Unable to complete the request.";

      const normalizedErrorMessage =
        errorMessage.toLowerCase();

      setMessage(errorMessage);

      const requiresEmailVerification =
        normalizedErrorMessage.includes(
          "verification"
        ) ||
        normalizedErrorMessage.includes(
          "verify your email"
        );

      if (requiresEmailVerification) {
        setShowResend(true);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleResendVerification() {
    if (!email.trim()) {
      setMessage(
        "Enter your email address first."
      );
      return;
    }

    setResending(true);
    setMessage("");

    try {
      const response = await fetch(
        "/api/auth/resend-verification",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            email,
          }),
        }
      );

      const data =
        await response
          .json()
          .catch(() => null);

      if (!response.ok) {
        throw new Error(
          typeof data?.message === "string"
            ? data.message
            : "Unable to resend verification email."
        );
      }

      setMessage(
        "A new verification email has been sent. Please check your inbox."
      );
      setShowResend(false);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to resend verification email."
      );
    } finally {
      setResending(false);
    }
  }

  function switchMode(
    nextMode: AuthMode
  ) {
    setMode(nextMode);
    setMessage("");
    setShowResend(false);
  }

  return (
    <div className="relative w-full max-w-md overflow-hidden rounded-[2rem] border border-[var(--theme-border)] bg-[color-mix(in_srgb,var(--theme-surface)_90%,transparent)] px-6 py-8 shadow-[0_30px_100px_rgba(0,0,0,0.36)] backdrop-blur-2xl sm:px-8 sm:py-10">
      <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(233,189,88,0.14),transparent_68%)]" />
      <div className="relative">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-5 flex h-[4.25rem] w-[4.25rem] items-center justify-center rounded-[1.4rem] border border-[#e9bd58]/45 bg-[linear-gradient(145deg,rgba(255,255,255,0.09),rgba(233,189,88,0.06))] shadow-[0_12px_42px_rgba(233,189,88,0.12)]">
          <svg viewBox="0 0 40 40" fill="none" aria-hidden="true" className="h-8 w-8">
            <path d="M8 29V11l12 18 12-18v18" stroke="#e9bd58" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M13 11h14" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity=".65" />
          </svg>
        </div>
        <div className="mb-2 text-[1.8rem] font-semibold tracking-[0.3em] text-[var(--theme-text)]">MARKA</div>
        <p className="text-[10px] uppercase tracking-[0.24em] text-[var(--theme-text-muted)]">Global Digital Economy</p>
        <p className="mx-auto mt-5 max-w-xs text-sm leading-6 text-[var(--theme-text-muted)]">
          {isRegistering ? "Crie a sua identidade MARKA e aceda a um único ecossistema." : "A sua conta. Todas as possibilidades MARKA."}
        </p>
      </div>

      <div className="mb-8 flex rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-1">
        <button
          type="button"
          onClick={() =>
            switchMode("login")
          }
          className={`flex-1 rounded-xl px-4 py-3 text-sm font-medium transition ${
            mode === "login"
              ? "bg-[var(--theme-text)] text-[var(--theme-background)]"
              : "text-[var(--theme-text-muted)] hover:text-[var(--theme-text)]"
          }`}
        >
          Sign in
        </button>

        <button
          type="button"
          onClick={() =>
            switchMode("register")
          }
          className={`flex-1 rounded-xl px-4 py-3 text-sm font-medium transition ${
            mode === "register"
              ? "bg-[var(--theme-text)] text-[var(--theme-background)]"
              : "text-[var(--theme-text-muted)] hover:text-[var(--theme-text)]"
          }`}
        >
          Create account
        </button>
      </div>

      {isRegistering && (
        <div className="mb-6 flex items-center gap-4 rounded-2xl border border-[#e9bd58]/20 bg-[#e9bd58]/[0.045] p-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-[#e9bd58]/50 bg-[radial-gradient(circle_at_35%_25%,rgba(255,255,255,0.14),rgba(233,189,88,0.05)_60%,transparent)] shadow-[0_0_28px_rgba(233,189,88,0.08)]">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-7 w-7 text-[#e9bd58]">
              <circle cx="12" cy="8" r="3.25" stroke="currentColor" strokeWidth="1.4" />
              <path d="M5.5 19c.55-3.2 2.7-5 6.5-5s5.95 1.8 6.5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-[var(--theme-text)]">A sua identidade pessoal</p>
            <p className="mt-1 text-xs leading-5 text-[var(--theme-text-muted)]">Uma identidade visual distinta para a sua presença em todo o ecossistema MARKA.</p>
          </div>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-4"
      >
        {isRegistering && (
          <input
            type="text"
            placeholder="Full name"
            value={name}
            onChange={(event) =>
              setName(event.target.value)
            }
            required
            autoComplete="name"
            className="w-full rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface-strong)] px-6 py-4 text-[var(--theme-text)] placeholder:text-[var(--theme-text-faint)] outline-none transition focus:border-[var(--theme-accent-strong)]"
          />
        )}

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(event) =>
            setEmail(event.target.value)
          }
          required
          autoComplete="email"
          className="w-full rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface-strong)] px-6 py-4 text-[var(--theme-text)] placeholder:text-[var(--theme-text-faint)] outline-none transition focus:border-[var(--theme-accent-strong)]"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(event) =>
            setPassword(event.target.value)
          }
          required
          autoComplete={
            isRegistering
              ? "new-password"
              : "current-password"
          }
          className="w-full rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface-strong)] px-6 py-4 text-[var(--theme-text)] placeholder:text-[var(--theme-text-faint)] outline-none transition focus:border-[var(--theme-accent-strong)]"
        />

        {isRegistering && (
          <input
            type="password"
            placeholder="Confirm password"
            value={confirmPassword}
            onChange={(event) =>
              setConfirmPassword(
                event.target.value
              )
            }
            required
            autoComplete="new-password"
            className="w-full rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface-strong)] px-6 py-4 text-[var(--theme-text)] placeholder:text-[var(--theme-text-faint)] outline-none transition focus:border-[var(--theme-accent-strong)]"
          />
        )}

        {isRegistering && (
          <div className="space-y-2 px-1">
            <p className="text-xs leading-5 text-[var(--theme-text-faint)]">
              Your password must contain at least 12 characters.
            </p>
            <p className="text-xs leading-5 text-[var(--theme-text-muted)]">
              Já tens uma conta MARKA? Inicia sessão com a mesma conta para pedir viagens ou candidatar-te como motorista. Não cries uma segunda conta para conduzir.
            </p>
          </div>
        )}

        {message && (
          <div className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface-strong)]/[0.05] px-4 py-3 text-sm leading-5 text-[var(--theme-text-muted)]">
            {message}
          </div>
        )}

        <button
          type="submit"
          disabled={
            loading || resending
          }
          className="w-full rounded-2xl bg-[var(--theme-text)] py-4 font-medium text-[var(--theme-background)] transition hover:bg-[var(--theme-accent-strong)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading
            ? isRegistering
              ? "Creating account..."
              : "Authenticating..."
            : isRegistering
              ? "Create MARKA account"
              : "Enter MARKA"}
        </button>
      </form>

      {!isRegistering &&
        showResend && (
          <button
            type="button"
            onClick={
              handleResendVerification
            }
            disabled={
              loading || resending
            }
            className="mt-4 w-full rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] py-3.5 text-sm font-medium text-[var(--theme-text-muted)] transition hover:bg-[var(--theme-surface-strong)] hover:text-[var(--theme-text)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {resending
              ? "Sending verification email..."
              : "Resend verification email"}
          </button>
        )}

      <p className="mt-8 text-center text-xs leading-5 text-[var(--theme-text-faint)]">
        By continuing, you agree to use MARKA responsibly and securely.
      </p>
      <div className="mt-6 flex items-center justify-center gap-2 text-[9px] uppercase tracking-[0.18em] text-[var(--theme-text-faint)]">
        <span className="h-1.5 w-1.5 rounded-full bg-[#e9bd58]" />
        Secure account access
      </div>
      </div>
    </div>
  );
}
