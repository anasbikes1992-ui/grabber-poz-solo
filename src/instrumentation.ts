export async function register() {
  // Defense in depth: never boot production with staff auth bypass enabled.
  if (process.env.NODE_ENV === 'production' && process.env.AUTH_OPTIONAL === 'true') {
    throw new Error(
      'AUTH_OPTIONAL=true is forbidden in production. Unset AUTH_OPTIONAL or set it to false.',
    );
  }

  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config');
  }
}

export const onRequestError = async (
  ...args: Parameters<typeof import('@sentry/nextjs').captureRequestError>
) => {
  const { captureRequestError } = await import('@sentry/nextjs');
  captureRequestError(...args);
};
