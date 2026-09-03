'use client';

import React, { useCallback, useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  as?: 'div' | 'form';
  onSubmit?: (e: React.FormEvent) => void;
  className?: string;
  /** Prevents close while a mutation is in flight. */
  busy?: boolean;
  description?: string;
}

function isCloseControl(el: HTMLElement) {
  return el.hasAttribute('data-modal-close');
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  as = 'div',
  onSubmit,
  className = 'max-w-lg',
  busy = false,
  description,
}: ModalProps) {
  const panelRef = useRef<HTMLElement>(null);
  const restoreTo = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const busyRef = useRef(busy);
  const titleId = useId();
  const descId = useId();
  const openedOnce = useRef(false);

  onCloseRef.current = onClose;
  busyRef.current = busy;

  const requestClose = useCallback(() => {
    if (busyRef.current) return;
    onCloseRef.current();
  }, []);

  useEffect(() => {
    if (!isOpen) {
      openedOnce.current = false;
      return;
    }

    const panel = panelRef.current;
    if (!openedOnce.current) {
      restoreTo.current = document.activeElement as HTMLElement;
      openedOnce.current = true;
      const preferred =
        panel?.querySelector<HTMLElement>('[data-autofocus]') ??
        Array.from(panel?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []).find((el) => !isCloseControl(el)) ??
        panel;
      window.requestAnimationFrame(() => preferred?.focus());
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.isComposing) {
        e.stopPropagation();
        requestClose();
        return;
      }
      if (e.key !== 'Tab' || !panel) return;
      const nodes = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => !el.hasAttribute('disabled') && el.tabIndex !== -1 && el.offsetParent !== null,
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
      const target = restoreTo.current;
      if (target && document.contains(target)) target.focus();
    };
  }, [isOpen, requestClose]);

  if (!isOpen || typeof document === 'undefined') return null;

  const panelClass = `glass-card border border-zinc-800 rounded-2xl p-6 w-full max-h-[min(90vh,720px)] overflow-y-auto shadow-2xl space-y-5 text-sm outline-none ${className}`;

  const header = (
    <div className="flex items-start justify-between gap-4 pb-3 border-b border-white/10">
      <div className="min-w-0">
        <h2 id={titleId} className="font-bold text-base text-foreground tracking-tight">
          {title}
        </h2>
        {description ? (
          <p id={descId} className="text-xs text-muted-foreground mt-1 leading-relaxed">
            {description}
          </p>
        ) : null}
      </div>
      <button
        type="button"
        data-modal-close
        onClick={requestClose}
        disabled={busy}
        aria-label={`Close ${title}`}
        className="h-11 w-11 shrink-0 -mr-1 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-zinc-800 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 disabled:opacity-40"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );

  const labelled = {
    role: 'dialog' as const,
    'aria-modal': true as const,
    'aria-labelledby': titleId,
    'aria-describedby': description ? descId : undefined,
    tabIndex: -1 as const,
    className: panelClass,
  };

  const overlay = (
    <div
      className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) requestClose();
      }}
    >
      {as === 'form' ? (
        <form
          {...labelled}
          ref={panelRef as React.RefObject<HTMLFormElement>}
          onSubmit={onSubmit}
        >
          {header}
          {children}
        </form>
      ) : (
        <div {...labelled} ref={panelRef as React.RefObject<HTMLDivElement>}>
          {header}
          {children}
        </div>
      )}
    </div>
  );

  return createPortal(overlay, document.body);
}
