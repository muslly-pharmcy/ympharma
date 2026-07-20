# TITANUS OMEGA AI PHARMACY OS — Master Roadmap (Plan)

هذا هو المرجع الرسمي للمشروع. يبقى في Plan ويُستخدم كخريطة للتنفيذ. كل Build لاحق يُنفذ مرحلة واحدة فقط منه.

---

## ✅ Foundation (مكتمل)
- React 19 + TanStack Start + SSR
- Authentication / Authorization / RBAC / RLS
- Audit Log + Domain Events + Idempotency
- Catalog / Warehouses / Suppliers / Purchase Orders
- Inventory Engine (FEFO, Reservations, Movements)
- Patients / Doctors
- Prescription Engine (state machine + notes + history)
- Dispensing Engine (FEFO consume, barcodes, returns)
- Insurance Platform C4A (providers, plans, coverage, claims lifecycle, payments) — server + UI

---

## 🚀 Phase 4 — Medical Platform (المتبقي)

### Shipment C4B — Clinical Validation Framework *(framework فقط، بدون قواعد يدوية)*
- `DrugKnowledgeProvider` interface
- Adapters: Allergy, Interaction, Dose, Contraindication, Pregnancy, Renal, Hepatic
- `NullProvider` افتراضي + pluggable providers لاحقاً
- Hook داخل Prescription/Dispense لعرض تحذيرات استشارية فقط

## 🚀 Phase 5 — AI Platform
- AI Runtime: Prompt Registry، Tool Registry، Context Builder، Agent Runtime
- Memory: Knowledge Graph، Embeddings، Semantic Search، Conversation Memory
- Cost Tracking، Evaluation، Observability
- Agents: CEO / Pharmacy / Doctor / Inventory / Warehouse / Supplier / Purchasing / Finance / Marketing / Support / Analytics / Executive Assistant
- ميزات: OCR وصفات وفواتير، مطابقة أدوية، تطبيع أسماء، توقع طلب/انتهاء صلاحية، اقتراحات شراء، تقارير ذكية، مساعد سريري (استشاري)

## 🚀 Phase 6 — CRM
- Customer Profiles، Loyalty، Points، Memberships، Wallet، Coupons، Campaigns، Segmentation
- Communication: WhatsApp / SMS / Email / Push / In-App

## 🚀 Phase 7 — Analytics
- Executive Dashboard (Revenue، Profit، Purchases، Inventory، Prescriptions، Dispensing، Insurance، Clinical Warnings، AI Usage)
- تقارير: Sales، Expiry، Dead/Fast/Slow Stock، Supplier Performance، Doctor/Patient Stats، Financial

## 🚀 Phase 8 — Finance
- Cash Register، Expenses، Revenue، Refunds
- Supplier Payments، Insurance Payments، VAT/Tax
- Cost & Profit Analysis، Accounting Integration

## 🚀 Phase 9 — Automation
- Auto POs / Reorder، Low Stock & Expiry Alerts
- Daily / Weekly / Monthly AI Reports
- Marketing & Supplier Automation
- Background Workers، Scheduled Jobs، Webhooks

## 🚀 Phase 10 — Enterprise
- Multi-Tenant: Organizations / Branches / Departments
- API Gateway، Feature Flags، Plugin System
- Health Checks، Monitoring، Metrics، Distributed Logging
- Queue Workers، Backup / Restore، DR

## 🚀 Phase 11 — Mobile Ecosystem
- Pharmacy / Doctor / Patient / Warehouse / Delivery apps

## 🚀 Phase 12 — Integrations
- Supabase، WhatsApp، Email، SMS، Payment Gateways
- Barcode Scanners، Label Printers، OCR، External Drug DBs
- Insurance APIs، ERP، Accounting

## 🚀 Phase 13 — Security
- MFA، SSO (Google / Microsoft)، Session/Device Management
- CSRF، CSP، Rate Limiting، Secret Rotation، Encryption
- Audit Trail، Compliance Logging

## 🚀 Phase 14 — Quality
- Unit / Integration / E2E / Load / Security / Accessibility / Performance

## 🚀 Phase 15 — DevOps
- Docker، GitHub Actions، CI/CD، Staging/Prod، Rollback، Blue/Green
- Monitoring، Alerting، Log Aggregation

## 🚀 Phase 16 — Documentation
- API، Architecture، Database، Deployment، Operations، Admin، User، Developer guides

## 🚀 Phase 17 — Production Readiness (Gate)
- كل الوحدات الأساسية تعمل معاً
- RBAC + RLS مطبقان بالكامل
- كل العمليات الحساسة داخل Audit Log
- كل Domain Events تعمل
- اختبارات وحدة/تكامل ناجحة
- اختبارات أداء/أمان مكتملة
- خطة Backup/Restore
- مراقبة وتنبيهات إنتاج

---

## معايير معمارية ثابتة (تُطبق في كل Build)
- **Stack:** TanStack Start (SSR) + Supabase + Tailwind v4 + shadcn
- **Server-only logic** عبر `createServerFn` (لا edge functions للتطبيق الداخلي)
- **Auth:** Supabase JWT + `requireSupabaseAuth`؛ الحماية عبر `_authenticated/`
- **RBAC:** `requirePermission()` في كل mutation
- **RLS:** إجبارية على كل جدول public + GRANTs صريحة
- **Audit:** `audit()` بعد كل كتابة حسّاسة
- **Idempotency:** `withIdempotency()` لكل mutation ذات أثر مالي/مخزني
- **Domain Events:** `emit_domain_event()` بعد كل انتقال حالة
- **Naming:** جداول جديدة تحمل namespace واضح لتجنب اصطدام الـ legacy
- **UI:** RTL افتراضي، glassmorphism، ألوان Medical Future Palette 2026
- **Tests:** state machines تُختبر قبل الإطلاق
- **No hand-authored clinical rules** — كل شيء سريري خلف Provider Interface

---

## استراتيجية التنفيذ
كل Build لاحق ينفّذ **مرحلة واحدة فقط**، بالترتيب المقترح:

1. **Build #1 → Shipment C4B** (Clinical Framework)
2. **Build #2 → Phase 5** (AI Runtime + أول 3 Agents)
3. **Build #3 → Phase 6** (CRM Core)
4. **Build #4 → Phase 7** (Executive Analytics)
5. **Build #5 → Phase 8** (Finance)
6. **Build #6 → Phase 9** (Automation)
7. **Build #7 → Phases 10 + 13** (Enterprise + Security hardening)
8. **Build #8 → Phase 11** (Mobile)
9. **Build #9 → Phases 14 + 15 + 17** (Quality + DevOps + Production Gate)

عند اعتماد هذه الخطة، ابدأ التالي بـ: **"Build #1 — Shipment C4B"**.
