import { describe, it, expect } from 'vitest';
import { AGENT_REGISTRY, listEnabledAgents, listEnabledAgentIds } from '../src/lib/agents/registry';
import { AGENT_IDS, isAgentId } from '../src/lib/agents/types';
import { DEFAULT_VERTICAL_FLAGS } from '../src/lib/config/vertical-flags';

describe('agent registry', () => {
  it('defines all vertical + core agents', () => {
    expect(AGENT_REGISTRY.length).toBe(12);
    expect(AGENT_IDS.length).toBe(12);
  });

  it('validates agent ids', () => {
    expect(isAgentId('REPAIR')).toBe(true);
    expect(isAgentId('RESTAURANT')).toBe(true);
    expect(isAgentId('INVALID')).toBe(false);
  });

  it('filters agents by vertical flags', () => {
    const allOff = listEnabledAgentIds({
      ...DEFAULT_VERTICAL_FLAGS,
      repairs: false,
      restaurant: false,
      hirePurchase: false,
      appointments: false,
      loyalty: false,
      wholesale: false,
      whatsapp: false,
      creative: false,
    });
    expect(allOff).toContain('SALES');
    expect(allOff).toContain('POLIM');
    expect(allOff).not.toContain('REPAIR');
    expect(allOff).not.toContain('RESTAURANT');
  });

  it('includes vertical agents when flags on', () => {
    const enabled = listEnabledAgents(DEFAULT_VERTICAL_FLAGS);
    const ids = enabled.map((a) => a.id);
    expect(ids).toContain('HIRE_PURCHASE');
    expect(ids).toContain('LOYALTY');
    expect(ids).toContain('CREATIVE');
  });

  it('maps each vertical flag to an agent', () => {
    const withFlag = AGENT_REGISTRY.filter((a) => a.verticalFlag);
    const flags = new Set(withFlag.map((a) => a.verticalFlag));
    expect(flags.has('repairs')).toBe(true);
    expect(flags.has('restaurant')).toBe(true);
    expect(flags.has('hirePurchase')).toBe(true);
  });
});
