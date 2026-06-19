# Execution Roadmap — My Pharmacy Online
Source: `docs/strategic-takeover-plan.md` · Mode: execution only.

---

## PHASE 1 — QUICK WINS

### Within 24 hours
| # | Action | Impact | Effort | Priority |
|---|---|---|---|---|
| 1 | DB trigger: WhatsApp + sound ping to staff on new `orders` / `prescriptions` INSERT | Eliminates missed orders during WhatsApp Cloud outage | 3 h | CRITICAL |
| 2 | Add `stock_qty`, `reorder_point`, `expiry_date` to `public.products`; decrement inside `place_order` RPC | Stops selling phantom inventory | 4 h | CRITICAL |
| 3 | Close red-team H-1/H-2: per-IP rate-limit trigger on `storage.objects` INSERT + `WITH CHECK` on `prescriptions.image_urls` origin | Blocks anon storage/table flood | 2 h | CRITICAL |
| 4 | Cart page: "Add X ر.ي for free delivery" progress bar | +5–10% AOV same day | 1 h | HIGH |

### Within 3 days
| # | Action | Impact | Effort | Priority |
|---|---|---|---|---|
| 5 | `discount_codes` table + server-side validation in `place_order` (WELCOME10, FREESHIP3000, RX20) | First-order conversion lift | 1 d | CRITICAL |
| 6 | Customer order-history page lookup by phone (`get_order_history_public` already exists) | Repeat-purchase friction down | 0.5 d | HIGH |
| 7 | "Notify when in stock" widget on product page (new `stock_waitlist` table) | Recaptures OOS intent | 0.5 d | HIGH |
| 8 | Owner daily-digest WhatsApp at 08:00 (CEO Agent v0) | Owner visibility without admin panel | 0.5 d | HIGH |

### Within 7 days
| # | Action | Impact | Effort | Priority |
|---|---|---|---|---|
| 9 | First 8 product bundles (table + seed + UI strip on cart and home) | +15–18% AOV | 2 d | CRITICAL |
| 10 | Abandoned-cart WhatsApp recovery at +1 h (server-side `carts` table) | Recovers 10–20% of carts | 2 d | CRITICAL |
| 11 | Multi-pharmacist Rx queue with claim/release | Halves Rx response time | 2 d | HIGH |
| 12 | Driver-dispatch view + intermediate `out_for_delivery` status | On-time delivery visibility | 1.5 d | HIGH |

---

## PHASE 2 — 30-DAY EXECUTION

### Week 1 — Stop the bleeding
| Task | Owner | Depends on | Business impact |
|---|---|---|---|
| Stock columns + decrement | CTO | — | No phantom sales |
| Staff notification trigger | CTO | — | 100% order awareness |
| H-1/H-2 closure | CISO | — | Blocks abuse vector |
| Free-delivery progress bar | Growth | — | +AOV |
| Bundles table + 8 seeded bundles | Product | Stock columns | +AOV |

### Week 2 — Conversion levers
| Task | Owner | Depends on | Business impact |
|---|---|---|---|
| `discount_codes` engine | CTO | place_order RPC | First-order conv |
| Order-history-by-phone page | Product | — | Repeat |
| Stock waitlist + notify-on-restock cron | Ops | Stock columns | OOS recapture |
| WhatsApp flow 2 (out-for-delivery) | Ops | Driver status | Trust |

### Week 3 — Retention foundations
| Task | Owner | Depends on | Business impact |
|---|---|---|---|
| Loyalty points table + accrual in place_order | Growth | — | +25% repeat |
| Abandoned-cart server-side `carts` + +1 h WhatsApp | Growth | WhatsApp Cloud | +10% recovered |
| Reorder-reminder cron (chronic SKU list) | Ops | Order history | LTV |
| Rx-to-Quote AI v1 (drug-name extraction) | CTO | AI Gateway | Pharmacist throughput |

### Week 4 — Ops automation
| Task | Owner | Depends on | Business impact |
|---|---|---|---|
| Multi-pharmacist queue (claim/release) | Ops | Staff roles | Rx SLA |
| Driver-dispatch view + SLA timer | Ops | out_for_delivery status | On-time % |
| `admin_stats` materialised view + 5-min refresh | CTO | — | Admin home loads fast at scale |
| CEO + Inventory Agent v1 in `agent_runs` | CTO | Stock columns | Owner autonomy |

---

## PHASE 3 — AI COWORKER DEPLOYMENT

Implementation pattern (all six): `createServerFn` in `src/lib/agents/<name>.functions.ts` + pg_cron HTTP call to `/api/public/cron/<agent>` + row in `agent_runs(id, agent, started_at, finished_at, status, summary jsonb)` + WhatsApp/Slack output.

| Agent | Inputs | Outputs | Automations | KPIs |
|---|---|---|---|---|
| **CEO** | `orders`, `prescriptions`, `agent_runs` last 24 h | WhatsApp digest to owner 08:00 | Triggers Sales Agent on stalled Rx; CTO Agent on error spike | Revenue Δ, margin Δ, action-list freshness |
| **CTO** | `error_logs`, `slow_queries`, build status | Hourly status page; daily digest | Files GitHub issues on regressions; auto-disables flapping feature flags | Error rate <0.1%, p95 <800 ms |
| **IT** | Backup metadata, secret-age table, cert expiry | Weekly health report | Triggers `create_scheduled_backup` retry; reminds to rotate secrets >90 d | Backup success 100%, secret freshness |
| **Sales** | Stalled `prescriptions` (>15 min no quote), abandoned `carts` | Draft WhatsApp messages staff approves | Auto-sends after staff approval; logs conversion | Rx→order %, cart-recovery % |
| **Inventory** | `products.stock_qty`, sales velocity 30 d | Daily PO draft email to supplier | Auto-emails when stock < reorder_point; flags expiring SKUs | OOS rate <2%, expiry waste <3% |
| **Marketing** | Cohort table, RFM segments, top bundles | Weekly WhatsApp broadcast plan | Auto-schedules broadcasts; rotates promo codes | CTR, redemption %, ROAS |

---

## PHASE 4 — REVENUE ACCELERATION (ranked by ROI)

| Rank | Lever | Drives | Expected lift | Effort |
|---|---|---|---|---|
| 1 | Free-delivery threshold + AOV nudges | AOV | +12–18% | XS |
| 2 | Bundles (8 hero kits) | Orders + AOV | +15% AOV, +8% orders | S |
| 3 | Abandoned-cart WhatsApp +1 h | Orders | +10–20% carts recovered | S |
| 4 | Loyalty (Muslly Points) | Repeat | +25% repeat in 90 d | M |
| 5 | Reorder-reminder for chronic meds | Repeat + Rx | +30% LTV in chronic cohort | S |
| 6 | First-order code (WELCOME10) | Orders | +15% new-customer conv | XS |
| 7 | Rx quote SLA + auto "we got it" message | Rx | +25% Rx→order | M |
| 8 | "Notify when in stock" waitlist | Orders | Recovers OOS intent | XS |
| 9 | Order-history-by-phone | Repeat | Friction down | XS |
| 10 | Insurance B2B contracts | Orders + AOV | +15% revenue mix | XL |

---

## PHASE 5 — OPERATIONAL AUTOMATION

| Manual workflow today | Automation | Owner | Phase |
|---|---|---|---|
| Pharmacist reads each Rx | Rx-to-Quote AI v1 → suggestion list | CTO | Wk 3 |
| Staff watches for orders | DB trigger → WhatsApp + sound | Ops | Wk 1 |
| Staff messages "out for delivery" | Status-change trigger | Ops | Wk 2 |
| Staff guesses stock | `stock_qty` decrement + Inventory Agent | Ops | Wk 1 |
| Staff calls supplier | Auto-PO email at reorder point | Ops | Wk 4 |
| Staff chases abandoned cart | Sales Agent + WhatsApp at +1 h | Growth | Wk 3 |
| Staff sends reorder reminder | Cron + chronic-SKU table | Growth | Wk 3 |
| Staff writes weekly report | BI Agent → PDF/WhatsApp | CTO | Mo 2 |
| Staff fixes bad photos | Image-quality AI on upload | CTO | Mo 2 |
| Staff replies "in stock?" | Public stock API + AI chat | Product | Wk 2 |

---

## FINAL DELIVERABLE

### TOP 10 — THIS WEEK
| # | Action | Rank |
|---|---|---|
| 1 | Stock columns + decrement in `place_order` | CRITICAL |
| 2 | Staff-notification DB trigger | CRITICAL |
| 3 | Close H-1 / H-2 (storage + prescriptions origin check) | CRITICAL |
| 4 | `discount_codes` engine | CRITICAL |
| 5 | 8 product bundles live | CRITICAL |
| 6 | Free-delivery progress bar | HIGH |
| 7 | Order-history-by-phone page | HIGH |
| 8 | Stock waitlist + restock cron | HIGH |
| 9 | Abandoned-cart server table + +1 h WhatsApp | HIGH |
| 10 | CEO Agent v0 daily digest | MEDIUM |

### TOP 10 — THIS MONTH
| # | Action | Rank |
|---|---|---|
| 1 | Loyalty (Muslly Points) live | CRITICAL |
| 2 | Rx-to-Quote AI v1 | CRITICAL |
| 3 | Multi-pharmacist Rx queue | CRITICAL |
| 4 | Driver-dispatch view + SLA timer | HIGH |
| 5 | Reorder-reminder cron for chronic SKUs | HIGH |
| 6 | Inventory Agent v1 (PO draft email) | HIGH |
| 7 | `admin_stats` materialised view | HIGH |
| 8 | Sales Agent v1 (cart + Rx follow-up drafts) | HIGH |
| 9 | NPS + review collection post-delivery | MEDIUM |
| 10 | 3 paid-ad landing pages | MEDIUM |

### TOP 10 — THIS QUARTER
| # | Action | Rank |
|---|---|---|
| 1 | Pharmacist-of-Record licensed + displayed | CRITICAL |
| 2 | Two-pharmacist verification on dispense | CRITICAL |
| 3 | Insurance B2B contract with ≥1 insurer | CRITICAL |
| 4 | Partitioned `orders` / `prescriptions` / `error_logs` | HIGH |
| 5 | Cross-region storage replication | HIGH |
| 6 | All 10 AI agents in production | HIGH |
| 7 | TWA Android app published | HIGH |
| 8 | Postgres full-text product search | HIGH |
| 9 | Hire lead pharmacist + ops manager + growth lead | HIGH |
| 10 | Expansion to 2nd governorate | MEDIUM |
