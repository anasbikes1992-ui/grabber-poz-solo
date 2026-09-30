import { describe, expect, it } from 'vitest';
import { evaluateServerCapacity, isMissingRelation, isUniqueViolation, sortServersForAssignment } from '@/lib/company/server-fleet';

describe('company server fleet capacity', () => {
  it('keeps a normal under-capacity VPS assignable', () => {
    expect(evaluateServerCapacity({
      assignedClients: 3,
      maxClients: 5,
      diskUsagePercent: 60,
      healthStatus: 'HEALTHY',
      ramPressure: 'LOW',
    })).toEqual({
      status: 'HEALTHY',
      label: 'Healthy',
      canAssignClient: true,
      nextAction: 'Safe for a normal retail client.',
    });
  });

  it('warns at four of five clients so the next VPS is prepared early', () => {
    const result = evaluateServerCapacity({
      assignedClients: 4,
      maxClients: 5,
      diskUsagePercent: 60,
      healthStatus: 'HEALTHY',
      ramPressure: 'LOW',
    });

    expect(result.status).toBe('WARNING');
    expect(result.canAssignClient).toBe(true);
  });

  it('blocks assignment when server is full or disk is unsafe', () => {
    expect(evaluateServerCapacity({
      assignedClients: 5,
      maxClients: 5,
      diskUsagePercent: 60,
      healthStatus: 'HEALTHY',
      ramPressure: 'LOW',
    }).canAssignClient).toBe(false);

    expect(evaluateServerCapacity({
      assignedClients: 2,
      maxClients: 5,
      diskUsagePercent: 85,
      healthStatus: 'HEALTHY',
      ramPressure: 'LOW',
    }).status).toBe('BLOCKED');
  });

  it('prefers assignable low-load servers before full or unhealthy servers', () => {
    const sorted = sortServersForAssignment([
      { assignedClients: 5, maxClients: 5, diskUsagePercent: 50, healthStatus: 'HEALTHY', ramPressure: 'LOW', name: 'full' },
      { assignedClients: 1, maxClients: 5, diskUsagePercent: 40, healthStatus: 'HEALTHY', ramPressure: 'LOW', name: 'best' },
      { assignedClients: 0, maxClients: 5, diskUsagePercent: 90, healthStatus: 'HEALTHY', ramPressure: 'LOW', name: 'blocked' },
    ]);

    expect(sorted.map((server) => server.name)).toEqual(['best', 'full', 'blocked']);
  });

  it('blocks a DOWN server or HIGH RAM pressure', () => {
    const base = { assignedClients: 0, maxClients: 5, diskUsagePercent: 10, healthStatus: 'HEALTHY', ramPressure: 'LOW' };
    expect(evaluateServerCapacity({ ...base, healthStatus: 'DOWN' }).status).toBe('BLOCKED');
    expect(evaluateServerCapacity({ ...base, ramPressure: 'HIGH' }).status).toBe('BLOCKED');
  });

  it('warns but still assigns when DEGRADED or disk is 75-84%', () => {
    const base = { assignedClients: 0, maxClients: 5, diskUsagePercent: 10, healthStatus: 'HEALTHY', ramPressure: 'LOW' };
    const degraded = evaluateServerCapacity({ ...base, healthStatus: 'DEGRADED' });
    expect(degraded).toMatchObject({ status: 'WARNING', canAssignClient: true });
    expect(evaluateServerCapacity({ ...base, diskUsagePercent: 80 })).toMatchObject({ status: 'WARNING', canAssignClient: true });
  });

  it('falls back to 5 clients when maxClients is 0', () => {
    const result = evaluateServerCapacity({ assignedClients: 5, maxClients: 0, diskUsagePercent: 0, healthStatus: 'HEALTHY', ramPressure: 'LOW' });
    expect(result.status).toBe('FULL');
  });

  it('classifies pg error codes, including wrapped causes', () => {
    expect(isUniqueViolation({ code: '23505' })).toBe(true);
    expect(isUniqueViolation({ cause: { code: '23505' } })).toBe(true);
    expect(isMissingRelation({ code: '42P01' })).toBe(true);
    expect(isMissingRelation({ message: 'company_servers exploded' })).toBe(false);
  });
});
