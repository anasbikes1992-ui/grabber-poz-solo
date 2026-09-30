import { eq } from 'drizzle-orm';
import { db, companyDeployments, companyServers } from '@/db';
import { evaluateServerCapacity } from '@/lib/company/server-fleet';

export type DeploymentCounts = { assignedClients: number; liveClients: number; unhealthyClients: number };
type Executor = Pick<typeof db, 'select'>;

export const EMPTY_COUNTS: DeploymentCounts = { assignedClients: 0, liveClients: 0, unhealthyClients: 0 };

export async function deploymentCountsByServer(executor: Executor = db) {
  const rows = await executor.select({
    serverId: companyDeployments.serverId,
    deployStatus: companyDeployments.deployStatus,
    healthStatus: companyDeployments.healthStatus,
  }).from(companyDeployments);

  const counts = new Map<string, DeploymentCounts>();
  for (const row of rows) {
    if (!row.serverId) continue;
    const existing = counts.get(row.serverId) || { ...EMPTY_COUNTS };
    existing.assignedClients += 1;
    if (row.deployStatus === 'LIVE') existing.liveClients += 1;
    if (['DEGRADED', 'DOWN'].includes(row.healthStatus)) existing.unhealthyClients += 1;
    counts.set(row.serverId, existing);
  }
  return counts;
}

class FleetError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

/**
 * Must run inside a transaction: locks the server row so concurrent assignments
 * cannot overfill it. Throws an error carrying `status` (404/409) when not assignable.
 */
export async function assertServerAssignable(tx: Executor, serverId: string) {
  const [server] = await tx.select().from(companyServers).where(eq(companyServers.id, serverId)).for('update');
  if (!server) throw new FleetError('Server not found', 404);

  const rows = await tx
    .select({ id: companyDeployments.id })
    .from(companyDeployments)
    .where(eq(companyDeployments.serverId, serverId));

  const capacity = evaluateServerCapacity({
    assignedClients: rows.length,
    maxClients: server.maxClients,
    diskUsagePercent: server.diskUsagePercent,
    healthStatus: server.healthStatus,
    ramPressure: server.ramPressure,
  });
  if (!capacity.canAssignClient) {
    throw new FleetError(`Server ${server.name} is ${capacity.label.toUpperCase()}: ${capacity.nextAction}`, 409);
  }
  return server;
}
