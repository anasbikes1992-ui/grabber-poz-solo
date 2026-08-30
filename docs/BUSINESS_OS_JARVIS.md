# GRABBER BUSINESS OS — JARVIS AI COPILOT SPECIFICATION
**Authorized Typed Tool-Calling Intelligence Layer with Action Risk Tiers**

---

## 1. Grounding & Safety Principles

* **Zero Direct Database Mutations:** Jarvis never runs raw SQL (`UPDATE`, `DELETE`, `INSERT`).
* **Tool-Calling over Canonical Services:** All intelligence and actions execute through strongly-typed TypeScript function tools that validate permissions and pass through business service invariants.
* **Five-Tier Action Risk Classification:**
  1. `READ`: Safe query tools (sales summaries, low stock list, customer profile). Instant execution.
  2. `DRAFT`: Creates draft objects (draft purchase order, draft campaign script). Safe to execute without blocking.
  3. `LOW_RISK_WRITE`: Minor non-financial edits (tagging a customer, updating product notes).
  4. `HIGH_RISK_WRITE`: Financial or inventory mutations (initiating a stock transfer, changing selling price, issuing a store discount). Requires explicit user confirmation via UI prompt.
  5. `DESTRUCTIVE`: Permanent deletions or bulk resets (wipe catalog, delete transactions). Prohibited or requires multi-factor owner override.

---

## 2. Jarvis Tool Classification & Execution Protocol

```
                        USER PROMPT
                             │
                             ▼
                     JARVIS LLM AGENT
                             │
                      Tool Selection
                             │
              ┌──────────────┴──────────────┐
              ▼                             ▼
       [READ / DRAFT]             [HIGH_RISK_WRITE]
              │                             │
              │                             ▼
              │                  RENDER PROPOSAL TO USER
              │                  (Source, Dest, Items, Qty)
              │                             │
              │                      [OWNER CONFIRM]
              │                             │
              └──────────────┬──────────────┘
                             │
                             ▼
                  CANONICAL SERVICE LAYER
                             │
                             ▼
                     AUDIT LOG RECORDED
```

### 2.1 Core Tool Signatures
```ts
// READ Tier
export const get_inventory_summary = defineTool({
  risk: 'READ',
  description: 'Retrieve real-time on-hand, reserved, and available stock per branch/warehouse.',
  parameters: z.object({ locationId: z.string().optional(), categoryId: z.string().optional() }),
  execute: async (args, context) => InventoryService.getSummary(args, context.user),
});

// DRAFT Tier
export const draft_purchase_order = defineTool({
  risk: 'DRAFT',
  description: 'Create a draft purchase order for supplier reordering without approving or sending.',
  parameters: z.object({ supplierId: z.string(), items: z.array(z.object({ productId: z.string(), quantity: z.number() })) }),
  execute: async (args, context) => PurchasingService.createDraftPO(args, context.user),
});

// HIGH_RISK_WRITE Tier
export const propose_stock_transfer = defineTool({
  risk: 'HIGH_RISK_WRITE',
  description: 'Propose an inter-branch or warehouse stock transfer for user approval.',
  parameters: z.object({ fromLocationId: z.string(), toLocationId: z.string(), items: z.array(z.object({ productId: z.string(), quantity: z.number() })) }),
  execute: async (args, context) => TransferService.stageTransferProposal(args, context.user),
});
```
