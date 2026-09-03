'use client';

import React from 'react';

type FieldProps = {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
};

export function Field({ id, label, hint, error, children, className }: FieldProps) {
  const hintId = `${id}-hint`;
  const errId = `${id}-error`;
  const describedBy = [error ? errId : null, hint && !error ? hintId : null].filter(Boolean).join(' ') || undefined;

  const control = React.isValidElement(children)
    ? React.cloneElement(children as React.ReactElement<Record<string, unknown>>, {
        'aria-describedby': describedBy,
        'aria-invalid': error ? true : undefined,
      })
    : children;

  return (
    <div className={className}>
      <label htmlFor={id} className="text-xs font-semibold text-foreground block mb-1.5">
        {label}
      </label>
      {control}
      {hint && !error ? (
        <p id={hintId} className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errId} role="alert" className="text-[11px] text-red-400 mt-1">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export const staffInputClass =
  'w-full min-h-11 px-3 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-foreground placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:border-emerald-500/40';
