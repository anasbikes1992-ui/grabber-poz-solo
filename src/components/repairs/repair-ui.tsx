'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import {
  Battery,
  Camera,
  Droplets,
  Laptop,
  Plug,
  Smartphone,
  Watch,
  Wrench,
} from 'lucide-react';
import type { RepairServiceDefinition } from '@/lib/repairs/types';

const ICONS: Record<string, LucideIcon> = {
  battery: Battery,
  smartphone: Smartphone,
  plug: Plug,
  camera: Camera,
  droplets: Droplets,
  watch: Watch,
  laptop: Laptop,
  wrench: Wrench,
};

function money(n: number) {
  return `LKR ${n.toLocaleString('en-LK', { maximumFractionDigits: 0 })}`;
}

export function RepairServiceCard({ service }: { service: RepairServiceDefinition }) {
  const Icon = ICONS[service.icon] || Wrench;
  const reduceMotion = useReducedMotion();

  return (
    <motion.article
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="group flex h-full flex-col rounded-3xl border border-[var(--sf-border)] bg-white/80 p-5 shadow-sm transition-shadow duration-200 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--sf-repair-muted)] text-[var(--sf-repair)]">
          <Icon className="h-5 w-5" aria-hidden />
        </div>
        <span className="rounded-full bg-[var(--sf-muted)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--sf-secondary)]">
          {service.availabilityBadge}
        </span>
      </div>
      <h3 className="mt-4 font-display text-lg font-bold text-[var(--sf-foreground)]">{service.name}</h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-[var(--sf-secondary)]">{service.description}</p>
      <p className="mt-3 text-xs font-medium text-[var(--sf-secondary)]">Typical time: {service.durationLabel}</p>
      <p className="mt-1 text-sm font-semibold text-[var(--sf-accent)]">
        {service.defaultPriceType === 'INSPECTION_REQUIRED'
          ? 'Inspection required — estimate after check-in'
          : service.startingPriceLkr
            ? `From ${money(service.startingPriceLkr)}`
            : 'Quote after inspection'}
      </p>
      <Link
        href={`/shop/repairs/request?service=${service.slug}`}
        className="mt-4 inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full border border-[var(--sf-border)] bg-white px-4 text-sm font-semibold text-[var(--sf-primary)] transition-colors duration-200 hover:border-[var(--sf-accent)] hover:text-[var(--sf-accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sf-ring)]"
      >
        Start request
      </Link>
    </motion.article>
  );
}

export function RepairStatusTimeline({ status }: { status: string }) {
  const steps = [
    'INTAKE',
    'CHECKED_IN',
    'DIAGNOSIS',
    'IN_PROGRESS',
    'READY',
    'DELIVERED',
  ];
  const labels: Record<string, string> = {
    INTAKE: 'Request received',
    CHECKED_IN: 'Checked in',
    DIAGNOSIS: 'Diagnosis',
    IN_PROGRESS: 'In progress',
    READY: 'Ready',
    DELIVERED: 'Completed',
  };
  const idx = steps.indexOf(status);

  return (
    <ol className="space-y-3" aria-label="Repair progress">
      {steps.map((step, i) => {
        const done = idx >= i && idx !== -1;
        const current = step === status;
        return (
          <li key={step} className="flex items-center gap-3">
            <span
              className={[
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                done ? 'bg-[var(--sf-accent)] text-white' : 'bg-[var(--sf-muted)] text-[var(--sf-secondary)]',
                current ? 'ring-2 ring-[var(--sf-accent)] ring-offset-2' : '',
              ].join(' ')}
            >
              {i + 1}
            </span>
            <span className={done ? 'font-semibold text-[var(--sf-foreground)]' : 'text-[var(--sf-secondary)]'}>
              {labels[step]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
