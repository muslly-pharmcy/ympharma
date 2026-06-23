import { describe, it, expect } from 'vitest';
import { postProcess, type Platform } from '@/lib/agent/post-processor';

describe('postProcess', () => {
  const platforms: Platform[] = ['facebook', 'instagram', 'twitter', 'telegram'];

  it('adds platform-specific hashtags', () => {
    const result = postProcess('منتج رائع', 'instagram');
    expect(result.hashtags).toContain('#انستغرام');
    expect(result.hashtags).toContain('#تخفيضات');
  });

  it('preserves existing hashtags', () => {
    const result = postProcess('منتج رائع #عرض', 'twitter');
    expect(result.hashtags).toContain('#عرض');
    expect(result.hashtags).toContain('#تويتر');
  });

  it('removes duplicate hashtags', () => {
    const result = postProcess('منتج رائع #تخفيضات', 'facebook');
    expect(result.hashtags.filter((h) => h === '#تخفيضات').length).toBe(1);
  });

  it('generates platform-specific CTA', () => {
    expect(postProcess('منتج', 'facebook').cta).toContain('خصم');
    expect(postProcess('منتج', 'twitter').cta).toContain('سارع');
  });

  it('handles empty content gracefully', () => {
    const result = postProcess('', 'telegram');
    expect(result.caption).toContain('#تيليجرام');
    expect(result.hashtags.length).toBeGreaterThan(0);
  });

  it('preserves Arabic hashtags with underscores', () => {
    const result = postProcess('منتج #عرض_خاص', 'instagram');
    expect(result.hashtags).toContain('#عرض_خاص');
  });

  it('does not duplicate common hashtags', () => {
    const result = postProcess('منتج #تخفيضات #عرض', 'twitter');
    const common = result.hashtags.filter((h) => ['#تخفيضات', '#عرض'].includes(h));
    expect(common.length).toBe(2);
  });

  it('formats caption with hashtags at the end', () => {
    const result = postProcess('نص المنشور', 'facebook');
    expect(result.caption).toMatch(/نص المنشور\n\n#/);
  });

  it('handles all platforms without throwing', () => {
    for (const platform of platforms) {
      expect(() => postProcess('اختبار', platform)).not.toThrow();
    }
  });

  it('returns the correct shape', () => {
    const result = postProcess('منتج', 'facebook');
    expect(result).toHaveProperty('caption');
    expect(result).toHaveProperty('cta');
    expect(Array.isArray(result.hashtags)).toBe(true);
  });
});
