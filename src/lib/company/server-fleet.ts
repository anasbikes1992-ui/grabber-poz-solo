export type ServerCapacityInput = {
  assignedClients: number;
  maxClients: number;
  diskUsagePercent: number;
  healthStatus: string;
  ramPressure: string;
};

export type ServerCapacityState = {
  status: 'HEALTHY' | 'WARNING' | 'FULL' | 'BLOCKED';
  label: string;
  canAssignClient: boolean;
  nextAction: string;
};

function normalize(value: string | null | undefined) {
  return String(value || '').trim().toUpperCase();
}

export function evaluateServerCapacity(input: ServerCapacityInput): ServerCapacityState {
  const maxClients = Math.max(1, input.maxClients || 5);
  const assignedClients = Math.max(0, input.assignedClients || 0);
  const diskUsagePercent = Math.max(0, input.diskUsagePercent || 0);
  const health = normalize(input.healthStatus);
  const ram = normalize(input.ramPressure);

  if (health === 'DOWN' || diskUsagePercent >= 85 || ram === 'HIGH') {
    return {
      status: 'BLOCKED',
      label: 'Blocked',
      canAssignClient: false,
      nextAction: 'Do not assign new clients. Add capacity or move a heavy tenant.',
    };
  }

  if (assignedClients >= maxClients) {
    return {
      status: 'FULL',
      label: 'Full',
      canAssignClient: false,
      nextAction: 'Provision the next VPS before adding another client.',
    };
  }

  if (assignedClients >= maxClients - 1 || diskUsagePercent >= 75 || health === 'DEGRADED' || ram === 'MEDIUM') {
    return {
      status: 'WARNING',
      label: 'Warning',
      canAssignClient: assignedClients < maxClients && diskUsagePercent < 85,
      nextAction: 'Prepare the next VPS and avoid heavy clients on this server.',
    };
  }

  return {
    status: 'HEALTHY',
    label: 'Healthy',
    canAssignClient: true,
    nextAction: 'Safe for a normal retail client.',
  };
}

export function sortServersForAssignment<T extends ServerCapacityInput>(servers: T[]): T[] {
  const priority = { HEALTHY: 0, WARNING: 1, FULL: 2, BLOCKED: 3 } as const;
  return [...servers].sort((a, b) => {
    const aCapacity = evaluateServerCapacity(a);
    const bCapacity = evaluateServerCapacity(b);
    if (aCapacity.canAssignClient !== bCapacity.canAssignClient) return aCapacity.canAssignClient ? -1 : 1;
    if (aCapacity.status !== bCapacity.status) return priority[aCapacity.status] - priority[bCapacity.status];
    const aRatio = a.assignedClients / Math.max(1, a.maxClients || 5);
    const bRatio = b.assignedClients / Math.max(1, b.maxClients || 5);
    return aRatio - bRatio || a.diskUsagePercent - b.diskUsagePercent;
  });
}
