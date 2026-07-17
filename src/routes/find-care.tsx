import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { matchProvidersForSymptoms } from "@/lib/provider-matching.functions";
import { searchEntities } from "@/lib/knowledge-graph.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Link } from "@tanstack/react-router";
import { Loader2, Search, Sparkles, X } from "lucide-react";

export const Route = createFileRoute("/find-care")({
  head: () => ({
    meta: [
      { title: "ابحث عن الطبيب المناسب | المصلي" },
      {
        name: "description",
        content: "أدخل الأعراض واحصل على قائمة بالتخصصات المقترحة وأفضل الأطباء المرتبين ذكيًا بالمصداقية والخبرة.",
      },
      { property: "og:title", content: "ابحث عن الطبيب المناسب | المصلي" },
      { property: "og:description", content: "مطابقة الأعراض بالتخصص والطبيب المناسب في اليمن." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FindCarePage,
});

type SearchResult = { id: string; slug: string; name_ar: string; name_en: string | null };

function FindCarePage() {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<SearchResult[]>([]);
  const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  const searchFn = useServerFn(searchEntities);
  const matchFn = useServerFn(matchProvidersForSymptoms);

  const match = useMutation({
    mutationFn: () =>
      matchFn({ data: { symptomSlugs: selected.map((s) => s.slug), limit: 6 } }),
  });

  async function runSearch(q: string) {
    setQuery(q);
    if (q.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    setSearching(true);
    try {
      const r = await searchFn({ data: { q, entityType: "SYMPTOM", limit: 8 } });
      setSuggestions(r.results as SearchResult[]);
    } finally {
      setSearching(false);
    }
  }

  function addSymptom(s: SearchResult) {
    if (!selected.some((x) => x.id === s.id)) setSelected([...selected, s]);
    setQuery("");
    setSuggestions([]);
  }

  function removeSymptom(id: string) {
    setSelected(selected.filter((s) => s.id !== id));
  }

  return (
    <div dir="rtl" className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2 justify-center">
          <Sparkles className="h-7 w-7 text-primary" />
          ابحث عن الطبيب المناسب
        </h1>
        <p className="text-muted-foreground">أدخل الأعراض وسنقترح أفضل التخصصات والأطباء</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>الأعراض</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="مثال: صداع، حمى، سعال..."
                  value={query}
                  onChange={(e) => runSearch(e.target.value)}
                  className="pr-9"
                />
              </div>
            </div>
            {suggestions.length > 0 && (
              <div className="absolute z-10 mt-1 w-full rounded-md border bg-popover shadow-lg">
                {searching && (
                  <div className="p-3 text-sm text-muted-foreground flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> جاري البحث...
                  </div>
                )}
                {suggestions.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => addSymptom(s)}
                    className="w-full text-right px-3 py-2 hover:bg-accent"
                  >
                    <span className="font-medium">{s.name_ar}</span>
                    {s.name_en && <span className="text-xs text-muted-foreground me-2">{s.name_en}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {selected.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selected.map((s) => (
                <Badge key={s.id} variant="secondary" className="gap-1">
                  {s.name_ar}
                  <button onClick={() => removeSymptom(s.id)}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}

          <Button
            className="w-full"
            disabled={selected.length === 0 || match.isPending}
            onClick={() => match.mutate()}
          >
            {match.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "ابحث عن أطباء"}
          </Button>
        </CardContent>
      </Card>

      {match.data && (
        <div className="mt-8 space-y-6">
          {match.data.possibleDiseases.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">حالات محتملة</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {match.data.possibleDiseases.map((d, i) => (
                  <Badge key={i} variant="outline">
                    {d.name_ar ?? d.slug}
                  </Badge>
                ))}
              </CardContent>
            </Card>
          )}

          {match.data.suggestedSpecialties.map((block) => (
            <Card key={block.slug}>
              <CardHeader>
                <CardTitle>{block.name_ar ?? block.slug}</CardTitle>
              </CardHeader>
              <CardContent>
                {block.doctors.length === 0 ? (
                  <p className="text-sm text-muted-foreground">لا يوجد أطباء مسجلون في هذا التخصص بعد.</p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {block.doctors.map((d) => (
                      <DoctorCard key={d.id} doctor={d} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function DoctorCard({ doctor }: { doctor: any }) {
  const level: string = doctor.rank?.level ?? "STANDARD_PROVIDER";
  const badge =
    level === "TOP_PROVIDER" ? { label: "الأعلى تقييمًا", variant: "default" as const } :
    level === "NEW_PROVIDER" ? { label: "جديد", variant: "secondary" as const } :
    { label: "معتمد", variant: "outline" as const };

  return (
    <Link
      to="/doctors/$slug"
      params={{ slug: doctor.slug }}
      className="block rounded-lg border p-3 hover:bg-accent transition-colors"
    >
      <div className="flex items-start gap-3">
        {doctor.photo_url ? (
          <img src={doctor.photo_url} alt="" className="h-12 w-12 rounded-full object-cover" />
        ) : (
          <div className="h-12 w-12 rounded-full bg-muted" />
        )}
        <div className="flex-1 min-w-0">
          <div className="font-semibold truncate">{doctor.full_name_ar ?? doctor.full_name_en}</div>
          {doctor.title && <div className="text-xs text-muted-foreground">{doctor.title}</div>}
          <div className="mt-2 flex flex-wrap gap-1">
            <Badge variant={badge.variant} className="text-xs">{badge.label}</Badge>
            {doctor.telemedicine_ready && <Badge variant="outline" className="text-xs">استشارة أونلاين</Badge>}
            {doctor.years_experience != null && (
              <Badge variant="outline" className="text-xs">{doctor.years_experience} سنة خبرة</Badge>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
