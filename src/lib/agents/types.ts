import type { VerticalFlags } from '@/lib/config/vertical-flags';

/** All deterministic R6 agents (core commerce + vertical modules). */
export type AgentId =
  | 'SALES'
  | 'INVENTORY'
  | 'MARKETING'
  | 'REPAIR'
  | 'RESTAURANT'
  | 'HIRE_PURCHASE'
  | 'APPOINTMENTS'
  | 'LOYALTY'
  | 'WHOLESALE'
  | 'POLIM'
  | 'WHATSAPP'
  | 'CREATIVE';

export type AgentCategory = 'core' | 'vertical' | 'communication';

export type AgentDefinition = {
  id: AgentId;
  label: string;
  description: string;
  category: AgentCategory;
  /** When set, agent runs only if this vertical flag is true. */
  verticalFlag?: keyof VerticalFlags;
  href?: string;
};

export type AgentTask = {
  agent: AgentId;
  prompt: string;
};

export type AgentResult = {
  agent: AgentId;
  summary: string;
  recommendations: string[];
  metrics?: Record<string, number | string>;
};

export type AgentLogEntry = {
  id: string;
  agent: AgentId;
  summary: string;
  createdAt: string;
};

export const AGENT_IDS: AgentId[] = [
  'SALES',
  'INVENTORY',
  'MARKETING',
  'REPAIR',
  'RESTAURANT',
  'HIRE_PURCHASE',
  'APPOINTMENTS',
  'LOYALTY',
  'WHOLESALE',
  'POLIM',
  'WHATSAPP',
  'CREATIVE',
];

export function isAgentId(value: string): value is AgentId {
  return (AGENT_IDS as string[]).includes(value);
}
