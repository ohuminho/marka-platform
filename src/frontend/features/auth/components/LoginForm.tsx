"use client";

import { useState } from "react";

import { login } from "../services/auth.client";

export default function LoginForm() {
  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  async function handleSubmit(
    event: React.FormEvent
  ) {
    event.preventDefault();

    setLoading(true);

    try {
      await login(
        email,
        password
      );

      window.location.href =
        "/app/dashboard";
    } catch {
      alert(
        "Invalid credentials"
      );
    }

    setLoading(false);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="
        space-y-6
        w-full
        max-w-md
      "
    >
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) =>
          setEmail(e.target.value)
        }
        className="
          w-full
          rounded-2xl
          border
          border-white/10
          bg-white/5
          px-6
          py-4
          outline-none
        "
      />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) =>
          setPassword(e.target.value)
        }
        className="
          w-full
          rounded-2xl
          border
          border-white/10
          bg-white/5
          px-6
          py-4
          outline-none
        "
      />

      <button
        disabled={loading}
        className="
          w-full
          rounded-2xl
          bg-white
          text-black
          py-4
          font-medium
        "
      >
        {loading
          ? "Authenticating..."
          : "Enter MARKA"}
      </button>
    </form>
  );
}
