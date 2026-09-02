import * as Sentry from '@sentry/nextjs';

/** Capture unexpected errors with optional tags (client slug, route). */
export function captureAppException(
  error: unknown,
  context?: { tags?: Record<string, string>; extra?: Record<string, unknown> },
) {
  if (!process.env.SENTRY_DSN && !process.env.NEXT_PUBLIC_SENTRY_DSN) return;
  Sentry.withScope((scope) => {
    if (context?.tags) {
      for (const [k, v] of Object.entries(context.tags)) scope.setTag(k, v);
    }
    if (context?.extra) {
      for (const [k, v] of Object.entries(context.extra)) scope.setExtra(k, v);
    }
    Sentry.captureException(error);
  });
}

export function isSentryEnabled() {
  return Boolean(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN);
}
