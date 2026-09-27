import { NextResponse } from 'next/server';

type PublicErrorOptions = {
  status?: number;
  message?: string;
  logMessage?: string;
};

export function publicErrorResponse(error: unknown, options: PublicErrorOptions = {}) {
  const status = options.status ?? 500;
  const message = options.message ?? (status >= 500 ? 'Something went wrong' : 'Request failed');

  if (status >= 500) {
    console.error(options.logMessage || 'API request failed', error);
  }

  return NextResponse.json({ success: false, error: message }, { status });
}

export function validationErrorResponse(message = 'Invalid request') {
  return NextResponse.json({ success: false, error: message }, { status: 400 });
}
