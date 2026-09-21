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
    <div className="w-full max-w-md px-6">
      <div className="mb-10 text-center">
        <div className="mb-3 text-3xl font-semibold tracking-[0.28em] text-white">
          MARKA
        </div>

        <p className="text-sm tracking-wide text-white/45">
          Global Digital Economy
        </p>
      </div>

      <div className="mb-8 flex rounded-2xl border border-white/10 bg-white/[0.04] p-1">
        <button
          type="button"
          onClick={() =>
            switchMode("login")
          }
          className={`flex-1 rounded-xl px-4 py-3 text-sm font-medium transition ${
            mode === "login"
              ? "bg-white text-black"
              : "text-white/55 hover:text-white"
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
              ? "bg-white text-black"
              : "text-white/55 hover:text-white"
          }`}
        >
          Create account
        </button>
      </div>

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
            className="w-full rounded-2xl border border-white/10 bg-white/[0.06] px-6 py-4 text-white placeholder:text-white/35 outline-none transition focus:border-white/30"
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
          className="w-full rounded-2xl border border-white/10 bg-white/[0.06] px-6 py-4 text-white placeholder:text-white/35 outline-none transition focus:border-white/30"
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
          className="w-full rounded-2xl border border-white/10 bg-white/[0.06] px-6 py-4 text-white placeholder:text-white/35 outline-none transition focus:border-white/30"
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
            className="w-full rounded-2xl border border-white/10 bg-white/[0.06] px-6 py-4 text-white placeholder:text-white/35 outline-none transition focus:border-white/30"
          />
        )}

        {isRegistering && (
          <p className="px-1 text-xs leading-5 text-white/40">
            Your password must contain at
            least 12 characters.
          </p>
        )}

        {message && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm leading-5 text-white/70">
            {message}
          </div>
        )}

        <button
          type="submit"
          disabled={
            loading || resending
          }
          className="w-full rounded-2xl bg-white py-4 font-medium text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
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
            className="mt-4 w-full rounded-2xl border border-white/10 bg-white/[0.04] py-3.5 text-sm font-medium text-white/70 transition hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {resending
              ? "Sending verification email..."
              : "Resend verification email"}
          </button>
        )}

      <p className="mt-8 text-center text-xs leading-5 text-white/30">
        By continuing, you agree to use MARKA
        responsibly and securely.
      </p>
    </div>
  );
}
