import { describe, it, expect } from 'vitest';
import { AutonomyPolicyEngine, DEFAULT_ACTION_POLICIES } from '@/lib/jarvis/autonomy-policy';

describe('Jarvis Action Policy Matrix & Autonomy Engine', () => {
  it('initializes with default safe action policies', () => {
    const engine = new AutonomyPolicyEngine();
    const policies = engine.getAllPolicies();
    expect(policies.length).toBeGreaterThanOrEqual(12);

    const refundPolicy = engine.getPolicy('FINANCIAL_REFUNDS');
    expect(refundPolicy.hardSafetyLock).toBe(true);
    expect(refundPolicy.currentMode).toBe('APPROVAL');
  });

  it('prohibits setting hard-locked policies to AUTO', () => {
    const engine = new AutonomyPolicyEngine();
    expect(() => {
      engine.updatePolicy('FINANCIAL_REFUNDS', { currentMode: 'AUTO' });
    }).toThrow(/hard safety lock/);

    expect(() => {
      engine.updatePolicy('USER_PERMISSIONS', { currentMode: 'AUTO' });
    }).toThrow(/hard safety lock/);
  });

  it('allows configurable policies like reports and alerts to run autonomously', () => {
    const engine = new AutonomyPolicyEngine();
    const decision = engine.evaluateAction({
      category: 'REPORTS_AND_BRIEFS',
      userRole: 'OWNER',
    });

    expect(decision.allowed).toBe(true);
    expect(decision.effectiveMode).toBe('AUTO');
    expect(decision.requiresHumanApproval).toBe(false);
  });

  it('blocks unauthorized staff roles from triggering sensitive actions', () => {
    const engine = new AutonomyPolicyEngine();
    const decision = engine.evaluateAction({
      category: 'PRICING_UPDATES',
      userRole: 'CASHIER', // Cashiers cannot update prices
    });

    expect(decision.allowed).toBe(false);
    expect(decision.reason).toMatch(/not authorized/);
  });

  it('enforces transaction value thresholds requiring human approval', () => {
    const engine = new AutonomyPolicyEngine();
    const decision = engine.evaluateAction({
      category: 'PURCHASE_ORDERS',
      userRole: 'MANAGER',
      valueLkr: 250000, // Exceeds default LKR 100,000 threshold
    });

    expect(decision.allowed).toBe(true);
    expect(decision.requiresHumanApproval).toBe(true);
    expect(decision.reason).toMatch(/exceeds the autonomous threshold/);
  });

  it('enforces cooldown periods between repetitive automated executions', () => {
    const engine = new AutonomyPolicyEngine();
    const lastRun = new Date(Date.now() - 1000 * 60 * 30); // 30 minutes ago

    const decision = engine.evaluateAction({
      category: 'PURCHASE_ORDERS',
      userRole: 'OWNER',
      lastExecutionAt: lastRun, // Cooldown is 6 hours
    });

    expect(decision.allowed).toBe(false);
    expect(decision.reason).toMatch(/cooldown/);
  });
});
