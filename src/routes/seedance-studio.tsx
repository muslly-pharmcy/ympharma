import { createFileRoute } from '@tanstack/react-router'
import { SeedanceStudio } from '@/components/ai/SeedanceStudio'

export const Route = createFileRoute('/seedance-studio')({
  head: () => ({
    meta: [
      { title: 'استوديو سيدانس السينمائي — MUSLLY' },
      {
        name: 'description',
        content: 'محرك توليد أوامر سينمائية متقدمة لمنصة Seedance AI: مشاهد، شخصيات، وحركة كاميرا.',
      },
      { property: 'og:title', content: 'استوديو سيدانس السينمائي — MUSLLY' },
      {
        property: 'og:description',
        content: 'أنشئ أوامر Seedance AI السينمائية من عنوان المشهد ووصفه وتفاصيل الشخصية.',
      },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'robots', content: 'noindex' },
    ],
  }),
  component: () => (
    <div className="min-h-screen bg-slate-950 py-10 px-4">
      <SeedanceStudio />
    </div>
  ),
})
