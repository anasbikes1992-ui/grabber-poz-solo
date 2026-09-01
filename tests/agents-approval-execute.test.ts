import { describe, it, expect } from 'vitest';
import { isAgentApprovalToken } from '../src/lib/agents/approval-execute';

describe('agent approval execute', () => {
  it('detects agent approval tokens', () => {
    expect(isAgentApprovalToken('AGENT_REPAIR_123_abc')).toBe(true);
    expect(isAgentApprovalToken('JARVIS_draft_123')).toBe(false);
  });
});
