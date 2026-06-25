import { Facebook, Twitter, Share2, Link2 } from "lucide-react";
import { useState } from "react";

interface ShareButtonsProps {
  url: string;
  title: string;
  description?: string;
}

export function ShareButtons({ url, title, description }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);

  const nativeShare = async () => {
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      try {
        await (navigator as any).share({ title, text: description ?? title, url });
        return;
      } catch {
        /* user cancelled */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  const open = (href: string) => () =>
    typeof window !== "undefined" && window.open(href, "_blank", "noopener,noreferrer");

  return (
    <div className="titans-scope flex items-center gap-2">
      <button
        type="button"
        onClick={open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`)}
        className="p-2 rounded-full bg-[#1877f2]/10 text-[#1877f2] hover:bg-[#1877f2]/20 transition-colors"
        aria-label="مشاركة على فيسبوك"
      >
        <Facebook className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={open(
          `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`,
        )}
        className="p-2 rounded-full bg-[#1da1f2]/10 text-[#1da1f2] hover:bg-[#1da1f2]/20 transition-colors"
        aria-label="مشاركة على تويتر"
      >
        <Twitter className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={nativeShare}
        className="p-2 rounded-full bg-white/5 text-white/80 hover:bg-white/10 transition-colors"
        aria-label="مشاركة"
        title={copied ? "تم النسخ" : "مشاركة"}
      >
        {typeof navigator !== "undefined" && (navigator as any).share ? (
          <Share2 className="w-4 h-4" />
        ) : (
          <Link2 className="w-4 h-4" />
        )}
      </button>
      {copied && <span className="text-xs text-emerald-400">تم نسخ الرابط</span>}
    </div>
  );
}
