/**
 * GRABBER BUSINESS OS — MASTER CLOSED-LOOP BUSINESS BRAIN
 * Orchestrates Observe → Measure → Analyze → Detect → Opportunity → Recommend → Policy → Approve → Execute → Attribute → Learn.
 */

import { readConfigJson, mergeConfigJson } from '@/lib/config/business-settings';
import { AutonomyPolicyEngine, type ActionCategory } from './autonomy-policy';
import { CockpitAggregator, type OwnerMorningBrief } from './cockpit';

export interface ClosedLoopActionRecord {
  id: string;
  actionType: string;
  category: ActionCategory;
  recommendedAt: string;
  approvedAt?: string;
  executedAt?: string;
  status: 'PROPOSED' | 'APPROVED' | 'REJECTED' | 'EXECUTED' | 'MEASURED';
  payload: Record<string, unknown>;
  expectedOutcome: {
    revenueImpactLkr?: number;
    description: string;
  };
  measuredOutcome?: {
    attributedOrders: number;
    attributedRevenueLkr: number;
    attributedProfitLkr: number;
    roiRatio?: number;
    evaluatedAt: string;
    learningNote: string;
  };
}

export class JarvisBusinessBrain {
  private policyEngine: AutonomyPolicyEngine;

  constructor() {
    this.policyEngine = new AutonomyPolicyEngine();
  }

  public getPolicyEngine() {
    return this.policyEngine;
  }

  public async listActionHistory(limit = 50): Promise<ClosedLoopActionRecord[]> {
    const cfg = await readConfigJson();
    const history = (cfg.jarvisActionHistory as ClosedLoopActionRecord[] | undefined) || [];
    return history.slice(0, limit);
  }

  public async logProposedAction(
    action: Omit<ClosedLoopActionRecord, 'id' | 'recommendedAt' | 'status'>,
  ): Promise<ClosedLoopActionRecord> {
    const cfg = await readConfigJson();
    const history = (cfg.jarvisActionHistory as ClosedLoopActionRecord[] | undefined) || [];

    const record: ClosedLoopActionRecord = {
      ...action,
      id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      recommendedAt: new Date().toISOString(),
      status: 'PROPOSED',
    };

    await mergeConfigJson({
      jarvisActionHistory: [record, ...history].slice(0, 300),
    });

    return record;
  }

  public async markActionExecuted(actionId: string): Promise<boolean> {
    const cfg = await readConfigJson();
    const history = (cfg.jarvisActionHistory as ClosedLoopActionRecord[] | undefined) || [];
    const idx = history.findIndex((a) => a.id === actionId);
    if (idx === -1) return false;

    history[idx].status = 'EXECUTED';
    history[idx].executedAt = new Date().toISOString();

    await mergeConfigJson({ jarvisActionHistory: history });
    return true;
  }

  public async recordAttributedLearning(
    actionId: string,
    measured: ClosedLoopActionRecord['measuredOutcome'],
  ): Promise<boolean> {
    const cfg = await readConfigJson();
    const history = (cfg.jarvisActionHistory as ClosedLoopActionRecord[] | undefined) || [];
    const idx = history.findIndex((a) => a.id === actionId);
    if (idx === -1) return false;

    history[idx].status = 'MEASURED';
    history[idx].measuredOutcome = measured;

    await mergeConfigJson({ jarvisActionHistory: history });
    return true;
  }

  public async runFullObservationCycle(): Promise<OwnerMorningBrief> {
    return CockpitAggregator.generateMorningBrief();
  }
}

export const defaultJarvisBrain = new JarvisBusinessBrain();
