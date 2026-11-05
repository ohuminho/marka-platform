import { expireRingingCalls } from "@/core/communications/expire-ringing-calls";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

function createTransaction(options: {
  expired?: Array<{ id: string; callerId: string; threadId: string | null }>;
  updateCount?: number;
}) {
  const notifications: Array<Record<string, unknown>> = [];
  const updates: Array<Record<string, unknown>> = [];
  const tx = {
    communicationCallSession: {
      findMany: async (args: Record<string, unknown>) => {
        (tx as any).findManyArgs = args;
        return options.expired ?? [];
      },
      updateMany: async (args: Record<string, unknown>) => {
        updates.push(args);
        return { count: options.updateCount ?? 1 };
      },
    },
    notification: {
      create: async (args: { data: Record<string, unknown> }) => {
        notifications.push(args.data);
        return { id: "notification-1" };
      },
    },
    findManyArgs: null as Record<string, unknown> | null,
  };
  return { tx, notifications, updates };
}

async function main(): Promise<void> {
  const now = new Date("2026-11-05T18:00:00.000Z");
  const expired = [{ id: "call-1", callerId: "caller-1", threadId: "thread-1" }];

  const successful = createTransaction({ expired, updateCount: 1 });
  const finalized = await expireRingingCalls(
    successful.tx as never,
    { threadId: "thread-1" },
    now,
  );

  assert(finalized === 1, "one expired call should be finalized");
  assert(successful.updates.length === 1, "call state should be conditionally updated");
  assert(successful.notifications.length === 1, "caller should receive one notification");
  assert(successful.notifications[0].userId === "caller-1", "notification recipient must be the persisted caller");
  assert(successful.notifications[0].type === "CALL_MISSED", "notification type should be CALL_MISSED");
  assert(
    JSON.stringify(successful.notifications[0].data) === JSON.stringify({ callId: "call-1", threadId: "thread-1" }),
    "notification should carry call context",
  );

  const raced = createTransaction({ expired, updateCount: 0 });
  const racedFinalized = await expireRingingCalls(
    raced.tx as never,
    { threadId: "thread-1" },
    now,
  );

  assert(racedFinalized === 0, "a call already finalized by another request should not count again");
  assert(raced.notifications.length === 0, "a concurrent loser must not create a duplicate notification");

  const empty = createTransaction({ expired: [] });
  const emptyFinalized = await expireRingingCalls(
    empty.tx as never,
    { conversationId: "conversation-1" },
    now,
  );

  assert(emptyFinalized === 0, "no expired calls should be finalized");
  assert(empty.updates.length === 0, "no update should run when there are no expired calls");
  assert(empty.notifications.length === 0, "no notification should be created without an expired call");

  console.log("Expired communication call notification tests passed.");
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
