'use client';

import React, { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  as?: 'div' | 'form';
  onSubmit?: (e: React.FormEvent) => void;
  className?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  as = 'div',
  onSubmit,
  className = 'max-w-md',
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreTo = useRef<HTMLElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    if (!isOpen) return;
    restoreTo.current = document.activeElement as HTMLElement;
    const panel = panelRef.current;
    const autofocus =
      panel?.querySelector<HTMLElement>('[autofocus]') ??
      panel?.querySelector<HTMLElement>(FOCUSABLE) ??
      panel;
    autofocus?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !panel) return;
      const nodes = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => !el.hasAttribute('disabled') && el.tabIndex !== -1
      );
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.body.style.overflow = prevOverflow;
      restoreTo.current?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const panelClass = `glass-card border border-zinc-800 rounded-2xl p-6 w-full shadow-2xl space-y-4 text-xs outline-none ${className}`;

  const header = (
    <div className="flex items-center justify-between pb-2 border-b border-white/10">
      <h2 id={titleId} className="font-bold text-sm text-foreground">
        {title}
      </h2>
      <button
        type="button"
        onClick={onClose}
        aria-label={`Close ${title}`}
        className="h-11 w-11 -mr-2 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-zinc-800 cursor-pointer"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );

  if (as === 'form') {
    return (
      <div
        className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <form
          ref={panelRef as unknown as React.RefObject<HTMLFormElement>}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
          onSubmit={onSubmit}
          className={panelClass}
        >
          {header}
          {children}
        </form>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={panelClass}
      >
        {header}
        {children}
      </div>
    </div>
  );
}
