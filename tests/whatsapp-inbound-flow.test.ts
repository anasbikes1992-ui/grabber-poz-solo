import { describe, it, expect } from 'vitest';
import {
  isWhatsAppGreeting,
  parseInboundIntent,
  phonesMatch,
} from '../src/lib/whatsapp/inbound-handler';

describe('whatsapp inbound flow', () => {
  it('parseInboundIntent routes menu choices', () => {
    expect(parseInboundIntent('hi')).toBe('greeting');
    expect(parseInboundIntent('1')).toBe('order');
    expect(parseInboundIntent('order please')).toBe('order');
    expect(parseInboundIntent('2')).toBe('repair');
    expect(parseInboundIntent('track my repair')).toBe('repair');
    expect(parseInboundIntent('3')).toBe('staff');
    expect(parseInboundIntent('talk to staff')).toBe('staff');
    expect(parseInboundIntent('menu')).toBe('menu');
    expect(parseInboundIntent('help')).toBe('menu');
    expect(parseInboundIntent('random text')).toBe('unknown');
  });

  it('isWhatsAppGreeting still matches openers', () => {
    expect(isWhatsAppGreeting('Hello!')).toBe(true);
    expect(isWhatsAppGreeting('help')).toBe(false);
  });

  it('phonesMatch normalizes LK numbers', () => {
    expect(phonesMatch('94779592288', '0779592288')).toBe(true);
    expect(phonesMatch('+94 77 959 2288', '94779592288')).toBe(true);
    expect(phonesMatch('94770000001', '94779592288')).toBe(false);
  });
});
