export async function register() {
  // Defense in depth: never boot production with staff auth bypass enabled.
  if (process.env.NODE_ENV === 'production' && process.env.AUTH_OPTIONAL === 'true') {
    throw new Error(
      'AUTH_OPTIONAL=true is forbidden in production. Unset AUTH_OPTIONAL or set it to false.',
    );
  }

  // Defense in depth: refuse to boot if the Dockerfile's build-time placeholder
  // secrets leaked through as the REAL runtime value — i.e. the deploy platform
  // never overrode them. (This is deliberately NOT a `NODE_ENV !== 'production'`
  // check: webpack's DefinePlugin inlines `process.env.NODE_ENV` to the literal
  // 'production' in every build produced by `next build` — which always forces
  // NODE_ENV=production internally regardless of the invoking shell — so any
  // `if (process.env.NODE_ENV !== 'production')` branch is dead-code-eliminated
  // before the image ships. Verified empirically: this codebase's `NODE_ENV`-
  // gated dev bypasses (demo PIN, DEV_OWNER_SESSION, the staff middleware
  // bypass) are already physically absent from the compiled output of any
  // image built by this repo's Dockerfile — checking NODE_ENV again here would
  // itself be eliminated the same way and protect nothing. Placeholder-secret
  // detection checks an ordinary env var, which is never inlined, so it's a
  // genuine runtime check.)
  const BUILD_PLACEHOLDERS: Record<string, string> = {
    AUTH_SECRET: 'build_time_placeholder_secret_32chars_long_minimum',
    CRON_SECRET: 'build_time_placeholder_cron_secret',
  };
  for (const [name, placeholder] of Object.entries(BUILD_PLACEHOLDERS)) {
    if (process.env[name] === placeholder) {
      throw new Error(
        `Refusing to boot: ${name} is still the Dockerfile's build-time placeholder value. ` +
          `The deploy platform must inject a real, unique ${name} as a runtime env var — ` +
          `it was never meant to reach a running container.`,
      );
    }
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
