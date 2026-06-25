import { GradientText } from "../ui/GradientText";

export function FooterTitans() {
  return (
    <footer className="border-t border-border/40 mt-10">
      <div className="container mx-auto px-6 py-12 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} <GradientText>المسلي</GradientText> — Titans Edition
        </div>
        <div className="text-xs text-muted-foreground">صنع بحب في اليمن 🇾🇪</div>
      </div>
    </footer>
  );
}
