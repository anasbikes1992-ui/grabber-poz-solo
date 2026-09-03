export const COOKIE_NAME = 'grabber_session';
export const CUSTOMER_COOKIE_NAME = 'grabber_customer_session';
export const MAX_AGE_SEC = 60 * 60 * 12;
export const CUSTOMER_MAX_AGE_SEC = 60 * 60 * 24 * 30;

/** Dev-only middleware bypass. AUTH_OPTIONAL is ignored when NODE_ENV=production. */
export function isStaffMiddlewareOptional(
  nodeEnv: string | undefined = process.env.NODE_ENV,
  _authOptional: string | undefined = process.env.AUTH_OPTIONAL,
): boolean {
  return nodeEnv !== 'production';
}

export const DEV_OWNER_SESSION = {
  userId: '00000000-0000-0000-0000-000000000001',
  email: 'dev@localhost',
  name: 'Dev',
  role: 'OWNER' as const,
};
