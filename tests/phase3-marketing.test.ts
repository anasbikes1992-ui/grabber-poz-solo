import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';
import { matchJarvisIntent } from '@/lib/ai/jarvis-chat-router';

const root = path.resolve(__dirname, '..');
function read(rel: string) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

describe('Phase 3 Marketing OS', () => {
  it('GRW-04 Jarvis parses WhatsApp audience segment', () => {
    const vip = matchJarvisIntent('draft whatsapp to VIP: Flash sale this weekend');
    expect(vip?.toolName).toBe('draft_whatsapp_message');
    expect(vip?.args.audience).toBe('VIP');

    const all = matchJarvisIntent('broadcast message blast hello everyone');
    expect(all?.toolName).toBe('draft_whatsapp_message');
    expect(all?.args.audience).toBe('ALL');
  });

  it('GRW-04 customers page has segment blast CTA', () => {
    expect(read('src/app/customers/page.tsx')).toContain('SegmentBlastButton');
  });

  it('GRW-05 creative credit meter exists', () => {
    expect(fs.existsSync(path.join(root, 'src/lib/creative/credit-meter.ts'))).toBe(true);
    expect(fs.existsSync(path.join(root, 'src/app/api/creative/credits/route.ts'))).toBe(true);
    expect(read('src/app/creative/dashboard/page.tsx')).toContain('Render credits');
  });

  it('GRW-08 discounts page supports autoApply IF/THEN', () => {
    const src = read('src/app/discounts/page.tsx');
    expect(src).toContain('autoApply');
    expect(src).toContain('IF conditions');
  });

  it('GRW-09 whatsapp threads schema + API + inbox UI', () => {
    expect(read('src/db/schema.ts')).toContain('whatsappThreads');
    expect(fs.existsSync(path.join(root, 'drizzle/migrations/0012_whatsapp_threads.sql'))).toBe(true);
    expect(fs.existsSync(path.join(root, 'src/app/api/whatsapp/threads/route.ts'))).toBe(true);
    expect(read('src/app/whatsapp/page.tsx')).toContain('/api/whatsapp/threads');
    expect(read('src/app/api/webhooks/whatsapp/route.ts')).toContain('appendWhatsAppMessage');
  });
});
