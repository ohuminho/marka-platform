# MARKA automation worker

## Execution model

The MARKA API persists domain events. The scheduled GitHub Actions workflow invokes the internal worker every five minutes and processes a small batch of pending events. This keeps automation execution outside customer-facing requests and avoids introducing Redis, a paid queue provider, or a third-party scheduler.

The worker claims only pending event types with at least one active automation rule. Growth/analytics telemetry remains available to analytics and is claimed only if an active automation rule explicitly targets that event type.\n\nThe worker endpoint is:

`POST /api/internal/automation/process`

It accepts a batch limit from 1 to 10 (default 5). The worker has a 30-second serverless execution budget. Events use atomic database claims, a five-minute lease, bounded retries and idempotent automation executions. Notification creation and the successful execution state are committed in one database transaction.

## Authentication

The endpoint does not use a static shared secret. It validates a short-lived GitHub Actions OIDC JWT against GitHub's published signing keys and requires all of the following:

- issuer: `https://token.actions.githubusercontent.com`
- audience: `marka-automation`
- repository: `ohuminho/marka-platform`
- ref: `refs/heads/main`
- workflow: `.github/workflows/automation-worker.yml` on `main`
- event: scheduled run or manual workflow dispatch

A token from a fork, another repository, another branch or another workflow is rejected.

## Production URL

The workflow defaults to `https://markaao.com`. If MARKA production uses another origin, add the GitHub Actions repository variable `MARKA_AUTOMATION_URL` with the production origin (no trailing slash is required).

The scheduled workflow becomes active only after this workflow file reaches the repository's default branch. Use the Actions tab to run `MARKA Automation Worker` manually once after deployment and confirm that it returns HTTP 200 with a processing result.

## Operational limits

- Schedule cadence: every five minutes; GitHub may delay scheduled jobs during load.
- Batch size: five events per invocation.
- Maximum worker execution time: 30 seconds.
- Retry policy: bounded exponential backoff; events become terminal after five attempts.
- No automatic execution of arbitrary code or HTTP actions; the current automation allowlist is `notify_user`.
- This is an asynchronous best-effort worker, not a real-time guarantee. Business-critical financial, payment, trip-dispatch or identity transitions must remain in their deterministic domain services and must not depend on this generic notification worker.
