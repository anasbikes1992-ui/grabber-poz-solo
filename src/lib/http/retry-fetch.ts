const DEFAULT_RETRIES = 3;
const BASE_DELAY_MS = 500;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Retry fetch on 429/5xx with exponential backoff (cap 8s). */
export async function fetchWithRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
  options?: { retries?: number; baseDelayMs?: number },
): Promise<Response> {
  const retries = options?.retries ?? DEFAULT_RETRIES;
  const baseDelayMs = options?.baseDelayMs ?? BASE_DELAY_MS;
  let lastRes: Response | null = null;

  for (let attempt = 0; attempt < retries; attempt += 1) {
    const res = await fetch(input, init);
    if (res.ok) return res;
    lastRes = res;
    const retryable = res.status === 429 || res.status >= 500;
    if (!retryable || attempt === retries - 1) return res;
    await sleep(Math.min(baseDelayMs * 2 ** attempt, 8000));
  }

  return lastRes!;
}
