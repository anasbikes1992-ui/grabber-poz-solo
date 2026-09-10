# Agent Harness Construction — Grabber Business OS

**Status:** adopted for R6 agents + Jarvis tools  
**Date:** 2026-09-11  
**Related:** [`AGENTS.md`](./AGENTS.md), `src/lib/agents/*`, `src/lib/jarvis/*`

---

## Goal

Raise agent **completion rate** and cut **retries** by tightening action space, observations, recovery, and context — without adding LLM dependency to v1 deterministic agents.

---

## Current architecture (hybrid)

| Layer | Pattern | Role |
|-------|---------|------|
| `registry.ts` + `handlers.ts` | Function-calling style | Fixed agent IDs → READ DB → recommendations |
| `orchestrator.ts` | Batch runner | Enablement flags → log → optional approvals |
| `approval-bridge.ts` | Micro-tool (high risk) | Propose DRAFT approvals only |
| `approval-execute.ts` | Micro-tool (high risk) | Staff-gated EXECUTE + audit |
| Jarvis tools | Confirm token | Destructive actions need second confirm |

This matches the recommended **Hybrid**: ReAct-style briefing + typed execute paths.

---

## Action space (do / don't)

### Keep (stable, narrow)

| Action | Input | Output |
|--------|-------|--------|
| `runAgent(agentId)` | `{ agent }` enum | `{ summary, recommendations[], metrics? }` |
| `runAllEnabled` | `{ all: true }` | `AgentRunOutcome[]` |
| `proposeApproval` | recommendation pattern | `{ approvalId, status: DRAFT }` |
| `executeApproval` | `{ id }` + staff session | `{ status, auditId }` |

### Avoid

- Catch-all “do anything” Jarvis tools without confirm tokens
- Overlapping tools that both mutate inventory (prefer one commerce path)
- Free-text agent IDs (always `AGENT_IDS` enum)

---

## Observation contract (every agent / tool result)

Normalize toward:

```ts
type AgentObservation = {
  status: 'success' | 'warning' | 'error';
  summary: string;           // one line
  next_actions: string[];    // actionable follow-ups
  artifacts?: { path?: string; id?: string }[];
  recommendations?: string[];
  metrics?: Record<string, number | string>;
};
```

**Today:** `AgentResult` has `summary` + `recommendations` — good start.  
**Gap:** no explicit `status` / `next_actions` / `artifacts`. Map failures to `status: 'error'` with recovery hints.

### Error recovery contract

Every `error` path should include:

1. **Root cause hint** — e.g. `vertical flag off`, `DB unreachable`, `no KOTs open`
2. **Safe retry** — e.g. `Enable restaurant flag then POST /api/agents/run`
3. **Stop condition** — e.g. `Do not retry if assertRole fails; escalate to staff`

Wire this in `runAllEnabledAgents` catch blocks and handler empty-data branches.

---

## Granularity rules for this repo

| Risk | Tool style | Examples |
|------|------------|----------|
| High | Micro | migrations, Coolify secrets, `approval-execute`, PayHere refund |
| Medium | Medium | product CRUD, stock transfer, KOT settle |
| Low / bulk | Macro | `runAllEnabledAgents`, daily brief, graphify query |

Never let a daily brief agent **execute** PO create / EMI collect without Approval Center.

---

## Context budget

1. **System / docs:** keep `docs/AGENTS.md` short; deep plans live in `VERTICAL_DEPTH_PLAN.md`, `PRODUCTION_READY.md`.
2. **Skills on demand:** graphify, a11y, release-gate — load when invoked, not always.
3. **Graphify:** use `graphify-out/graph.json` + `query` instead of re-reading the whole tree.
4. **Compact at phase boundaries:** after Wave C / after Coolify incident — archive stale docs to `docs/archive/`.

---

## Benchmarks (track in release notes)

| Metric | Target (v1) | How |
|--------|-------------|-----|
| Agent brief completion | ≥ 95% agents return summary | `npm test -- tests/agents-*.test.ts` |
| Approval propose→execute | 0 silent fails | approval-execute tests |
| Retries per deploy task | ≤ 1 after Coolify secret fix | ops smoke |
| pass@1 release:gate R6 | green | `node scripts/release-gate.mjs r6` |

---

## Implementation checklist

- [ ] Add `status` + `next_actions` to `AgentResult` (types + handlers)
- [ ] Standardize catch in `orchestrator.ts` with recovery + stop
- [ ] Jarvis tool responses: always `confirmationToken` for mutate
- [ ] Document observation shape in `docs/AGENTS.md` (link this file)
- [ ] Optional: structured `artifacts` pointing to `/approvals?id=`

---

## Anti-patterns seen / to avoid

- Opaque “Agent failed: …” without next_actions
- Baking secrets as Docker build ARG (see Coolify incident doc)
- Loading full VERTICAL_DEPTH_PLAN into every agent turn
- Duplicate mutate paths (POS + restaurant + commerce) without shared `assertCanMutateCommerce`
