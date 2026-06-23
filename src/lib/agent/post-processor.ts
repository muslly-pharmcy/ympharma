// src/lib/agent/post-processor.ts
export type Platform = 'facebook' | 'instagram' | 'twitter' | 'telegram';

export interface ProcessedContent {
  caption: string;
  cta: string;
  hashtags: string[];
}

/**
 * Pure function: enriches post content with platform-specific hashtags & CTA.
 * No side effects, no external state.
 */
export function postProcess(content: string, platform: Platform): ProcessedContent {
  const existingHashtags = content.match(/#[\w\u0600-\u06FF]+/g) || [];
  const extraHashtags = generateHashtags(platform);
  const allHashtags = [...new Set([...existingHashtags, ...extraHashtags])];
  const cta = generateCTA(platform);
  const cleanedContent = content.replace(/#[\w\u0600-\u06FF]+/g, '').trim();
  const caption = `${cleanedContent}\n\n${allHashtags.join(' ')}`;

  return { caption, cta, hashtags: allHashtags };
}

function generateHashtags(platform: Platform): string[] {
  const common = ['#تخفيضات', '#عرض', '#تسوق'];
  switch (platform) {
    case 'instagram':
      return [...common, '#انستغرام', '#تسوق_اونلاين', '#منتج_جديد'];
    case 'twitter':
      return [...common, '#تويتر', '#عرض_اليوم', '#صفقة'];
    case 'facebook':
      return [...common, '#فيسبوك', '#متجر', '#عرض_خاص'];
    case 'telegram':
      return [...common, '#تيليجرام', '#قناة', '#عروض'];
    default:
      return common;
  }
}

function generateCTA(platform: Platform): string {
  switch (platform) {
    case 'twitter':
      return 'سارع بالطلب قبل نفاد الكمية!';
    case 'instagram':
      return 'اكتشف المنتج الآن عبر الرابط في البايو!';
    case 'facebook':
      return 'اطلب الآن واحصل على خصم 10%!';
    case 'telegram':
      return 'للطلب: تواصل معنا الآن!';
    default:
      return 'للطلب: تواصل معنا!';
  }
}
