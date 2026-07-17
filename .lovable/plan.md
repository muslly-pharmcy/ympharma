# Upgrade SovereignEngineDashboard to the new luxe UI

Replace `src/modules/ai-brain/components/SovereignEngineDashboard.tsx` with the provided 4-column dashboard (inputs · results · tool registry) and adapt the two spots where the blueprint doesn't match the real code:

## Adaptations

1. **Server call**: blueprint uses static `SuperBrainSovereign.executeNeuralInference(userId, text, district)`. Our real fn is auth-protected and expects `{ data: { userInput, district, patient } }`. Use `useServerFn(executeNeuralInference)` and pass:
   ```ts
   { userInput, district, patient: {
       chronicConditions: mappedConditions, // سكري→diabetes, ضغط→hypertension
       pregnant: chronicConditions.includes("حامل"),
   } }
   ```
   Show a toast on error instead of only `console.error`.

2. **Tool registry codes**: blueprint invents `MED_AGENT_TOOL_001…`, but decisions dispatch our real codes (`MED_DRUG_SAFETY`, `LOG_PHARMACY_NEARBY`, etc.). Add a small `realCodes: string[]` field on each blueprint tool so the "نشط الآن" highlight matches when any real code fires. Mapping:
   - فحص موانع الصرف → `MED_DRUG_SAFETY`
   - البدائل → `MED_ALT_SUGGEST`
   - التوجيه الجغرافي → `LOG_PHARMACY_NEARBY`, `GEO_DISTRICT_ROUTER`
   - جرد FEFO → `COM_RESTOCK_ALERT` (closest real tool; keeps card meaningful)
   - اشتراكات الأمومة → `MAT_CAMPAIGN_BUILDER`
   - رسائل التذكير → `MAT_CAMPAIGN_BUILDER`
   - ترميم الأكواد → *(no real code yet — stays dim; that's honest)*
   - التخطيط التوسعي → `LOG_ETA_ESTIMATE`

3. Keep the exact dark/emerald/fuchsia styling from the blueprint verbatim (user provided this specific luxe look for the admin console) — no semantic-token rewrite.

## Files touched

- `src/modules/ai-brain/components/SovereignEngineDashboard.tsx` — full replace.
- No route changes (already mounted at `/admin-ai-brain`).
- No DB / server / secret changes.

## Verification

Build + tsgo. No test additions (pure UI).
