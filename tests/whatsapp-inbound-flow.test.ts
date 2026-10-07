import { describe, it, expect } from 'vitest';
import {
  buildCompanyWhatsAppReply,
  handleInboundWhatsAppMessage,
  isWhatsAppGreeting,
  parseCompanyInboundIntent,
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

  it('parseCompanyInboundIntent routes company sales choices', () => {
    expect(parseCompanyInboundIntent('hi')).toBe('menu');
    expect(parseCompanyInboundIntent('1')).toBe('demo');
    expect(parseCompanyInboundIntent('book demo')).toBe('demo');
    expect(parseCompanyInboundIntent('2')).toBe('pricing');
    expect(parseCompanyInboundIntent('pricing')).toBe('pricing');
    expect(parseCompanyInboundIntent('3')).toBe('sales');
    expect(parseCompanyInboundIntent('talk to sales')).toBe('sales');
    expect(parseCompanyInboundIntent('4')).toBe('store_demo');
    expect(parseCompanyInboundIntent('store demo')).toBe('store_demo');
    expect(parseCompanyInboundIntent('random text')).toBe('unknown');
  });

  it('buildCompanyWhatsAppReply keeps company mode sales oriented', () => {
    const menu = buildCompanyWhatsAppReply('menu');
    expect(menu).toContain('Grabber Business OS Pro');
    expect(menu).toContain('Book a live demo');
    expect(menu).toContain('Pricing / onboarding');

    const pricing = buildCompanyWhatsAppReply('pricing');
    expect(pricing).toContain('full Pro platform');
    expect(pricing).toContain('/#contact');
  });

  it('company landing mode uses the company WhatsApp flow', async () => {
    const reply = await handleInboundWhatsAppMessage('94770000001', '1', {
      landingMode: 'company',
    });

    expect(reply.handled).toBe(true);
    expect(reply.intent).toBe('company_demo');
    expect(reply.sent).toBe(1);
  });
});
