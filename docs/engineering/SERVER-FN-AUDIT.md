# Server Function Auth Audit

Generated: 2026-07-21T00:46:02.490Z

- Total server functions scanned: **154**
- Protected by `requireSupabaseAuth`: **22/154**
- With `inputValidator`: **132/154**
- Unauthenticated (public): **132**

> Any function without `requireSupabaseAuth` is a public endpoint on the deployed site. Confirm each is intentionally public (health checks, public reads via `TO anon` RLS, marketing forms with signature/rate-limit guards) or add the middleware.

## ⚠ Unauthenticated server functions

- src/lib/ai.functions.ts :: listAgents (GET)
- src/lib/ai.functions.ts :: listAvailableToolsFn (GET)
- src/lib/ai.functions.ts :: invokeAgent (POST)
- src/lib/ai.functions.ts :: listRuns (GET)
- src/lib/analytics.functions.ts :: getExecutiveKpis (GET)
- src/lib/analytics.functions.ts :: getDispensesSeries (GET)
- src/lib/analytics.functions.ts :: getCustomersGrowth (GET)
- src/lib/analytics.functions.ts :: getCampaignsSummary (GET)
- src/lib/analytics.functions.ts :: getInventoryHealth (GET)
- src/lib/analytics.functions.ts :: getAiUsage (GET)
- src/lib/campaigns.functions.ts :: listCampaigns (GET)
- src/lib/campaigns.functions.ts :: getCampaign (GET)
- src/lib/campaigns.functions.ts :: listSegments (GET)
- src/lib/campaigns.functions.ts :: getSegment (GET)
- src/lib/campaigns.functions.ts :: previewSegment (POST)
- src/lib/campaigns.mutations.functions.ts :: upsertSegment (POST)
- src/lib/campaigns.mutations.functions.ts :: recalcSegment (POST)
- src/lib/campaigns.mutations.functions.ts :: createCampaign (POST)
- src/lib/campaigns.mutations.functions.ts :: updateCampaign (POST)
- src/lib/campaigns.mutations.functions.ts :: scheduleCampaign (POST)
- src/lib/campaigns.mutations.functions.ts :: transitionCampaign (POST)
- src/lib/campaigns.mutations.functions.ts :: startCampaign (POST)
- src/lib/catalog.functions.ts :: listProducts (GET)
- src/lib/catalog.functions.ts :: getProduct (GET)
- src/lib/catalog.functions.ts :: listCategories (GET)
- src/lib/catalog.mutations.functions.ts :: createProduct (POST)
- src/lib/catalog.mutations.functions.ts :: updateProduct (POST)
- src/lib/catalog.mutations.functions.ts :: archiveProduct (POST)
- src/lib/clinical.functions.ts :: runClinicalCheckForPrescription (POST)
- src/lib/cosmic-search.functions.ts :: cosmicSearch (POST)
- src/lib/customers.functions.ts :: listCustomers (GET)
- src/lib/customers.functions.ts :: getCustomer (GET)
- src/lib/customers.mutations.functions.ts :: createCustomer (POST)
- src/lib/customers.mutations.functions.ts :: updateCustomer (POST)
- src/lib/customers.mutations.functions.ts :: archiveCustomer (POST)
- src/lib/customers.mutations.functions.ts :: mergeCustomers (POST)
- src/lib/customers.mutations.functions.ts :: addCustomerAddress (POST)
- src/lib/customers.mutations.functions.ts :: addCustomerContact (POST)
- src/lib/customers.mutations.functions.ts :: addCustomerTag (POST)
- src/lib/customers.mutations.functions.ts :: removeCustomerTag (POST)
- src/lib/dispenses.functions.ts :: listDispenses (POST)
- src/lib/dispenses.functions.ts :: listPendingDispenses (POST)
- src/lib/dispenses.functions.ts :: getDispense (POST)
- src/lib/dispenses.mutations.functions.ts :: createDispense (POST)
- src/lib/dispenses.mutations.functions.ts :: prepareDispense (POST)
- src/lib/dispenses.mutations.functions.ts :: verifyDispenseItemBarcode (POST)
- src/lib/dispenses.mutations.functions.ts :: verifyDispense (POST)
- src/lib/dispenses.mutations.functions.ts :: dispensePrescription (POST)
- src/lib/dispenses.mutations.functions.ts :: completeDispense (POST)
- src/lib/dispenses.mutations.functions.ts :: cancelDispense (POST)
- src/lib/dispenses.mutations.functions.ts :: returnDispense (POST)
- src/lib/doctors.functions.ts :: listDoctors (GET)
- src/lib/doctors.functions.ts :: getDoctor (GET)
- src/lib/doctors.mutations.functions.ts :: createDoctor (POST)
- src/lib/doctors.mutations.functions.ts :: updateDoctor (POST)
- src/lib/doctors.mutations.functions.ts :: addLicense (POST)
- src/lib/insurance.functions.ts :: listInsuranceProviders (POST)
- src/lib/insurance.functions.ts :: listInsurancePlans (POST)
- src/lib/insurance.functions.ts :: getPatientCoverage (POST)
- src/lib/insurance.functions.ts :: listInsuranceClaims (POST)
- src/lib/insurance.functions.ts :: getInsuranceClaim (POST)
- src/lib/insurance.functions.ts :: listAuthorizations (POST)
- src/lib/insurance.mutations.functions.ts :: upsertInsuranceProvider (POST)
- src/lib/insurance.mutations.functions.ts :: upsertInsurancePlan (POST)
- src/lib/insurance.mutations.functions.ts :: upsertPatientInsurance (POST)
- src/lib/insurance.mutations.functions.ts :: verifyCoverage (POST)
- src/lib/insurance.mutations.functions.ts :: createAuthorization (POST)
- src/lib/insurance.mutations.functions.ts :: decideAuthorization (POST)
- src/lib/insurance.mutations.functions.ts :: createInsuranceClaim (POST)
- src/lib/insurance.mutations.functions.ts :: submitInsuranceClaim (POST)
- src/lib/insurance.mutations.functions.ts :: approveInsuranceClaim (POST)
- src/lib/insurance.mutations.functions.ts :: rejectInsuranceClaim (POST)
- src/lib/insurance.mutations.functions.ts :: recordInsurancePayment (POST)
- src/lib/insurance.mutations.functions.ts :: reconcileInsuranceClaim (POST)
- src/lib/insurance.mutations.functions.ts :: cancelInsuranceClaim (POST)
- src/lib/inventory.mutations.functions.ts :: createWarehouse (POST)
- src/lib/inventory.mutations.functions.ts :: updateWarehouse (POST)
- src/lib/inventory.mutations.functions.ts :: receiveStock (POST)
- src/lib/inventory.mutations.functions.ts :: adjustStock (POST)
- src/lib/inventory.mutations.functions.ts :: transferStock (POST)
- src/lib/inventory.mutations.functions.ts :: reserveStock (POST)
- src/lib/inventory.mutations.functions.ts :: releaseReservation (POST)
- src/lib/inventory.mutations.functions.ts :: consumeReservation (POST)
- src/lib/inventory.mutations.functions.ts :: returnStock (POST)
- src/lib/loyalty.functions.ts :: listLoyaltyAccounts (GET)
- src/lib/loyalty.functions.ts :: getLoyaltyAccount (GET)
- src/lib/loyalty.functions.ts :: listLoyaltyTransactions (GET)
- src/lib/loyalty.functions.ts :: listRewards (GET)
- src/lib/loyalty.functions.ts :: listLoyaltyRules (GET)
- src/lib/loyalty.functions.ts :: listLoyaltyTiers (GET)
- src/lib/loyalty.mutations.functions.ts :: issuePoints (POST)
- src/lib/loyalty.mutations.functions.ts :: redeemPoints (POST)
- src/lib/loyalty.mutations.functions.ts :: reversePoints (POST)
- src/lib/loyalty.mutations.functions.ts :: expirePoints (POST)
- src/lib/loyalty.mutations.functions.ts :: adjustPoints (POST)
- src/lib/loyalty.mutations.functions.ts :: createReward (POST)
- src/lib/loyalty.mutations.functions.ts :: redeemReward (POST)
- src/lib/loyalty.mutations.functions.ts :: upsertLoyaltyRule (POST)
- src/lib/me.functions.ts :: getMyOrganization (GET)
- src/lib/patients.functions.ts :: listPatients (GET)
- src/lib/patients.functions.ts :: getPatient (GET)
- src/lib/patients.mutations.functions.ts :: createPatient (POST)
- src/lib/patients.mutations.functions.ts :: updatePatient (POST)
- src/lib/patients.mutations.functions.ts :: addAllergy (POST)
- src/lib/patients.mutations.functions.ts :: addCondition (POST)
- src/lib/patients.mutations.functions.ts :: addEmergencyContact (POST)
- src/lib/patients.mutations.functions.ts :: mergePatients (POST)
- src/lib/prescriptions.functions.ts :: listPrescriptions (POST)
- src/lib/prescriptions.functions.ts :: getPrescription (POST)
- src/lib/prescriptions.mutations.functions.ts :: createPrescription (POST)
- src/lib/prescriptions.mutations.functions.ts :: updatePrescription (POST)
- src/lib/prescriptions.mutations.functions.ts :: addPrescriptionItem (POST)
- src/lib/prescriptions.mutations.functions.ts :: removePrescriptionItem (POST)
- src/lib/prescriptions.mutations.functions.ts :: transitionPrescription (POST)
- src/lib/prescriptions.mutations.functions.ts :: addPrescriptionNote (POST)
- src/lib/promotions.mutations.functions.ts :: createPromotion (POST)
- src/lib/promotions.mutations.functions.ts :: updatePromotion (POST)
- src/lib/promotions.mutations.functions.ts :: transitionPromotion (POST)
- src/lib/promotions.mutations.functions.ts :: createCoupon (POST)
- src/lib/promotions.mutations.functions.ts :: archiveCoupon (POST)
- src/lib/promotions.mutations.functions.ts :: redeemCoupon (POST)
- src/lib/purchasing.functions.ts :: listPurchaseOrders (GET)
- src/lib/purchasing.functions.ts :: getPurchaseOrder (GET)
- src/lib/purchasing.functions.ts :: createPurchaseOrder (POST)
- src/lib/purchasing.functions.ts :: updatePurchaseOrder (POST)
- src/lib/purchasing.functions.ts :: submitPurchaseOrder (POST)
- src/lib/purchasing.functions.ts :: approvePurchaseOrder (POST)
- src/lib/purchasing.functions.ts :: cancelPurchaseOrder (POST)
- src/lib/purchasing.functions.ts :: receivePurchaseOrder (POST)
- src/lib/suppliers.functions.ts :: listSuppliers (GET)
- src/lib/suppliers.mutations.functions.ts :: createSupplier (POST)
- src/lib/suppliers.mutations.functions.ts :: updateSupplier (POST)

## Full inventory

| File | Function | Method | Auth | Validated |
|---|---|---|---|---|
| `src/lib/ai.functions.ts` | `listAgents` | GET | ❌ | — |
| `src/lib/ai.functions.ts` | `listAvailableToolsFn` | GET | ❌ | — |
| `src/lib/ai.functions.ts` | `invokeAgent` | POST | ❌ | ✅ |
| `src/lib/ai.functions.ts` | `listRuns` | GET | ❌ | ✅ |
| `src/lib/analytics.functions.ts` | `getExecutiveKpis` | GET | ❌ | — |
| `src/lib/analytics.functions.ts` | `getDispensesSeries` | GET | ❌ | ✅ |
| `src/lib/analytics.functions.ts` | `getCustomersGrowth` | GET | ❌ | ✅ |
| `src/lib/analytics.functions.ts` | `getCampaignsSummary` | GET | ❌ | — |
| `src/lib/analytics.functions.ts` | `getInventoryHealth` | GET | ❌ | — |
| `src/lib/analytics.functions.ts` | `getAiUsage` | GET | ❌ | — |
| `src/lib/campaigns.functions.ts` | `listCampaigns` | GET | ❌ | ✅ |
| `src/lib/campaigns.functions.ts` | `getCampaign` | GET | ❌ | ✅ |
| `src/lib/campaigns.functions.ts` | `listSegments` | GET | ❌ | — |
| `src/lib/campaigns.functions.ts` | `getSegment` | GET | ❌ | ✅ |
| `src/lib/campaigns.functions.ts` | `previewSegment` | POST | ❌ | ✅ |
| `src/lib/campaigns.mutations.functions.ts` | `upsertSegment` | POST | ❌ | ✅ |
| `src/lib/campaigns.mutations.functions.ts` | `recalcSegment` | POST | ❌ | ✅ |
| `src/lib/campaigns.mutations.functions.ts` | `createCampaign` | POST | ❌ | ✅ |
| `src/lib/campaigns.mutations.functions.ts` | `updateCampaign` | POST | ❌ | ✅ |
| `src/lib/campaigns.mutations.functions.ts` | `scheduleCampaign` | POST | ❌ | ✅ |
| `src/lib/campaigns.mutations.functions.ts` | `transitionCampaign` | POST | ❌ | ✅ |
| `src/lib/campaigns.mutations.functions.ts` | `startCampaign` | POST | ❌ | ✅ |
| `src/lib/cart.functions.ts` | `listCart` | GET | ✅ | — |
| `src/lib/cart.functions.ts` | `addToCart` | POST | ✅ | ✅ |
| `src/lib/cart.functions.ts` | `removeFromCart` | POST | ✅ | ✅ |
| `src/lib/cart.functions.ts` | `setCartQuantity` | POST | ✅ | ✅ |
| `src/lib/catalog.functions.ts` | `listProducts` | GET | ❌ | ✅ |
| `src/lib/catalog.functions.ts` | `getProduct` | GET | ❌ | ✅ |
| `src/lib/catalog.functions.ts` | `listCategories` | GET | ❌ | — |
| `src/lib/catalog.mutations.functions.ts` | `createProduct` | POST | ❌ | ✅ |
| `src/lib/catalog.mutations.functions.ts` | `updateProduct` | POST | ❌ | ✅ |
| `src/lib/catalog.mutations.functions.ts` | `archiveProduct` | POST | ❌ | ✅ |
| `src/lib/clinical.functions.ts` | `runClinicalCheckForPrescription` | POST | ❌ | ✅ |
| `src/lib/cosmic-search.functions.ts` | `cosmicSearch` | POST | ❌ | ✅ |
| `src/lib/customers.functions.ts` | `listCustomers` | GET | ❌ | ✅ |
| `src/lib/customers.functions.ts` | `getCustomer` | GET | ❌ | ✅ |
| `src/lib/customers.mutations.functions.ts` | `createCustomer` | POST | ❌ | ✅ |
| `src/lib/customers.mutations.functions.ts` | `updateCustomer` | POST | ❌ | ✅ |
| `src/lib/customers.mutations.functions.ts` | `archiveCustomer` | POST | ❌ | ✅ |
| `src/lib/customers.mutations.functions.ts` | `mergeCustomers` | POST | ❌ | ✅ |
| `src/lib/customers.mutations.functions.ts` | `addCustomerAddress` | POST | ❌ | ✅ |
| `src/lib/customers.mutations.functions.ts` | `addCustomerContact` | POST | ❌ | ✅ |
| `src/lib/customers.mutations.functions.ts` | `addCustomerTag` | POST | ❌ | ✅ |
| `src/lib/customers.mutations.functions.ts` | `removeCustomerTag` | POST | ❌ | ✅ |
| `src/lib/dispenses.functions.ts` | `listDispenses` | POST | ❌ | ✅ |
| `src/lib/dispenses.functions.ts` | `listPendingDispenses` | POST | ❌ | ✅ |
| `src/lib/dispenses.functions.ts` | `getDispense` | POST | ❌ | ✅ |
| `src/lib/dispenses.mutations.functions.ts` | `createDispense` | POST | ❌ | ✅ |
| `src/lib/dispenses.mutations.functions.ts` | `prepareDispense` | POST | ❌ | ✅ |
| `src/lib/dispenses.mutations.functions.ts` | `verifyDispenseItemBarcode` | POST | ❌ | ✅ |
| `src/lib/dispenses.mutations.functions.ts` | `verifyDispense` | POST | ❌ | ✅ |
| `src/lib/dispenses.mutations.functions.ts` | `dispensePrescription` | POST | ❌ | ✅ |
| `src/lib/dispenses.mutations.functions.ts` | `completeDispense` | POST | ❌ | ✅ |
| `src/lib/dispenses.mutations.functions.ts` | `cancelDispense` | POST | ❌ | ✅ |
| `src/lib/dispenses.mutations.functions.ts` | `returnDispense` | POST | ❌ | ✅ |
| `src/lib/doctors.functions.ts` | `listDoctors` | GET | ❌ | — |
| `src/lib/doctors.functions.ts` | `getDoctor` | GET | ❌ | ✅ |
| `src/lib/doctors.mutations.functions.ts` | `createDoctor` | POST | ❌ | ✅ |
| `src/lib/doctors.mutations.functions.ts` | `updateDoctor` | POST | ❌ | ✅ |
| `src/lib/doctors.mutations.functions.ts` | `addLicense` | POST | ❌ | ✅ |
| `src/lib/insurance.functions.ts` | `listInsuranceProviders` | POST | ❌ | ✅ |
| `src/lib/insurance.functions.ts` | `listInsurancePlans` | POST | ❌ | ✅ |
| `src/lib/insurance.functions.ts` | `getPatientCoverage` | POST | ❌ | ✅ |
| `src/lib/insurance.functions.ts` | `listInsuranceClaims` | POST | ❌ | ✅ |
| `src/lib/insurance.functions.ts` | `getInsuranceClaim` | POST | ❌ | ✅ |
| `src/lib/insurance.functions.ts` | `listAuthorizations` | POST | ❌ | ✅ |
| `src/lib/insurance.mutations.functions.ts` | `upsertInsuranceProvider` | POST | ❌ | ✅ |
| `src/lib/insurance.mutations.functions.ts` | `upsertInsurancePlan` | POST | ❌ | ✅ |
| `src/lib/insurance.mutations.functions.ts` | `upsertPatientInsurance` | POST | ❌ | ✅ |
| `src/lib/insurance.mutations.functions.ts` | `verifyCoverage` | POST | ❌ | ✅ |
| `src/lib/insurance.mutations.functions.ts` | `createAuthorization` | POST | ❌ | ✅ |
| `src/lib/insurance.mutations.functions.ts` | `decideAuthorization` | POST | ❌ | ✅ |
| `src/lib/insurance.mutations.functions.ts` | `createInsuranceClaim` | POST | ❌ | ✅ |
| `src/lib/insurance.mutations.functions.ts` | `submitInsuranceClaim` | POST | ❌ | ✅ |
| `src/lib/insurance.mutations.functions.ts` | `approveInsuranceClaim` | POST | ❌ | ✅ |
| `src/lib/insurance.mutations.functions.ts` | `rejectInsuranceClaim` | POST | ❌ | ✅ |
| `src/lib/insurance.mutations.functions.ts` | `recordInsurancePayment` | POST | ❌ | ✅ |
| `src/lib/insurance.mutations.functions.ts` | `reconcileInsuranceClaim` | POST | ❌ | ✅ |
| `src/lib/insurance.mutations.functions.ts` | `cancelInsuranceClaim` | POST | ❌ | ✅ |
| `src/lib/inventory.functions.ts` | `listWarehouses` | GET | ✅ | — |
| `src/lib/inventory.functions.ts` | `getStockSummary` | GET | ✅ | ✅ |
| `src/lib/inventory.mutations.functions.ts` | `createWarehouse` | POST | ❌ | ✅ |
| `src/lib/inventory.mutations.functions.ts` | `updateWarehouse` | POST | ❌ | ✅ |
| `src/lib/inventory.mutations.functions.ts` | `receiveStock` | POST | ❌ | ✅ |
| `src/lib/inventory.mutations.functions.ts` | `adjustStock` | POST | ❌ | ✅ |
| `src/lib/inventory.mutations.functions.ts` | `transferStock` | POST | ❌ | ✅ |
| `src/lib/inventory.mutations.functions.ts` | `reserveStock` | POST | ❌ | ✅ |
| `src/lib/inventory.mutations.functions.ts` | `releaseReservation` | POST | ❌ | ✅ |
| `src/lib/inventory.mutations.functions.ts` | `consumeReservation` | POST | ❌ | ✅ |
| `src/lib/inventory.mutations.functions.ts` | `returnStock` | POST | ❌ | ✅ |
| `src/lib/loyalty.functions.ts` | `listLoyaltyAccounts` | GET | ❌ | ✅ |
| `src/lib/loyalty.functions.ts` | `getLoyaltyAccount` | GET | ❌ | ✅ |
| `src/lib/loyalty.functions.ts` | `listLoyaltyTransactions` | GET | ❌ | ✅ |
| `src/lib/loyalty.functions.ts` | `listRewards` | GET | ❌ | ✅ |
| `src/lib/loyalty.functions.ts` | `listLoyaltyRules` | GET | ❌ | — |
| `src/lib/loyalty.functions.ts` | `listLoyaltyTiers` | GET | ❌ | — |
| `src/lib/loyalty.mutations.functions.ts` | `issuePoints` | POST | ❌ | ✅ |
| `src/lib/loyalty.mutations.functions.ts` | `redeemPoints` | POST | ❌ | ✅ |
| `src/lib/loyalty.mutations.functions.ts` | `reversePoints` | POST | ❌ | ✅ |
| `src/lib/loyalty.mutations.functions.ts` | `expirePoints` | POST | ❌ | ✅ |
| `src/lib/loyalty.mutations.functions.ts` | `adjustPoints` | POST | ❌ | ✅ |
| `src/lib/loyalty.mutations.functions.ts` | `createReward` | POST | ❌ | ✅ |
| `src/lib/loyalty.mutations.functions.ts` | `redeemReward` | POST | ❌ | ✅ |
| `src/lib/loyalty.mutations.functions.ts` | `upsertLoyaltyRule` | POST | ❌ | ✅ |
| `src/lib/me.functions.ts` | `getMyOrganization` | GET | ❌ | — |
| `src/lib/medical-directory.functions.ts` | `searchAdenDirectory` | GET | ✅ | ✅ |
| `src/lib/medical-directory.functions.ts` | `findSuppliersByCompany` | GET | ✅ | ✅ |
| `src/lib/medical-directory.functions.ts` | `listProductsByAgent` | GET | ✅ | ✅ |
| `src/lib/modules.functions.ts` | `listPharmacyProducts` | GET | ✅ | ✅ |
| `src/lib/modules.functions.ts` | `listModulePatients` | GET | ✅ | — |
| `src/lib/modules.functions.ts` | `listModuleDoctors` | GET | ✅ | ✅ |
| `src/lib/modules.functions.ts` | `listModuleDeliveries` | GET | ✅ | ✅ |
| `src/lib/modules.functions.ts` | `listModuleTransactions` | GET | ✅ | — |
| `src/lib/patients.functions.ts` | `listPatients` | GET | ❌ | — |
| `src/lib/patients.functions.ts` | `getPatient` | GET | ❌ | ✅ |
| `src/lib/patients.mutations.functions.ts` | `createPatient` | POST | ❌ | ✅ |
| `src/lib/patients.mutations.functions.ts` | `updatePatient` | POST | ❌ | ✅ |
| `src/lib/patients.mutations.functions.ts` | `addAllergy` | POST | ❌ | ✅ |
| `src/lib/patients.mutations.functions.ts` | `addCondition` | POST | ❌ | ✅ |
| `src/lib/patients.mutations.functions.ts` | `addEmergencyContact` | POST | ❌ | ✅ |
| `src/lib/patients.mutations.functions.ts` | `mergePatients` | POST | ❌ | ✅ |
| `src/lib/prescriptions.functions.ts` | `listPrescriptions` | POST | ❌ | ✅ |
| `src/lib/prescriptions.functions.ts` | `getPrescription` | POST | ❌ | ✅ |
| `src/lib/prescriptions.mutations.functions.ts` | `createPrescription` | POST | ❌ | ✅ |
| `src/lib/prescriptions.mutations.functions.ts` | `updatePrescription` | POST | ❌ | ✅ |
| `src/lib/prescriptions.mutations.functions.ts` | `addPrescriptionItem` | POST | ❌ | ✅ |
| `src/lib/prescriptions.mutations.functions.ts` | `removePrescriptionItem` | POST | ❌ | ✅ |
| `src/lib/prescriptions.mutations.functions.ts` | `transitionPrescription` | POST | ❌ | ✅ |
| `src/lib/prescriptions.mutations.functions.ts` | `addPrescriptionNote` | POST | ❌ | ✅ |
| `src/lib/promotions.functions.ts` | `listPromotions` | GET | ✅ | — |
| `src/lib/promotions.functions.ts` | `getPromotion` | GET | ✅ | ✅ |
| `src/lib/promotions.functions.ts` | `listCoupons` | GET | ✅ | — |
| `src/lib/promotions.functions.ts` | `previewPromotion` | POST | ✅ | ✅ |
| `src/lib/promotions.mutations.functions.ts` | `createPromotion` | POST | ❌ | ✅ |
| `src/lib/promotions.mutations.functions.ts` | `updatePromotion` | POST | ❌ | ✅ |
| `src/lib/promotions.mutations.functions.ts` | `transitionPromotion` | POST | ❌ | ✅ |
| `src/lib/promotions.mutations.functions.ts` | `createCoupon` | POST | ❌ | ✅ |
| `src/lib/promotions.mutations.functions.ts` | `archiveCoupon` | POST | ❌ | ✅ |
| `src/lib/promotions.mutations.functions.ts` | `redeemCoupon` | POST | ❌ | ✅ |
| `src/lib/purchasing.functions.ts` | `listPurchaseOrders` | GET | ❌ | — |
| `src/lib/purchasing.functions.ts` | `getPurchaseOrder` | GET | ❌ | ✅ |
| `src/lib/purchasing.functions.ts` | `createPurchaseOrder` | POST | ❌ | ✅ |
| `src/lib/purchasing.functions.ts` | `updatePurchaseOrder` | POST | ❌ | ✅ |
| `src/lib/purchasing.functions.ts` | `submitPurchaseOrder` | POST | ❌ | ✅ |
| `src/lib/purchasing.functions.ts` | `approvePurchaseOrder` | POST | ❌ | ✅ |
| `src/lib/purchasing.functions.ts` | `cancelPurchaseOrder` | POST | ❌ | ✅ |
| `src/lib/purchasing.functions.ts` | `receivePurchaseOrder` | POST | ❌ | ✅ |
| `src/lib/sbdma-import.functions.ts` | `analyzeSbdmaImport` | POST | ✅ | ✅ |
| `src/lib/sbdma-import.functions.ts` | `commitSbdmaImport` | POST | ✅ | ✅ |
| `src/lib/sbdma-import.functions.ts` | `listSbdmaImportJobs` | GET | ✅ | — |
| `src/lib/sbdma-import.functions.ts` | `getSbdmaImportJob` | GET | ✅ | ✅ |
| `src/lib/suppliers.functions.ts` | `listSuppliers` | GET | ❌ | — |
| `src/lib/suppliers.mutations.functions.ts` | `createSupplier` | POST | ❌ | ✅ |
| `src/lib/suppliers.mutations.functions.ts` | `updateSupplier` | POST | ❌ | ✅ |
