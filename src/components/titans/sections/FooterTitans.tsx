import { Link } from "@tanstack/react-router";
import { Facebook, Instagram, Twitter, Mail, MapPin } from "lucide-react";
import { GradientText } from "../ui/GradientText";

const navLinks = [
  { to: "/", label: "الرئيسية" },
  { to: "/products", label: "المنتجات" },
  { to: "/prescription", label: "وصفة طبية" },
  { to: "/contact", label: "تواصل معنا" },
] as const;

const socials = [
  { href: "https://facebook.com/muslly", label: "Facebook", Icon: Facebook },
  { href: "https://instagram.com/muslly", label: "Instagram", Icon: Instagram },
  { href: "https://twitter.com/muslly", label: "Twitter", Icon: Twitter },
  { href: "mailto:hello@muslly.com", label: "Email", Icon: Mail },
];

export function FooterTitans() {
  return (
    <footer className="border-t border-border/40 mt-10">
      <div className="container mx-auto px-6 py-12 grid gap-10 md:grid-cols-3">
        <div>
          <div className="text-lg font-bold">
            <GradientText>المسلي</GradientText>
            <span className="text-muted-foreground"> — Titans Edition</span>
          </div>
          <p className="mt-3 text-sm text-muted-foreground max-w-xs">
            صحتك تستحق تجربة استثنائية — وصفات ذكية وتوصيل سريع.
          </p>
          <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
            <MapPin size={14} /> صنعاء، اليمن
          </div>
        </div>

        <nav aria-label="روابط الموقع" className="text-sm">
          <div className="font-medium mb-3">روابط سريعة</div>
          <ul className="space-y-2">
            {navLinks.map((l) => (
              <li key={l.to}>
                <Link
                  to={l.to}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <div className="text-sm font-medium mb-3">تابعنا</div>
          <div className="flex items-center gap-2">
            {socials.map(({ href, label, Icon }) => (
              <a
                key={label}
                href={href}
                aria-label={label}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/60 text-muted-foreground hover:text-[color:var(--titans-gold)] hover:border-[color:var(--titans-gold)]/60 transition-colors"
              >
                <Icon size={16} />
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-border/40">
        <div className="container mx-auto px-6 py-5 flex flex-col md:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <div>© {new Date().getFullYear()} المسلي. جميع الحقوق محفوظة.</div>
          <div>صنع بحب في اليمن 🇾🇪</div>
        </div>
      </div>
    </footer>
  );
}
