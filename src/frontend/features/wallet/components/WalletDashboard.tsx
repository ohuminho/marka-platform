"use client";

import { useEffect, useState } from "react";

import { useAuth } from "@/frontend/providers/auth/AuthProvider";

import WalletCard from "./WalletCard";
import TransactionList from "./TransactionList";

interface WalletData {
  walletId: string;
  userId: string;
  organizationId: string;
  accountId: string;
  balanceMinor: string;
  heldBalanceMinor: string;
  availableBalanceMinor: string;
  currency: string;
  status:
    | "ACTIVE"
    | "SUSPENDED"
    | "CLOSED";
}

export default function WalletDashboard() {
  const {
    activeOrganization,
    loading:
      authLoading,
  } = useAuth();

  const [
    wallet,
    setWallet,
  ] = useState<
    WalletData | undefined
  >();

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState<
    string | undefined
  >();

  useEffect(() => {
    if (authLoading) {
      return;
    }

    const load =
      async () => {
        try {
          setLoading(true);
          setError(undefined);

          const query =
            activeOrganization?.id
              ? `?organizationId=${encodeURIComponent(
                  activeOrganization.id
                )}`
              : "";

          const response =
            await fetch(
              `/api/wallet${query}`,
              {
                credentials:
                  "include",
                cache:
                  "no-store",
              }
            );

          const data =
            await response.json();

          if (!response.ok) {
            throw new Error(
              data.message ??
                "Unable to load wallet."
            );
          }

          setWallet(data);
        } catch (error) {
          console.error(
            "[WALLET_DASHBOARD_ERROR]",
            error
          );

          setWallet(undefined);

          setError(
            error instanceof Error
              ? error.message
              : "Unable to load wallet."
          );
        } finally {
          setLoading(false);
        }
      };

    load();
  }, [
    activeOrganization?.id,
    authLoading,
  ]);

  if (
    authLoading ||
    loading
  ) {
    return (
      <div className="space-y-8">
        <header>
          <p className="marka-kicker">MARKA WALLET</p>
          <h1 className="marka-editorial mt-3 text-4xl text-[var(--theme-text)]">
            Wallet
          </h1>

          <p className="text-[var(--theme-text-muted)]">
            Loading financial account...
          </p>
        </header>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <header>
          <p className="marka-kicker">MARKA WALLET</p>
        <h1 className="marka-editorial mt-3 text-4xl text-[var(--theme-text)]">
            Wallet
          </h1>
        </header>

        <div
          className="
            rounded-3xl
            border
            border-red-500/20
            bg-red-500/5
            p-6
          "
        >
          <p className="font-medium">
            Unable to load wallet
          </p>

          <p className="mt-2 text-sm text-[var(--theme-text-muted)]">
            {error}
          </p>
        </div>
      </div>
    );
  }

  if (!wallet) {
    return (
      <div className="overflow-hidden rounded-[1.5rem] border border-[var(--theme-border)] bg-[var(--theme-surface)] p-8 sm:p-10">
        <p className="marka-kicker">MARKA WALLET</p>
        <h1 className="marka-editorial mt-4 text-4xl text-[var(--theme-text)]">A sua conta financeira.</h1>
        <p className="mt-4 max-w-xl text-sm leading-7 text-[var(--theme-text-muted)]">
          O contexto financeiro desta organização ainda não está disponível para esta conta.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-5xl font-semibold">
          Wallet
        </h1>

        <p className="text-[var(--theme-text-muted)]">
          Your MARKA financial account
        </p>
      </header>

      <WalletCard
        balanceMinor={
          wallet.balanceMinor
        }
        heldBalanceMinor={
          wallet.heldBalanceMinor
        }
        availableBalanceMinor={
          wallet.availableBalanceMinor
        }
        currency={
          wallet.currency
        }
      />

      <TransactionList
        organizationId={
          wallet.organizationId
        }
      />
    </div>
  );
}
