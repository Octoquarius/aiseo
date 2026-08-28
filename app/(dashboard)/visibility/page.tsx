import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { VisibilityActions } from "@/components/visibility-panel";
import { appearanceStats, latestResults } from "@/lib/visibility/stats";
import { scoreColor } from "@/lib/score";

export const dynamic = "force-dynamic";

interface ResultRow {
  id: string;
  site_id: string;
  query_id: string | null;
  query_text: string | null;
  engine: string;
  appeared: boolean;
  rank: number | null;
  snippet: string | null;
  competitors: string[] | null;
  checked_at: string;
}

function topCompetitors(rows: ResultRow[], limit = 6): { name: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const r of rows) {
    for (const c of r.competitors ?? []) {
      const key = c.trim();
      if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export default async function VisibilityPage() {
  const supabase = await createClient();

  const { data: sites } = await supabase
    .from("sites")
    .select("id, url, name, brand")
    .order("created_at", { ascending: false });

  const { data: queries } = await supabase
    .from("visibility_queries")
    .select("id, site_id, query_text");

  const { data: results } = await supabase
    .from("visibility_results")
    .select("id, site_id, query_id, query_text, engine, appeared, rank, snippet, competitors, checked_at")
    .order("checked_at", { ascending: false });

  const siteList = sites ?? [];
  const allResults = (results ?? []) as ResultRow[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">AI Visibility Tracking</h1>
        <p className="text-muted-foreground">
          We ask real user questions from your industry to a web-search-enabled AI and measure
          whether your brand gets recommended.
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Engine: <strong>Claude (web search)</strong> — based on live web results. (Engines like
          ChatGPT/Perplexity can be enabled once the relevant API keys are added.)
        </p>
      </div>

      {siteList.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Add a site from the Dashboard first.
          </CardContent>
        </Card>
      )}

      {siteList.map((site) => {
        const siteResults = allResults.filter((r) => r.site_id === site.id);
        const latest = latestResults(siteResults);
        const stats = appearanceStats(siteResults);
        const siteQueries = (queries ?? []).filter((q) => q.site_id === site.id);
        const competitors = topCompetitors(latest);
        const lastRun = siteResults[0]?.checked_at;

        return (
          <Card key={site.id}>
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle>{site.brand || site.name || site.url}</CardTitle>
                  <p className="text-sm text-muted-foreground">{site.url}</p>
                </div>
                <VisibilityActions siteId={site.id} />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-6">
                <div>
                  <div className={`text-3xl font-bold ${scoreColor(stats.rate)}`}>
                    {stats.rate != null ? `${stats.rate}%` : "—"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    visibility rate
                    {stats.total > 0 && ` (recommended in ${stats.appeared}/${stats.total} queries)`}
                  </div>
                </div>
                {lastRun && (
                  <div className="text-xs text-muted-foreground">
                    Last scan: {new Date(lastRun).toLocaleString("en-US")}
                  </div>
                )}
              </div>

              {competitors.length > 0 && (
                <div>
                  <p className="mb-1 text-sm font-medium">Competitors highlighted by AI</p>
                  <div className="flex flex-wrap gap-2">
                    {competitors.map((c) => (
                      <Badge key={c.name} variant="secondary">
                        {c.name} {c.count > 1 && <span className="ml-1 opacity-60">×{c.count}</span>}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {siteQueries.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No queries yet. The &quot;Run visibility scan&quot; button will generate and run them automatically.
                </p>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Test questions and results</p>
                  {siteQueries.map((q) => {
                    const r = latest.find((x) => x.query_id === q.id);
                    return (
                      <div key={q.id} className="rounded-md border p-3 text-sm">
                        <div className="flex items-start justify-between gap-3">
                          <span>{q.query_text}</span>
                          {r ? (
                            r.appeared ? (
                              <Badge className="shrink-0">
                                Recommended{r.rank ? ` · #${r.rank}` : ""}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="shrink-0">Not recommended</Badge>
                            )
                          ) : (
                            <Badge variant="secondary" className="shrink-0">Not scanned</Badge>
                          )}
                        </div>
                        {r?.appeared && r.snippet && (
                          <p className="mt-2 text-xs text-muted-foreground italic">“{r.snippet}”</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
