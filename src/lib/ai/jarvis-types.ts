/**
 * GRABBER BUSINESS OS — JARVIS AI COPILOT TYPES
 * Action Risk Classification & Typed Tool Calling Definitions
 */

export type JarvisActionRisk =
  | 'READ'
  | 'DRAFT'
  | 'LOW_RISK_WRITE'
  | 'HIGH_RISK_WRITE'
  | 'DESTRUCTIVE';

export interface JarvisUserContext {
  userId: string;
  userName: string;
  role: 'OWNER' | 'ADMIN' | 'MANAGER' | 'CASHIER' | 'WAREHOUSE' | 'ACCOUNTANT' | 'MARKETING';
  assignedBranchIds: string[];
  assignedWarehouseIds: string[];
}

export interface JarvisToolDefinition<TArgs = any, TResult = any> {
  name: string;
  description: string;
  risk: JarvisActionRisk;
  requiredRole?: string[];
  execute: (args: TArgs, context: JarvisUserContext) => Promise<TResult>;
}

export interface JarvisToolExecutionResult<TData = any> {
  toolName: string;
  risk: JarvisActionRisk;
  status: 'EXECUTED' | 'CONFIRMATION_REQUIRED' | 'BLOCKED_PERMISSION' | 'ERROR';
  confirmationToken?: string;
  confirmationDetails?: {
    actionDescription: string;
    affectedEntities: string[];
    riskSummary: string;
    payload: any;
  };
  data?: TData;
  errorMessage?: string;
}
