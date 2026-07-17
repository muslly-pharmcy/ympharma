## المطلوب

تحديث كامل لـ `src/modules/ai-brain/components/SovereignEngineDashboard.tsx` لدمج نظام الإشعارات الترويجية العائمة داخل نفس اللوحة، مع إبقاء التكامل الحقيقي مع الـ Server Function وتوسيع النبض النيوني.

## التغييرات

**ملف واحد فقط**: `src/modules/ai-brain/components/SovereignEngineDashboard.tsx`

1. **PROMOTIONAL_CAMPAIGNS**: إضافة ثابت بالحملات الثلاث (رعاية طفلك / سلامة الضغط والسكري / صيف عدن).
2. **useEffect + setTimeout(3s)**: بعد 3 ثوانٍ من التحميل تُظهر إشعاراً عائماً في الزاوية السفلية اليسرى مع اختيار حملة عشوائية.
3. **بدون localStorage**: يظهر كل زيارة (حسب اختيارك).
4. **بطاقة الإشعار العائمة**: `fixed bottom-6 left-6 z-50`، إطار فوشيا نيوني، Bell نابض، زرّان (تجاهل / اشتركي الآن بأيقونة قلب)، مع `animate-in slide-in-from-bottom fade-in duration-500`.
5. **خلفية نيونية للّوحة**: إضافة دائرتَي `blur-3xl` (إحداهما إمرلد أعلى-يمين، والأخرى فوشيا أسفل-يسار) كطبقة زخرفية `pointer-events-none`.
6. **ترقيات النبض للأدوات النشطة**: الحفاظ على `sovereign-glow` النابض + إضافة `scale-[1.02]` للبطاقة المفعّلة و`animate-ping` لنقطة الحالة.
7. **الحفاظ على العقود الحقيقية**:
   - يبقى الاستدعاء عبر `useServerFn(executeNeuralInference)` مع بنية `{ data: { userInput, district, patient: { chronicConditions, pregnant } } }`.
   - لن نستبدله بـ `SuperBrainSovereign.executeNeuralInference(...)` الوارد في المخطط لأن التوقيع الحقيقي مختلف (server-only + بارامترات مختلفة).
   - يبقى ربط `dispatchedTools` عبر `realCodes` (المخطط يفترض تطابق `tool.code` مع `dispatched` وهذا غير صحيح في محرّكنا).
8. **الوصولية والأمان البصري**: `aria-pressed` على أزرار الحالات، `aria-busy` على زر الإطلاق، `aria-live="polite"` على بطاقة الإشعار، زر إغلاق بـ `aria-label`.
9. **بدون `alert()`**: زر "اشتركي الآن" يستخدم `toast.success(...)` بدل `alert` (لأن `alert` ممنوع في SSR ويعطي تجربة رديئة).

## ما لن يتغيّر

- `brain.functions.ts`, `SuperBrainSovereign.ts`, `domain/types.ts`, أي migration.
- المسار `/admin-ai-brain` وحماية `_authenticated`.
- بقية مكوّنات الصفحة الرئيسية.

## ملاحظة مهمة على الموقع

الإشعارات ستظهر داخل لوحة `/admin-ai-brain` فقط (وهي محمية للأدمن). لن يراها زوار الموقع العاديون. إن أردت لاحقاً نقلها للصفحة الرئيسية سنستخرجها إلى مكوّن مستقل — لكن ذلك خارج نطاق هذا الطلب.