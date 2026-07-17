## المطلوب
إضافة رقم الـ Chief `+967782878280` إلى قائمة `wa_allowlist` المسموح بها للتفاعل مع WhatsApp Brain.

## التنفيذ
عملية إدراج بيانات واحدة عبر `supabase--insert` (ليست تغيير schema):

```sql
INSERT INTO public.wa_allowlist (phone, label, district)
VALUES ('+967782878280', 'Chief', 'عدن')
ON CONFLICT (phone) DO UPDATE
SET label = EXCLUDED.label, district = EXCLUDED.district;
```

## ملاحظة
- لا تغييرات في schema، RLS، أو أي كود.
- إن كان عمود `phone` لا يحمل UNIQUE constraint، سيفشل `ON CONFLICT` وسنحتاج إمّا التحقق أولاً أو إضافة القيد عبر migration. سأتحقق من ذلك قبل التنفيذ باستعلام قراءة.