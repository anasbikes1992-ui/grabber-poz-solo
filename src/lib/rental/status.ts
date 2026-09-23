export const RENTAL_ASSET_STATUSES = ['AVAILABLE', 'RENTED', 'MAINTENANCE', 'RETIRED'] as const;
export type RentalAssetStatus = (typeof RENTAL_ASSET_STATUSES)[number];

export const RENTAL_CONTRACT_STATUSES = ['DRAFT', 'ACTIVE', 'RETURNED', 'DISPUTED'] as const;
export type RentalContractStatus = (typeof RENTAL_CONTRACT_STATUSES)[number];

export function canActivateContract(contractStatus: string, assetStatus: string): boolean {
  return contractStatus === 'DRAFT' && assetStatus === 'AVAILABLE';
}

export function assertCanActivateContract(contractStatus: string, assetStatus: string): void {
  if (!canActivateContract(contractStatus, assetStatus)) {
    throw new Error(
      `Cannot activate: contract must be DRAFT (got ${contractStatus}) and asset AVAILABLE (got ${assetStatus})`,
    );
  }
}

export function canReturnContract(contractStatus: string): boolean {
  return contractStatus === 'ACTIVE';
}

export function assertCanReturnContract(contractStatus: string): void {
  if (!canReturnContract(contractStatus)) {
    throw new Error(`Cannot return contract in status ${contractStatus}; must be ACTIVE`);
  }
}

export function canDisputeContract(contractStatus: string): boolean {
  return contractStatus === 'ACTIVE';
}

export function assertCanDisputeContract(contractStatus: string): void {
  if (!canDisputeContract(contractStatus)) {
    throw new Error(`Cannot dispute contract in status ${contractStatus}; must be ACTIVE`);
  }
}

/** After activate: contract ACTIVE, asset RENTED */
export function statusesAfterActivate(): { contract: 'ACTIVE'; asset: 'RENTED' } {
  return { contract: 'ACTIVE', asset: 'RENTED' };
}

/** After return: contract RETURNED, asset AVAILABLE */
export function statusesAfterReturn(): { contract: 'RETURNED'; asset: 'AVAILABLE' } {
  return { contract: 'RETURNED', asset: 'AVAILABLE' };
}
