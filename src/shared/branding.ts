import almoslyLogo from '@/assets/almosly-logo.png.asset.json'

// Central pharmacy branding — single source of truth for name, logo, and contact info.
export const PHARMACY = {
  nameAr: 'صيدلية المصلي',
  nameEn: 'Almosly Pharmacy',

  tagline: 'رعاية دوائية ذكية في عدن',
  taglineEn: 'Smart pharmaceutical care in Aden',
  description:
    'صيدلية المصلي — رعاية دوائية موثوقة في عدن مع مساعد ذكاء صناعي، صرف الوصفات، وتوصيل الأدوية.',
  logo: '/favicon.svg',
  phone: '+967 777 000 000',
  whatsapp: '+967777000000',
  email: 'info@muslly.com',
  addressAr: 'كريتر — عدن، اليمن',
  addressEn: 'Crater — Aden, Yemen',
  mapsUrl: 'https://maps.google.com/?q=Aden+Crater+Al+Musalli+Pharmacy',
  hoursAr: [
    { day: 'السبت – الخميس', time: '8:00 صباحاً – 11:00 مساءً' },
    { day: 'الجمعة', time: '4:00 عصراً – 11:00 مساءً' },
  ],
} as const
