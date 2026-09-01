/**
 * Build Jarvis user context from authenticated staff session + DB assignments.
 */
import { db, branches, warehouses } from '@/db';
import type { SessionUser } from '@/lib/auth/session';
import type { JarvisUserContext } from './jarvis-types';

export async function buildJarvisContext(session: SessionUser | null): Promise<JarvisUserContext | null> {
  if (!session) return null;

  const branchRows = await db.select({ id: branches.id }).from(branches).limit(50);
  const warehouseRows = await db.select({ id: warehouses.id }).from(warehouses).limit(50);

  const allBranchIds = branchRows.map((b) => b.id);
  const allWarehouseIds = warehouseRows.map((w) => w.id);

  // OWNER/ADMIN see all locations; scoped roles get all for now until user_assignments table is wired
  const scoped = ['MANAGER', 'CASHIER', 'WAREHOUSE'].includes(session.role);

  return {
    userId: session.userId,
    userName: session.name,
    role: session.role,
    assignedBranchIds: scoped && allBranchIds.length ? allBranchIds.slice(0, 1) : allBranchIds,
    assignedWarehouseIds: scoped && allWarehouseIds.length ? allWarehouseIds.slice(0, 1) : allWarehouseIds,
  };
}
