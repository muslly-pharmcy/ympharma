# تهيئة Cloudflare لـ muslly.com

الهدف: حل مشكلة عدم فتح الموقع من شبكات مثل **يمن نت** بوضع Cloudflare كـ CDN/Proxy أمام Lovable.

## 1) إعدادات DNS في Cloudflare

| النوع | الاسم | القيمة | البروكسي |
|------|------|--------|----------|
| A | `@` | `185.158.133.1` | 🟠 Proxied |
| A | `www` | `185.158.133.1` | 🟠 Proxied |
| TXT | `_lovable` | `lovable_verify=...` | — |

> إزالة أي A/AAAA/CNAME قديم يعارض القيم أعلاه.

## 2) إعدادات Lovable

من لوحة المشروع → **Project Settings → Domains**:
- عند ربط النطاق، افتح **Advanced** وفعّل خيار **"Domain uses Cloudflare or a similar proxy"**.
- يتحوّل التحقق إلى CNAME-based بدلاً من A-record.

## 3) SSL/TLS في Cloudflare

- **SSL/TLS Mode**: **Full (Strict)** ← مهم؛ Lovable يقدّم شهادة صالحة.
- **Edge Certificates**:
  - Always Use HTTPS: **On**
  - Automatic HTTPS Rewrites: **On**
  - Minimum TLS Version: **TLS 1.2**
- **HSTS**: مفعّل بعد التأكد من عمل الموقع 24 ساعة.

## 4) Caching

- **Caching Level**: Standard
- **Page Rules** (أو Cache Rules):
  - `*muslly.com/api/*` → **Cache Level: Bypass**
  - `*muslly.com/_serverFn/*` → **Cache Level: Bypass**
  - `*muslly.com/__l5e/*` → **Cache Level: Bypass**

## 5) Transform Rules (Headers أمان إضافية)

في **Rules → Transform Rules → Modify Response Header**:

| Header | Value |
|--------|-------|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `geolocation=(), microphone=(), camera=()` |

## 6) Uptime Monitoring (UptimeRobot)

- أضف Monitor → HTTP(s) → `https://muslly.com/api/public/health`
- Interval: 5 دقائق
- Alert Contacts: WhatsApp/Email
- اختياري: Webhook إلى `/api/public/uptime-webhook` مع توقيع HMAC (السر `UPTIME_WEBHOOK_SECRET`).

## 7) تأكيد بعد التطبيق

```bash
# يجب أن يعطي IP من Cloudflare (104.x / 172.x)
dig +short muslly.com

# يجب أن يعمل
curl -I https://muslly.com/api/public/health
```

إذا ظهر IP من Cloudflare، فالطلبات تمر عبر شبكة Cloudflare التي تتوفر لها مسارات أكثر استقراراً عبر يمن نت.
