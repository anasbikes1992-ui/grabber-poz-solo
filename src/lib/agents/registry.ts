import type { VerticalFlags } from '@/lib/config/vertical-flags';
import type { AgentDefinition, AgentId } from './types';

export const AGENT_REGISTRY: AgentDefinition[] = [
  {
    id: 'SALES',
    label: 'Sales Agent',
    description: 'Daily revenue, COD follow-ups, and conversion hints',
    category: 'core',
    href: '/orders',
  },
  {
    id: 'INVENTORY',
    label: 'Inventory Agent',
    description: 'Low stock SKUs and replenishment draft PO hints',
    category: 'core',
    href: '/purchasing',
  },
  {
    id: 'MARKETING',
    label: 'Marketing Agent',
    description: 'Promo, hero banner, and campaign suggestions',
    category: 'core',
    href: '/marketing',
  },
  {
    id: 'REPAIR',
    label: 'Repair Agent',
    description: 'Open tickets, estimates awaiting approval, pickup ready',
    category: 'vertical',
    verticalFlag: 'repairs',
    href: '/repairs',
  },
  {
    id: 'RESTAURANT',
    label: 'Restaurant Agent',
    description: 'Table occupancy, open KOTs, and kitchen backlog',
    category: 'vertical',
    verticalFlag: 'restaurant',
    href: '/restaurant',
  },
  {
    id: 'HIRE_PURCHASE',
    label: 'Hire Purchase Agent',
    description: 'Active contracts, overdue EMIs, and settlement pipeline',
    category: 'vertical',
    verticalFlag: 'hirePurchase',
    href: '/hire-purchase',
  },
  {
    id: 'APPOINTMENTS',
    label: 'Appointments Agent',
    description: "Today's bookings and upcoming specialist slots",
    category: 'vertical',
    verticalFlag: 'appointments',
    href: '/appointments',
  },
  {
    id: 'LOYALTY',
    label: 'Loyalty Agent',
    description: 'Tier upgrades, unused points, and re-engagement',
    category: 'vertical',
    verticalFlag: 'loyalty',
    href: '/loyalty',
  },
  {
    id: 'WHOLESALE',
    label: 'Wholesale / B2B Agent',
    description: 'Open quotations and expiring proforma follow-ups',
    category: 'vertical',
    verticalFlag: 'wholesale',
    href: '/quotations',
  },
  {
    id: 'POLIM',
    label: 'Polim Potha Agent',
    description: 'Credit ledger balances, limits, and repayment reminders',
    category: 'vertical',
    href: '/polim-potha',
  },
  {
    id: 'WHATSAPP',
    label: 'WhatsApp Agent',
    description: 'Automation health, failed sends, and template gaps',
    category: 'communication',
    verticalFlag: 'whatsapp',
    href: '/whatsapp',
  },
  {
    id: 'CREATIVE',
    label: 'Creative Agent',
    description: 'Queued campaigns awaiting approve-to-storefront',
    category: 'communication',
    verticalFlag: 'creative',
    href: '/creative/dashboard',
  },
];

export function getAgentDefinition(id: AgentId): AgentDefinition | undefined {
  return AGENT_REGISTRY.find((a) => a.id === id);
}

export function listEnabledAgents(flags: VerticalFlags): AgentDefinition[] {
  return AGENT_REGISTRY.filter((agent) => {
    if (!agent.verticalFlag) return true;
    return Boolean(flags[agent.verticalFlag]);
  });
}

export function listEnabledAgentIds(flags: VerticalFlags): AgentId[] {
  return listEnabledAgents(flags).map((a) => a.id);
}
