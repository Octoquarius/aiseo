import { createClient } from "@/lib/supabase/server";
import { AddSitesForm } from "@/components/add-sites-form";
import { SiteCard, type SiteCardData } from "@/components/site-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { scoreColor } from "@/lib/score";
import { appearanceStats, type ResultLike } from "@/lib/visibility/stats";

export const dynamic = "force-dynamic";

function StatCard({
  title,
  value,
  hint,
  valueClass,
  badge,
}: {
  title: string;
  value: string;
  hint?: string;
  valueClass?: string;
  badge?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          {title}
          {badge && <Badge variant="secondary" className="text-[10px]">{badge}</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`text-3xl font-bold ${valueClass ?? ""}`}>{value}</div>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: sites } = await supabase
    .from("sites")
    .select("id, url, name, latest_score, last_scanned_at")
    .order("created_at", { ascending: false });

  const siteList = sites ?? [];

  const { data: openImprovements } = await supabase
    .from("improvements")
    .select("id, site_id")
    .eq("status", "open");

  const openBySite = new Map<string, number>();
  for (const imp of openImprovements ?? []) {
    openBySite.set(imp.site_id, (openBySite.get(imp.site_id) ?? 0) + 1);
  }

  const { data: visResults } = await supabase
    .from("visibility_results")
    .select("query_id, engine, appeared, rank, checked_at");
  const visStats = appearanceStats((visResults ?? []) as ResultLike[]);

  const scored = siteList.filter((s) => s.latest_score != null);
  const avgScore =
    scored.length > 0
      ? Math.round(scored.reduce((sum, s) => sum + (s.latest_score ?? 0), 0) / scored.length)
      : null;
  const totalOpen = openImprovements?.length ?? 0;

  const cards: SiteCardData[] = siteList.map((s) => ({
    ...s,
    openIssues: openBySite.get(s.id) ?? 0,
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-muted-foreground">Tüm sitelerinizin AI görünürlük durumu tek ekranda.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Takip edilen site" value={String(siteList.length)} />
        <StatCard
          title="Ortalama GEO skoru"
          value={avgScore != null ? String(avgScore) : "—"}
          valueClass={scoreColor(avgScore)}
          hint="0–100 arası AI görünürlük/önerilebilirlik"
        />
        <StatCard title="Açık iyileştirme" value={String(totalOpen)} hint="Improvements sekmesinde" />
        <StatCard
          title="AI aramalarında görünürlük"
          value={visStats.rate != null ? `%${visStats.rate}` : "—"}
          valueClass={scoreColor(visStats.rate)}
          hint={
            visStats.total > 0
              ? `${visStats.appeared}/${visStats.total} soruda önerildiniz`
              : "Visibility sekmesinden tarama başlatın"
          }
        />
      </div>

      <AddSitesForm />

      <div className="space-y-3">
        <h2 className="text-lg font-medium">Siteleriniz</h2>
        {cards.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              Henüz site eklemediniz. Yukarıdan bir URL ekleyerek başlayın.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {cards.map((site) => (
              <SiteCard key={site.id} site={site} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
