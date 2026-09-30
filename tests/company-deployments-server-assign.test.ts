import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  server: null as Record<string, unknown> | null,
  assigned: 0,
  currentServerId: null as string | null,
  updated: false,
}));

function chain(result: () => unknown) {
  const c: Record<string, unknown> = {};
  for (const k of ['from', 'where', 'orderBy', 'limit', 'for']) c[k] = () => c;
  c.then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) => Promise.resolve().then(result).then(resolve, reject);
  return c;
}

vi.mock('@/db', () => {
  const companyServers = { _name: 'company_servers', id: 'id' };
  const companyDeployments = { _name: 'company_deployments', id: 'id', serverId: 'serverId' };
  const auditLogs = { _name: 'audit_logs' };
  const tx = {
    select: (fields?: Record<string, unknown>) => {
      const table = { current: '' };
      const c = chain(() => {
        if (table.current === 'company_servers') return state.server ? [state.server] : [];
        if (fields && 'serverId' in fields) return [{ serverId: state.currentServerId }];
        return Array.from({ length: state.assigned }, (_, i) => ({ id: `d${i}` }));
      });
      c.from = (t: { _name: string }) => { table.current = t._name; return c; };
      return c;
    },
    insert: () => ({
      values: (v: Record<string, unknown>) => ({
        returning: () => Promise.resolve([{ id: 'dep-1', createdAt: new Date(), updatedAt: new Date(), ...v }]),
      }),
    }),
    update: () => ({
      set: (v: Record<string, unknown>) => ({
        where: () => ({
          returning: () => { state.updated = true; return Promise.resolve([{ id: 'dep-1', createdAt: new Date(), updatedAt: new Date(), ...v }]); },
        }),
      }),
    }),
  };
  return {
    companyServers,
    companyDeployments,
    auditLogs,
    db: { ...tx, insert: (t: { _name: string }) => (t._name === 'audit_logs' ? { values: () => Promise.resolve() } : tx.insert()), transaction: async (cb: (t: typeof tx) => unknown) => cb(tx) },
  };
});

vi.mock('@/lib/auth/session', () => ({
  requireActiveStaffSession: vi.fn(async () => ({ userId: 'u1', role: 'OWNER' })),
  assertRole: vi.fn((s: unknown) => s),
}));

import { PATCH, POST } from '@/app/api/company/admin/deployments/route';

const SERVER_ID = '33333333-3333-4333-8333-333333333333';
const DEP_ID = '44444444-4444-4444-8444-444444444444';
const healthy = { id: SERVER_ID, name: 'vps-01', maxClients: 5, diskUsagePercent: 40, healthStatus: 'HEALTHY', ramPressure: 'LOW' };
const req = (method: string, body: unknown) => new Request('http://x/api/company/admin/deployments', { method, body: JSON.stringify(body) });
const create = (extra: object = {}) => POST(req('POST', { businessName: 'Acme', appName: 'acme-pos', serverId: SERVER_ID, ...extra }));

beforeEach(() => {
  state.server = { ...healthy };
  state.assigned = 0;
  state.currentServerId = null;
  state.updated = false;
});

describe('deployment → server assignment', () => {
  it('404 for an unknown server', async () => {
    state.server = null;
    expect((await create()).status).toBe(404);
  });

  it('409 when the server is full', async () => {
    state.assigned = 5;
    const res = await create();
    expect(res.status).toBe(409);
    expect((await res.json()).error).toMatch(/vps-01 is FULL/);
  });

  it('409 when the server is blocked (disk >= 85%)', async () => {
    state.server = { ...healthy, diskUsagePercent: 90 };
    const res = await create();
    expect(res.status).toBe(409);
    expect((await res.json()).error).toMatch(/BLOCKED/);
  });

  it('allows assignment to a healthy server', async () => {
    state.assigned = 2;
    expect((await create()).status).toBe(200);
  });

  it('allows creation without a server', async () => {
    state.server = null;
    expect((await create({ serverId: null })).status).toBe(200);
  });

  it('PATCH keeping the same full server is not blocked', async () => {
    state.assigned = 5;
    state.currentServerId = SERVER_ID;
    const res = await PATCH(req('PATCH', { id: DEP_ID, serverId: SERVER_ID, notes: 'edit' }));
    expect(res.status).toBe(200);
    expect(state.updated).toBe(true);
  });

  it('PATCH moving to a full server is blocked', async () => {
    state.assigned = 5;
    state.currentServerId = null;
    const res = await PATCH(req('PATCH', { id: DEP_ID, serverId: SERVER_ID }));
    expect(res.status).toBe(409);
    expect(state.updated).toBe(false);
  });
});
