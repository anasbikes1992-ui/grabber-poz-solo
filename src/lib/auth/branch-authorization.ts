/**
 * GRABBER BUSINESS OS — BRANCH & LOCATION AUTHORIZATION (M3 SLICE 5)
 *
 * Implements CI-010:
 * Enforces strict server-side branch and location boundaries.
 * "Do not trust branchId from the browser."
 *
 * Hierarchy:
 * Authenticated Staff -> Staff Role -> Assigned Branch -> Allowed Warehouse/Register -> Commerce Mutation
 */

import type { SessionRole } from './session-edge';

export interface BranchContext {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
}

export interface RegisterContext {
  id: string;
  branchId: string;
  code: string;
  name: string;
  isActive: boolean;
}

export interface UserBranchProfile {
  userId: string;
  role: SessionRole;
  assignedBranchIds: string[];
  assignedWarehouseIds: string[];
  isGlobal: boolean;
}

export class BranchAuthorizationError extends Error {
  public status: number;
  public code: string;

  constructor(message: string, status = 403, code = 'UNAUTHORIZED_BRANCH_ACCESS') {
    super(message);
    this.name = 'BranchAuthorizationError';
    this.status = status;
    this.code = code;
  }
}

/**
 * Determines whether a given staff role has global multi-branch access rights.
 * OWNER and ADMIN have unrestricted multi-branch authority.
 */
export function isGlobalBranchRole(role: SessionRole): boolean {
  return role === 'OWNER' || role === 'ADMIN';
}

/**
 * Builds a user's branch authorization profile.
 */
export function buildUserBranchProfile(params: {
  userId: string;
  role: SessionRole;
  assignedBranchIds?: string[];
  assignedWarehouseIds?: string[];
}): UserBranchProfile {
  const isGlobal = isGlobalBranchRole(params.role);
  return {
    userId: params.userId,
    role: params.role,
    assignedBranchIds: params.assignedBranchIds || [],
    assignedWarehouseIds: params.assignedWarehouseIds || [],
    isGlobal,
  };
}

/**
 * CI-010-A: Assert Staff Branch Access.
 * Verifies that the staff member is permitted to operate on or query targetBranchId.
 * Rejects with 403 if staff is branch-scoped and targetBranchId is not in assignedBranchIds.
 */
export function assertUserBranchAccess(
  user: UserBranchProfile,
  targetBranchId: string,
): void {
  if (!targetBranchId) {
    throw new BranchAuthorizationError('Target branchId is required.', 400, 'BRANCH_ID_REQUIRED');
  }

  if (user.isGlobal) {
    return; // Owner/Admin has global authority across all branches
  }

  if (!user.assignedBranchIds.includes(targetBranchId)) {
    throw new BranchAuthorizationError(
      `Forbidden: Staff member (${user.role}) is not authorized to access or transact on branch ${targetBranchId}.`,
      403,
      'UNAUTHORIZED_BRANCH_ACCESS',
    );
  }
}

/**
 * CI-010-B: Resolves authoritative branchId for POS checkout / mutations.
 * Never blindly trusts client-provided branchId.
 * - If client requested a branchId, validates user access.
 * - If client omitted branchId, uses user's assigned default branch.
 * - If user is unassigned and non-global, rejects.
 */
export function resolveAuthoritativeBranch(
  user: UserBranchProfile,
  clientBranchId?: string | null,
  fallbackDefaultBranchId?: string,
): string {
  if (clientBranchId) {
    assertUserBranchAccess(user, clientBranchId);
    return clientBranchId;
  }

  if (user.isGlobal) {
    if (!fallbackDefaultBranchId) {
      throw new BranchAuthorizationError(
        'Global operator must specify a branchId for branch-level mutations.',
        400,
        'BRANCH_SPECIFICATION_REQUIRED',
      );
    }
    return fallbackDefaultBranchId;
  }

  if (user.assignedBranchIds.length === 0) {
    throw new BranchAuthorizationError(
      `Staff member (${user.role}) has no assigned retail branch. Contact administrator.`,
      403,
      'NO_ASSIGNED_BRANCH',
    );
  }

  return user.assignedBranchIds[0];
}

/**
 * CI-010-C: Assert POS Register Belongs to Authorized Branch.
 * Prevents a cashier at Branch A from ringing a sale on a register belonging to Branch B.
 */
export function assertRegisterBranchIntegrity(
  register: { id: string; branchId: string; active?: boolean },
  authorizedBranchId: string,
): void {
  if (register.active === false) {
    throw new BranchAuthorizationError(`POS register ${register.id} is inactive.`, 400, 'REGISTER_INACTIVE');
  }

  if (register.branchId !== authorizedBranchId) {
    throw new BranchAuthorizationError(
      `Register mismatch: Register ${register.id} belongs to branch ${register.branchId}, but transaction was routed to branch ${authorizedBranchId}.`,
      403,
      'REGISTER_BRANCH_MISMATCH',
    );
  }
}

/**
 * CI-010-D: Assert Location Access (Branch or Warehouse).
 * Verifies access to warehouses and branches for inventory movements, stock take, and GRN.
 */
export function assertLocationAccess(
  user: UserBranchProfile,
  location: { locationType: 'BRANCH' | 'WAREHOUSE'; locationId: string },
): void {
  if (user.isGlobal) return;

  if (location.locationType === 'BRANCH') {
    if (!user.assignedBranchIds.includes(location.locationId)) {
      throw new BranchAuthorizationError(
        `Staff member (${user.role}) is not authorized for branch location ${location.locationId}.`,
        403,
        'UNAUTHORIZED_LOCATION_ACCESS',
      );
    }
  } else if (location.locationType === 'WAREHOUSE') {
    if (!user.assignedWarehouseIds.includes(location.locationId)) {
      throw new BranchAuthorizationError(
        `Staff member (${user.role}) is not authorized for warehouse location ${location.locationId}.`,
        403,
        'UNAUTHORIZED_LOCATION_ACCESS',
      );
    }
  }
}

/**
 * CI-010-E: Assert Stock Transfer Source & Destination Authority.
 * Staff initiating or dispatching a transfer must have authority over the source location.
 */
export function assertTransferDispatchAuthority(
  user: UserBranchProfile,
  fromLocation: { locationType: 'BRANCH' | 'WAREHOUSE'; locationId: string },
): void {
  if (user.isGlobal) return;

  assertLocationAccess(user, fromLocation);
}

/**
 * CI-010-F: Filter Branch Scoped Queries (Reports & Stock balances).
 * Restricts query scope to user's authorized branches if user is not global.
 */
export function getAuthorizedBranchFilter(
  user: UserBranchProfile,
  requestedBranchId?: string | null,
): { isGlobal: boolean; branchIds: string[] } {
  if (user.isGlobal) {
    if (requestedBranchId) {
      return { isGlobal: false, branchIds: [requestedBranchId] };
    }
    return { isGlobal: true, branchIds: [] };
  }

  if (requestedBranchId) {
    assertUserBranchAccess(user, requestedBranchId);
    return { isGlobal: false, branchIds: [requestedBranchId] };
  }

  return { isGlobal: false, branchIds: [...user.assignedBranchIds] };
}
