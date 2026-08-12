import { createFileRoute } from '@tanstack/react-router'
import Storefront from '@/pages/Storefront'

export const Route = createFileRoute('/')({
  head: () => ({
    meta: [
      { title: 'صيدلية المصلي — صيدلية إلكترونية وتوصيل أدوية في عدن' },
      {
        name: 'description',
        content:
          'تصفّح آلاف الأدوية ومستحضرات العناية بأسعار معتمدة، مع إرشاد دوائي دقيق وتوصيل سريع من صيدلية المصلي.',
      },
      { property: 'og:title', content: 'صيدلية المصلي — دواؤك يصلك بثقة' },
      {
        property: 'og:description',
        content: 'صيدلية إلكترونية موثوقة: أدوية أصلية، استشارة صيدلي، وتوصيل سريع.',
      },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
  }),
  component: Storefront,
})
