## الهدف
إصلاح تحذيرات `SECURITY DEFINER` الأمنية بإلغاء صلاحية `EXECUTE` عن دور `anon` فقط من الدوال الإدارية/الداخلية، مع الحفاظ على كل الوظائف العامة المقصودة (البحث، الطلبات المجهولة، رفع الوصفة، مساعدات RLS).

## النطاق
الدوال المستهدفة (5 فقط من أصل 30 تمنح anon حالياً):
- `admin_list_cron_jobs()` — لوحة الكرون الإدارية
- `admin_list_cron_runs(integer)` — سجل تشغيلات الكرون الإدارية
- `monitor_cron_failures()` — مراقبة فشل الكرون
- `generate_invoice_number()` — مساعد داخلي لتوليد رقم فاتورة
- `prescription_file_count(text)` — عدّاد ملفات وصفة (يخدم الإدارة فقط)

## الدوال التي **لن** تُمسّ (عامة عن قصد)
- متجر/كتالوج: `pharmacy_search`, `pharmacy_related_products`, `pharmacy_homepage_sections`, `pharmacy_taxonomy_stats`, `pharmacy_chronic_legacy_ids`, `list_bundles_public`, `list_approved_classifications_public`, `conditions_catalog`
- طلبات مجهولة: `place_order` (نسختان), `submit_prescription`, `get_order_public`, `get_order_history_public`
- معدّلات/تتبع: `check_img_rate_limit`, `check_tracking_rate_limit`, `consume_rate_limit`, `track_banner_event`, `validate_discount`
- إشعارات العميل بـtoken: `customer_notification_get_status`, `customer_notification_set_optout`
- مساعدات RLS (تُستدعى داخل السياسات): `has_role`, `has_permission`, `has_branch_access`, `is_owner_or_admin`, `is_branch_manager_of`

## التنفيذ
Migration واحد يحتوي فقط على:
```sql
REVOKE EXECUTE ON FUNCTION public.admin_list_cron_jobs() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_list_cron_runs(integer) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.monitor_cron_failures() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.generate_invoice_number() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.prescription_file_count(text) FROM anon, PUBLIC;
-- التأكيد على الصلاحيات للأدوار المخوّلة
GRANT EXECUTE ON FUNCTION public.admin_list_cron_jobs() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_list_cron_runs(integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.monitor_cron_failures() TO service_role;
GRANT EXECUTE ON FUNCTION public.generate_invoice_number() TO service_role;
GRANT EXECUTE ON FUNCTION public.prescription_file_count(text) TO authenticated, service_role;
```

ملاحظة: `monitor_cron_failures` و`generate_invoice_number` يُستدعيان من جانب الخادم فقط (cron / triggers)، لذلك `service_role` يكفي بدون `authenticated`.

## التحقق بعد التطبيق
استعلام بسيط للتأكد من اختفاء `anon=X` من ACL هذه الدوال:
```sql
SELECT proname, array_to_string(proacl, ', ')
FROM pg_proc WHERE proname IN
  ('admin_list_cron_jobs','admin_list_cron_runs','monitor_cron_failures',
   'generate_invoice_number','prescription_file_count');
```

## ما لن يحدث
- لا تعديل لأي كود تطبيق (الكود الحالي يستدعي هذه الدوال من خادم بصلاحية موثّقة).
- لا تغيير على باقي 25 دالة `SECURITY DEFINER` العامة (مقصودة وموثّقة هنا).
- التحذيرات في Linter ستنخفض بمقدار 5؛ الباقي مقصود ويمكن لاحقاً إضافة ملاحظة مرجعية لكل واحدة في security-memory.
