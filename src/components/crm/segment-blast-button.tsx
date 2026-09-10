'use client';

import { useState } from 'react';
import { MessageSquare } from 'lucide-react';

type Props = {
  audience: string;
  countHint?: number;
};

/** Draft a WhatsApp broadcast for the active CRM segment via Jarvis (GRW-04 / VERT-M04). */
export function SegmentBlastButton({ audience, countHint }: Props) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function draft() {
    setBusy(true);
    setNote(null);
    try {
      const blastId = `blast_${Date.now().toString(36)}`;
      const seg = audience === 'ALL' ? 'ALL' : audience;

      await fetch('/api/marketing/spend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: 'WHATSAPP',
          campaignId: blastId,
          campaignName: `Segment ${seg}`,
          amount: 1,
          notes: `Segment blast draft for ${seg} — set real cost later`,
        }),
      }).catch(() => undefined);

      const res = await fetch('/api/jarvis/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `draft whatsapp to ${seg} segment: Exclusive offer for our ${seg} customers — reply YES to claim. Campaign ${blastId}`,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (data.status === 'CONFIRMATION_REQUIRED') {
        setNote(`Draft ready (${blastId}) — confirm in Jarvis/Approvals. Tag checkout campaignId=${blastId}`);
      } else {
        setNote(`${data.reply || 'Draft submitted.'} · ${blastId}`);
      }
    } catch (err) {
      setNote((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        disabled={busy}
        onClick={() => void draft()}
        className="inline-flex items-center gap-1.5 px-3 py-2 min-h-11 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-[11px] font-bold text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-50"
      >
        <MessageSquare className="h-3.5 w-3.5" aria-hidden />
        Draft WhatsApp to {audience}
        {typeof countHint === 'number' ? ` (${countHint})` : ''}
      </button>
      {note && (
        <p role="status" className="text-[10px] text-zinc-400 max-w-xs">
          {note}
        </p>
      )}
    </div>
  );
}
