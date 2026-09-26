import {
  AccountType,
  TransactionDirection,
  TransactionStatus,
  TransactionType,
} from "@prisma/client";

import { prisma } from "@/database/client/prisma";
import { accountService } from "@/services/accounts/account.service";
import { transactionService } from "@/services/transactions/transaction.service";

function assert(
  condition: boolean,
  message: string
): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function requireDatabase(): void {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL is required for financial integration tests."
    );
  }
}

async function main(): Promise<void> {
  requireDatabase();

  const membership =
    await prisma.organizationMembership.findFirst({
      where: {
        status: "ACTIVE",
        organization: {
          status: "ACTIVE",
        },
        user: {
          status: "ACTIVE",
        },
      },
      select: {
        organizationId: true,
        userId: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

  if (!membership) {
    throw new Error(
      "Financial integration tests require an active organization membership and active user."
    );
  }

  const {
    organizationId,
    userId,
  } = membership;

  const clearing =
    await accountService.ensureClearingAccount({
      organizationId,
      currency: "AOA",
      actorUserId: userId,
      correlationId:
        "financial-integration-test",
      requestId:
        "financial-integration-test",
    });

  assert(
    clearing.type === AccountType.CLEARING,
    "Clearing account must have CLEARING type"
  );

  assert(
    clearing.currency === "AOA",
    "Clearing account currency must be AOA"
  );

  /*
   * ---------------------------------------------------------
   * 1. Normal external payment -> clearing
   * ---------------------------------------------------------
   */

  const testKey =
    `TEST-EXTERNAL-CREDIT-${crypto.randomUUID()}`;

  const amountMinor = 10000n;

  const before =
    await prisma.account.findUnique({
      where: {
        id: clearing.id,
      },
      select: {
        balanceMinor: true,
        version: true,
      },
    });

  if (!before) {
    throw new Error(
      "Clearing account disappeared before test execution."
    );
  }

  const first =
    await transactionService.createExternalCredit({
      organizationId,
      idempotencyKey: testKey,
      type: TransactionType.PAYMENT,
      amountMinor,
      currency: "AOA",
      destinationAccountId: clearing.id,
      actorUserId: userId,
      actorType: "CUSTOMER",
      reference:
        `TEST-PAYMENT-${crypto.randomUUID()}`,
      referenceType:
        "INTEGRATION_TEST",
      context:
        "FINANCIAL_INTEGRATION_TEST",
      provider: "SANDBOX",
      providerPaymentId:
        `SANDBOX-TEST-${crypto.randomUUID()}`,
      metadata: {
        test: true,
      },
    });

  assert(
    first.status === TransactionStatus.COMPLETED,
    "External credit must complete"
  );

  assert(
    first.direction === TransactionDirection.CREDIT,
    "External credit must be CREDIT"
  );

  assert(
    first.amountMinor === amountMinor.toString(),
    "Transaction amount must remain in minor units"
  );

  assert(
    first.destinationAccountId === clearing.id,
    "Transaction must credit the clearing account"
  );

  assert(
    first.sourceAccountId === null,
    "External payment must not invent an internal source account"
  );

  const after =
    await prisma.account.findUnique({
      where: {
        id: clearing.id,
      },
      select: {
        balanceMinor: true,
        version: true,
      },
    });

  if (!after) {
    throw new Error(
      "Clearing account disappeared after test execution."
    );
  }

  assert(
    after.balanceMinor ===
      before.balanceMinor + amountMinor,
    "Clearing balance must increase exactly once"
  );

  assert(
    after.version === before.version + 1,
    "Clearing account version must increment exactly once"
  );

  const transactionCount =
    await prisma.transaction.count({
      where: {
        idempotencyKey: testKey,
      },
    });

  assert(
    transactionCount === 1,
    "Exactly one transaction must exist for the idempotency key"
  );

  const ledgerEntries =
    await prisma.ledgerEntry.findMany({
      where: {
        transactionId: first.id,
      },
      orderBy: {
        sequence: "asc",
      },
      select: {
        direction: true,
        amountMinor: true,
        currency: true,
        accountId: true,
      },
    });

  assert(
    ledgerEntries.length === 1,
    "External credit must create exactly one ledger entry"
  );

  assert(
    ledgerEntries[0].direction === "CREDIT",
    "External credit ledger entry must be CREDIT"
  );

  assert(
    ledgerEntries[0].amountMinor === amountMinor,
    "Ledger entry amount must equal transaction amount"
  );

  assert(
    ledgerEntries[0].currency === "AOA",
    "Ledger entry currency must equal transaction currency"
  );

  assert(
    ledgerEntries[0].accountId === clearing.id,
    "Ledger entry must belong to the clearing account"
  );

  /*
   * ---------------------------------------------------------
   * 2. Idempotent replay
   * ---------------------------------------------------------
   */

  const replay =
    await transactionService.createExternalCredit({
      organizationId,
      idempotencyKey: testKey,
      type: TransactionType.PAYMENT,
      amountMinor,
      currency: "AOA",
      destinationAccountId: clearing.id,
      actorUserId: userId,
      actorType: "CUSTOMER",
      reference:
        `REPLAY-${crypto.randomUUID()}`,
      referenceType:
        "INTEGRATION_TEST",
      context:
        "FINANCIAL_INTEGRATION_TEST",
      provider: "SANDBOX",
      providerPaymentId:
        "REPLAY-PROVIDER-ID",
      metadata: {
        test: true,
        replay: true,
      },
    });

  assert(
    replay.id === first.id,
    "Same idempotency key must replay the original transaction"
  );

  const afterReplay =
    await prisma.account.findUnique({
      where: {
        id: clearing.id,
      },
      select: {
        balanceMinor: true,
        version: true,
      },
    });

  if (!afterReplay) {
    throw new Error(
      "Clearing account disappeared after idempotency replay."
    );
  }

  assert(
    afterReplay.balanceMinor === after.balanceMinor,
    "Idempotency replay must not increase balance"
  );

  assert(
    afterReplay.version === after.version,
    "Idempotency replay must not change account version"
  );

  /*
   * ---------------------------------------------------------
   * 3. Concurrent identical requests
   * ---------------------------------------------------------
   */

  const concurrentKey =
    `TEST-CONCURRENT-CREDIT-${crypto.randomUUID()}`;

  const concurrentAmount = 15000n;

  const concurrentBefore =
    await prisma.account.findUnique({
      where: {
        id: clearing.id,
      },
      select: {
        balanceMinor: true,
        version: true,
      },
    });

  if (!concurrentBefore) {
    throw new Error(
      "Clearing account disappeared before concurrency test."
    );
  }

  const results =
    await Promise.allSettled([
      transactionService.createExternalCredit({
        organizationId,
        idempotencyKey: concurrentKey,
        type: TransactionType.PAYMENT,
        amountMinor: concurrentAmount,
        currency: "AOA",
        destinationAccountId: clearing.id,
        actorUserId: userId,
        actorType: "CUSTOMER",
        reference:
          "CONCURRENT-INTEGRATION-TEST",
        referenceType:
          "INTEGRATION_TEST",
        context:
          "CONCURRENT_FINANCIAL_INTEGRATION_TEST",
        provider: "SANDBOX",
        providerPaymentId:
          "CONCURRENT-PROVIDER",
      }),

      transactionService.createExternalCredit({
        organizationId,
        idempotencyKey: concurrentKey,
        type: TransactionType.PAYMENT,
        amountMinor: concurrentAmount,
        currency: "AOA",
        destinationAccountId: clearing.id,
        actorUserId: userId,
        actorType: "CUSTOMER",
        reference:
          "CONCURRENT-INTEGRATION-TEST",
        referenceType:
          "INTEGRATION_TEST",
        context:
          "CONCURRENT_FINANCIAL_INTEGRATION_TEST",
        provider: "SANDBOX",
        providerPaymentId:
          "CONCURRENT-PROVIDER",
      }),
    ]);

  const rejected =
    results.filter(
      (result) => result.status === "rejected"
    );

  assert(
    rejected.length <= 1,
    "Concurrent identical requests may reject at most one transaction attempt"
  );

  const concurrentTransactionCount =
    await prisma.transaction.count({
      where: {
        idempotencyKey: concurrentKey,
      },
    });

  assert(
    concurrentTransactionCount === 1,
    "Concurrent identical requests must create exactly one transaction"
  );

  const concurrentLedgerEntries =
    await prisma.ledgerEntry.count({
      where: {
        transaction: {
          idempotencyKey: concurrentKey,
        },
      },
    });

  assert(
    concurrentLedgerEntries === 1,
    "Concurrent identical requests must create exactly one ledger entry"
  );

  const concurrentAfter =
    await prisma.account.findUnique({
      where: {
        id: clearing.id,
      },
      select: {
        balanceMinor: true,
        version: true,
      },
    });

  if (!concurrentAfter) {
    throw new Error(
      "Clearing account disappeared after concurrency test."
    );
  }

  assert(
    concurrentAfter.balanceMinor ===
      concurrentBefore.balanceMinor + concurrentAmount,
    "Concurrent idempotent requests must credit the account exactly once"
  );

  assert(
    concurrentAfter.version ===
      concurrentBefore.version + 1,
    "Concurrent idempotent requests must increment account version exactly once"
  );

  /*
   * ---------------------------------------------------------
   * 4. Idempotency key reuse with different financial input
   * ---------------------------------------------------------
   */

  const mismatchedKey =
    `TEST-MISMATCHED-${crypto.randomUUID()}`;

  await transactionService.createExternalCredit({
    organizationId,
    idempotencyKey: mismatchedKey,
    type: TransactionType.PAYMENT,
    amountMinor: 5000n,
    currency: "AOA",
    destinationAccountId: clearing.id,
    actorUserId: userId,
    actorType: "CUSTOMER",
    reference:
      "MISMATCHED-IDEMPOTENCY-TEST",
    referenceType:
      "INTEGRATION_TEST",
    provider: "SANDBOX",
    providerPaymentId:
      "MISMATCHED-001",
  });

  let mismatchRejected = false;

  try {
    await transactionService.createExternalCredit({
      organizationId,
      idempotencyKey: mismatchedKey,
      type: TransactionType.PAYMENT,
      amountMinor: 6000n,
      currency: "AOA",
      destinationAccountId: clearing.id,
      actorUserId: userId,
      actorType: "CUSTOMER",
      reference:
        "MISMATCHED-IDEMPOTENCY-TEST",
      referenceType:
        "INTEGRATION_TEST",
      provider: "SANDBOX",
      providerPaymentId:
        "MISMATCHED-002",
    });
  } catch (error) {
    mismatchRejected =
      error instanceof Error &&
      error.message.includes(
        "Idempotency key was already used with a different request."
      );
  }

  assert(
    mismatchRejected,
    "Reusing an idempotency key with different financial input must be rejected"
  );

  console.log(
    "Financial payment-ledger integration tests passed."
  );
}

main()
  .catch((error) => {
    console.error(
      "Financial payment-ledger integration tests failed."
    );
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
