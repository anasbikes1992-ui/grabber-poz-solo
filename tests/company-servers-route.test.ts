import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  role: 'OWNER',
  insertError: null as unknown,
  inserted: null as Record<string, unknown> | null,
  selectRows: [] as unknown[],
  deployments: [] as unknown[],
  deleted: false,
}));

function chain(result: () => unknown) {
  const c: Record<string, unknown> = {};
  for (const k of ['from', 'where', 'orderBy', 'limit', 'for']) c[k] = () => c;
  c.then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) => Promise.resolve().then(result).then(resolve, reject);
  return c;
}

vi.mock('@/db', () => {
  const companyServers = { _name: 'company_servers', id: 'id' };
  const companyDeployments = { _name: 'company_deployments', serverId: 'serverId' };
  const auditLogs = { _name: 'audit_logs' };
  const tx = {
    select: () => chain(() => (state.selectRows.length ? state.selectRows : state.deployments)),
    insert: () => ({ values: () => Promise.resolve() }),
    delete: () => ({ where: () => { state.deleted = true; return Promise.resolve(); } }),
  };
  return {
    companyServers,
    companyDeployments,
    auditLogs,
    db: {
      select: () => chain(() => state.deployments),
      insert: (table: { _name: string }) => ({
        values: (v: Record<string, unknown>) => {
          if (table._name === 'audit_logs') return Promise.resolve();
          state.inserted = v;
          return {
            returning: () => (state.insertError
              ? Promise.reject(state.insertError)
              : Promise.resolve([{ id: '11111111-1111-4111-8111-111111111111', createdAt: new Date(), updatedAt: new Date(), lastHeartbeatAt: null, ...v }])),
          };
        },
      }),
      transaction: async (cb: (t: typeof tx) => unknown) => cb(tx),
    },
  };
});

vi.mock('@/lib/auth/session', () => ({
  requireActiveStaffSession: vi.fn(async () => ({ userId: 'u1', role: state.role })),
  assertRole: vi.fn((session: { role: string }, roles: string[]) => {
    if (!roles.includes(session.role)) throw Object.assign(new Error('Forbidden'), { status: 403 });
    return session;
  }),
}));

import { DELETE, POST } from '@/app/api/company/admin/servers/route';

const post = (body: unknown) => POST(new Request('http://x/api/company/admin/servers', { method: 'POST', body: JSON.stringify(body) }));
const ID = '22222222-2222-4222-8222-222222222222';

beforeEach(() => {
  state.role = 'OWNER';
  state.insertError = null;
  state.inserted = null;
  state.selectRows = [];
  state.deployments = [];
  state.deleted = false;
});

describe('POST /api/company/admin/servers', () => {
  it('rejects roles outside OWNER/ADMIN/MANAGER', async () => {
    state.role = 'CASHIER';
    expect((await post({ name: 'vps-01' })).status).toBe(403);
  });

  it('returns 409, not setup-required, on duplicate name', async () => {
    state.insertError = Object.assign(new Error('duplicate key value violates unique constraint "company_servers_name_idx"'), { code: '23505' });
    const res = await post({ name: 'vps-01' });
    expect(res.status).toBe(409);
    expect((await res.json()).error).toMatch(/already exists/);
  });

  it('returns 409 when the pg error is wrapped in a cause', async () => {
    state.insertError = Object.assign(new Error('Failed query'), { cause: { code: '23505' } });
    expect((await post({ name: 'vps-01' })).status).toBe(409);
  });

  it('returns setupRequired only for missing relation codes', async () => {
    state.insertError = Object.assign(new Error('relation "company_servers" does not exist'), { code: '42P01' });
    const res = await post({ name: 'vps-01' });
    expect(res.status).toBe(503);
    expect((await res.json()).setupRequired).toBe(true);
  });

  it('does not treat unrelated errors mentioning the table as setup-required', async () => {
    state.insertError = new Error('something about company_servers failed');
    expect((await post({ name: 'vps-01' })).status).toBe(500);
  });

  it('stores empty optional strings as null', async () => {
    const res = await post({ name: 'vps-01', publicIp: '', hostname: '  ', coolifyUrl: '' });
    expect(res.status).toBe(200);
    expect(state.inserted).toMatchObject({ publicIp: null, hostname: null, coolifyUrl: null });
  });

  it('rejects non-http coolify URLs', async () => {
    expect((await post({ name: 'vps-01', coolifyUrl: 'javascript:alert(1)' })).status).toBe(400);
    expect((await post({ name: 'vps-01', coolifyUrl: 'not a url' })).status).toBe(400);
    expect((await post({ name: 'vps-01', coolifyUrl: 'https://coolify.example.com' })).status).toBe(200);
  });
});

describe('DELETE /api/company/admin/servers', () => {
  const del = (id = ID) => DELETE(new Request(`http://x/api/company/admin/servers?id=${id}`, { method: 'DELETE' }));

  it('400 on invalid id', async () => {
    expect((await del('nope')).status).toBe(400);
  });

  it('404 when server missing', async () => {
    state.selectRows = [];
    state.deployments = [];
    // first select (server lookup) returns []
    expect((await del()).status).toBe(404);
  });

  it('409 when deployments are still assigned', async () => {
    const server = { id: ID, name: 'vps-01', maxClients: 5, diskUsagePercent: 0, healthStatus: 'HEALTHY', ramPressure: 'LOW', createdAt: new Date(), updatedAt: new Date() };
    // both selects return the same rows: server row + one deployment row bound to this server
    state.selectRows = [{ ...server, serverId: ID, deployStatus: 'LIVE', healthStatus: 'HEALTHY' }];
    const res = await del();
    expect(res.status).toBe(409);
    expect(state.deleted).toBe(false);
  });

  it('deletes an empty server', async () => {
    const server = { id: ID, name: 'vps-01', maxClients: 5, diskUsagePercent: 0, healthStatus: 'HEALTHY', ramPressure: 'LOW', createdAt: new Date(), updatedAt: new Date() };
    state.selectRows = [server]; // serverId undefined => not counted as assigned
    const res = await del();
    expect(res.status).toBe(200);
    expect(state.deleted).toBe(true);
  });
});
