import { describe, expect, it } from 'vitest';
import {
  evaluateHandoverReadiness,
  findBestDeployment,
  summarizeHandover,
  type HandoverClientInput,
  type HandoverDeploymentInput,
  type HandoverTaskInput,
} from '@/lib/company/handover-readiness';

const readyClient: HandoverClientInput = {
  id: 'client-1',
  businessName: 'The Demo Store',
  ownerName: 'Owner',
  status: 'LIVE',
  targetDomain: 'demo.grabberpoz.com',
  databaseName: 'postgres-demo',
  appStatus: 'READY',
  databaseStatus: 'READY',
  handoverStatus: 'READY',
  verticalPreset: 'general-retail',
  layoutTemplate: 'retail_wholesale',
};

const readyTasks: HandoverTaskInput[] = [
  'create_coolify_app',
  'create_database',
  'set_env_vars',
  'run_bootstrap',
  'seed_business',
  'configure_vertical',
  'configure_branding',
  'smoke_test',
  'handover',
].map((taskKey) => ({ taskKey, label: taskKey, status: 'DONE' }));

const readyDeployment: HandoverDeploymentInput = {
  id: 'deployment-1',
  clientId: 'client-1',
  businessName: 'The Demo Store',
  domain: 'demo.grabberpoz.com',
  databaseName: 'postgres-demo',
  deployStatus: 'LIVE',
  healthStatus: 'HEALTHY',
  commitSha: '908fbc1',
};

describe('handover readiness', () => {
  it('marks a client ready only when checklist, deployment, health, app and DB are aligned', () => {
    const readiness = evaluateHandoverReadiness(readyClient, readyTasks, readyDeployment);

    expect(readiness.ready).toBe(true);
    expect(readiness.grade).toBe('READY');
    expect(readiness.blockers).toEqual([]);
    expect(readiness.checklistPercent).toBe(100);
  });

  it('blocks handover when deployment health is not healthy', () => {
    const readiness = evaluateHandoverReadiness(
      readyClient,
      readyTasks,
      { ...readyDeployment, healthStatus: 'DEGRADED' },
    );

    expect(readiness.ready).toBe(false);
    expect(readiness.grade).toBe('NEEDS_REVIEW');
    expect(readiness.blockers).toContain('Deployment health is not HEALTHY');
  });

  it('requires smoke and SOP tasks before handover', () => {
    const tasks = readyTasks.map((task) => (task.taskKey === 'smoke_test' ? { ...task, status: 'PENDING' } : task));
    const readiness = evaluateHandoverReadiness(readyClient, tasks, readyDeployment);

    expect(readiness.ready).toBe(false);
    expect(readiness.blockers).toContain('Smoke test task is not complete');
    expect(readiness.checklistPercent).toBeLessThan(100);
  });

  it('matches deployments by client, domain, database, or business name', () => {
    expect(findBestDeployment(readyClient, [{ ...readyDeployment, clientId: 'client-1' }])?.id).toBe('deployment-1');
    expect(findBestDeployment(readyClient, [{ ...readyDeployment, clientId: null, domain: 'demo.grabberpoz.com' }])?.id).toBe('deployment-1');
    expect(findBestDeployment(readyClient, [{ ...readyDeployment, clientId: null, domain: null, databaseName: 'postgres-demo' }])?.id).toBe('deployment-1');
    expect(findBestDeployment(readyClient, [{ ...readyDeployment, clientId: null, domain: null, databaseName: null, businessName: 'The Demo Store' }])?.id).toBe('deployment-1');
  });

  it('summarizes ready, review, and blocked handovers', () => {
    const ready = evaluateHandoverReadiness(readyClient, readyTasks, readyDeployment);
    const review = evaluateHandoverReadiness(readyClient, readyTasks, null);
    const blocked = evaluateHandoverReadiness(readyClient, [{ ...readyTasks[0], status: 'BLOCKED' }], null);

    expect(summarizeHandover([ready, review, blocked])).toEqual({
      total: 3,
      ready: 1,
      needsReview: 1,
      blocked: 1,
    });
  });
});
