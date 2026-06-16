# 📱 تطبيق أندرويد لصيدلية المصلي (Trusted Web Activity)

هذا المشروع جاهز ليُغلَّف كتطبيق أندرويد رسمي على Google Play Store
باستخدام تقنية **TWA (Trusted Web Activity)** عبر **Bubblewrap CLI**.

## ✅ ما تم إعداده تلقائياً

- `public/manifest.webmanifest` — Web App Manifest كامل (id, shortcuts, categories, maskable icon, RTL).
- `public/.well-known/assetlinks.json` — ملف Digital Asset Links (يحتاج إضافة بصمة التوقيع SHA256).
- `twa-manifest.json` — إعدادات Bubblewrap الكاملة.
- شاشة `/settings` داخل التطبيق لإدارة اللغة والإشعارات والكاش.
- أيقونات `192x192` و`512x512` + `apple-touch-icon`.

## 🚀 خطوات بناء حزمة APK / AAB للنشر على Play Store

### 1. تثبيت المتطلبات (مرة واحدة على جهازك المحلي)
```bash
# Java JDK 17+
# Android SDK (يتم تنزيله تلقائياً عبر Bubblewrap)
npm install -g @bubblewrap/cli
```

### 2. تهيئة المشروع
```bash
bubblewrap init --manifest=https://muslly.com/manifest.webmanifest
# أو استخدم الملف الجاهز:
bubblewrap init --directory=./android-twa
# ثم انسخ twa-manifest.json داخل ./android-twa/
```

### 3. بناء حزمة AAB (للنشر على Play Store)
```bash
cd android-twa
bubblewrap build
# سينتج: app-release-bundle.aab + app-release-signed.apk
```

### 4. الحصول على بصمة SHA256 للتوقيع
```bash
keytool -list -v -keystore android.keystore -alias android
# انسخ قيمة SHA256 وضعها في:
# public/.well-known/assetlinks.json → sha256_cert_fingerprints
```

> ⚠️ مهم: عند رفع التطبيق إلى Play Store، استخدم **App Signing by Google Play**.
> بعد الرفع، احصل على بصمة SHA256 من:
> `Play Console → Setup → App signing → App signing key certificate`
> وضعها في `assetlinks.json` ثم أعد نشر الموقع.

### 5. النشر على Play Console
1. سجّل حساب مطوّر على [play.google.com/console](https://play.google.com/console) ($25 لمرة واحدة)
2. أنشئ تطبيقاً جديداً → ارفع `app-release-bundle.aab`
3. املأ البيانات (الوصف، لقطات، سياسة الخصوصية)
4. اطلب المراجعة (تستغرق 1-7 أيام)

## 🔐 التحقق من ربط التطبيق بالموقع (Digital Asset Links)

بعد نشر `assetlinks.json` على الموقع، تحقق عبر:
```
https://developers.google.com/digital-asset-links/tools/generator
```
أو:
```bash
curl https://muslly.com/.well-known/assetlinks.json
```

## 🎯 معلومات الحزمة

| الحقل | القيمة |
|---|---|
| Package ID | `com.muslly.pharmacy.twa` |
| Host | `muslly.com` |
| الإصدار | 1.0.0 (versionCode: 1) |
| الحد الأدنى لأندرويد | 5.0 (SDK 21) |
| الاتجاه | عمودي (portrait) |

## 🔄 تحديثات لاحقة

أي تحديث على الموقع يظهر **فوراً** داخل التطبيق دون الحاجة لإعادة نشر على Play Store
(لأن TWA يعرض الموقع الفعلي). فقط عند تغيير الأيقونة أو الاسم تحتاج لرفع نسخة جديدة.
