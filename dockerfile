# 1. مرحلة البناء (Build stage)
FROM node:18-alpine AS builder

WORKDIR /app

# نسخ ملفات الحزم وتثبيتها
COPY package*.json ./
RUN npm install

# نسخ باقي الكود وبناء تطبيق Vite
COPY . .
RUN npm run build

# 2. مرحلة التشغيل (Production stage) باستخدام خادم static خفيف
FROM node:18-alpine

WORKDIR /app

# تثبيت خادم serve لتشغيل ملفات الـ HTML/JS المترجمة
RUN npm install -g serve

# نسخ المجلد المبني dist من مرحلة البناء
COPY --from=builder /app/dist ./dist

# تشغيل الخادم على المنفذ $PORT الخاص بـ Cloud Run
CMD serve -s dist -l $PORT
