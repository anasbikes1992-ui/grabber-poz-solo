# GRABBER BUSINESS OS — JARVIS AUTONOMOUS BUSINESS OS OPERATIONAL MANUAL

---

## 1. Product Directive & The Closed-Loop Lifecycle

Jarvis transforms Grabber from a transactional POS into an intelligent, self-measuring Business Operating System.

### The Closed-Loop Intelligence Loop:
$$\text{Observe} \longrightarrow \text{Measure} \longrightarrow \text{Analyze} \longrightarrow \text{Detect} \longrightarrow \text{Opportunity} \longrightarrow \text{Recommend} \longrightarrow \text{Policy} \longrightarrow \text{Approve} \longrightarrow \text{Execute} \longrightarrow \text{Measure} \longrightarrow \text{Attribute} \longrightarrow \text{Learn}$$

```
                    ┌─────────────────────────┐
                    │      OBSERVE & MEASURE  │
                    │ (Live DB Orders/Stock)  │
                    └────────────┬────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │     DETECT & OPPORTUNITY│
                    │(Anomalies, High-Intent) │
                    └────────────┬────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │  ACTION POLICY MATRIX   │
                    │ (Check Autonomy & Limits)│
                    └────────────┬────────────┘
                                 │
                   ┌─────────────┴─────────────┐
                   │                           │
                   ▼                           ▼
        ┌────────────────────┐       ┌──────────────────┐
        │  APPROVAL CENTER   │       │ AUTONOMOUS (AUTO)│
        │(Human Sign-off req)│       │ (Safe Brief/Alert│
        └──────────┬─────────┘       └─────────┬────────┘
                   │                           │
                   └─────────────┬─────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │     EXECUTE ACTION      │
                    │ (Canonical Commerce API)│
                    └────────────┬────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │   MEASURE & ATTRIBUTE   │
                    │(Real Revenue/Profit ROI)│
                    └────────────┬────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │    FEEDBACK LEARNING    │
                    │ (Refine Future Strategy)│
                    └─────────────────────────┘
```

---

## 2. Action Policy Matrix (Fine-Grained Autonomy)

Rather than an unsafe, all-or-nothing "Auto" switch, Jarvis enforces a fine-grained Action Policy Matrix (`src/lib/jarvis/autonomy-policy.ts`):

| Action Category | Default Mode | Allowed Staff Roles | Limits & Cooldowns | Hard Safety Lock |
|:---|:---:|:---|:---|:---:|
| **Daily & Weekly Briefs** | `AUTO` | Owner, Admin, Manager | Max 24 / day | No |
| **Stock & Operational Alerts** | `AUTO` | Owner, Admin, Manager, Warehouse | Max 50 / day | No |
| **Draft Purchase Orders** | `APPROVAL` | Owner, Admin, Manager | Max LKR 100,000 / 6h cooldown | No |
| **Inter-Branch Stock Transfers** | `APPROVAL` | Owner, Admin, Warehouse | Max 10 / day / 2h cooldown | No |
| **Promotions & Discount Codes** | `APPROVAL` | Owner, Admin, Marketing | Max 3 / day / 12h cooldown | No |
| **Catalog Price Changes** | `APPROVAL` | Owner, Admin | Max LKR 50,000 / 24h cooldown | No |
| **WhatsApp Campaigns & Blasts** | `APPROVAL` | Owner, Admin, Marketing | Max 2 / day / 24h cooldown | No |
| **SEO Metadata Updates** | `APPROVAL` | Owner, Admin, Marketing | Max 50 / day | No |
| **Customer Reactivation Blasts** | `APPROVAL` | Owner, Admin, Manager | Max 20 / day | No |
| **Customer Refunds & Reversals** | `APPROVAL` | Owner, Admin | Always Requires Manual PIN | **YES (LOCKED)** |
| **Bank & Financial Transfers** | `APPROVAL` | Owner, Accountant | Always Requires Manual PIN | **YES (LOCKED)** |
| **Staff & User Role Permissions** | `APPROVAL` | Owner Only | Always Requires Manual PIN | **YES (LOCKED)** |

---

## 3. Owner Morning Brief & Cockpit (`/app`)

Every morning, Jarvis generates a business health overview:
* **Business Health Score (0–100)**: Evaluated across Sales Momentum (25%), Profitability & Margins (20%), Inventory Health (20%), Customer Retention (15%), SEO & Growth (10%), and Credit Debt (10%).
* **"Jarvis Noticed" Feed**: Critical inventory depletion alerts, sudden revenue spikes or drops, and SEO metadata gaps.
* **Opportunity Inbox**: Actionable, high-intent vectors (e.g. trending product surges, high-value dormant customer reactivations).
* **One-Click Action Approvals**: Review and confirm staged drafts with a single click.

---

## 4. Commerce-Connected SEO & Content Factory

Jarvis SEO connects directly to the commerce catalog:
* **Normalized Keyword Opportunity Score**:
  $$\text{Score} = (\text{Search Demand} \times 0.25) + (\text{Commercial Intent} \times 0.25) + (\text{Ranking Gap} \times 0.20) + (\text{Competition} \times 0.15) + (\text{Conversion} \times 0.15)$$
* **Intent Classifier**: Automatically identifies Commercial, Transactional, Informational, and Local search terms.
* **Dynamic JSON-LD Schemas**: Builds structured data for `Product`, `LocalBusiness`, `Store`, and `Restaurant` automatically.
* **Multi-Branch Landing Pages**: Generates `/locations/[city]-[branch-name]` pages with embedded map schema, opening hours, and phone numbers.

---

## 5. Closed-Loop Revenue & Profit Attribution

Jarvis tracks real financial outcomes, rejecting vanity metrics (impressions, click-throughs):
$$\text{Campaign / SEO} \longrightarrow \text{Customer} \longrightarrow \text{Order} \longrightarrow \text{Gross Revenue} \longrightarrow \text{Item COGS} \longrightarrow \text{Gross Profit} \longrightarrow \text{True ROAS / ROI}$$

**Example Jarvis Report**:
> *"The VIP Comeback WhatsApp Campaign generated **LKR 186,000** in verified revenue across 28 returning customers with **LKR 54,000** in gross profit on an ad spend of LKR 2,400 (ROAS: 77.5x, Realized ROI: 2,150%)."*
