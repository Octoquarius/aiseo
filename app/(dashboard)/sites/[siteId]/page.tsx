import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ImprovementCard, type ImprovementData } from "@/components/improvement-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { GEO_CATEGORIES, type GeoCategory } from "@/lib/types";
import { scoreColor, scoreLabel, severityWeight } from "@/lib/score";

export const dynamic = "force-dynamic";

export default async function SiteDetailPage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;
  const supabase = await createClient();

  const { data: site } = await supabase
    .from("sites")
    .select("id, url, name, latest_score, last_scanned_at")
    .eq("id", siteId)
    .single();
  if (!site) notFound();

  const { data: audit } = await supabase
    .from("audits")
    .select("overall_score, category_scores, summary, model, created_at")
    .eq("site_id", siteId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: improvements } = await supabase
    .from("improvements")
    .select("id, site_id, category, severity, title, description, code_location, current_code, suggested_code, status")
    .eq("site_id", siteId)
    .order("created_at", { ascending: false });

  const issues = ((improvements ?? []) as ImprovementData[])
    .filter((i) => i.status === "open")
    .sort((a, b) => severityWeight(b.severity) - severityWeight(a.severity));

  const categoryScores = (audit?.category_scores ?? {}) as Record<GeoCategory, number>;

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline">
            ← Dashboard
          </Link>
          <h1 className="mt-1 text-2xl font-semibold">{site.name || site.url}</h1>
          <a href={site.url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
            {site.url}
          </a>
        </div>
        <div className="text-right">
          <div className={`text-4xl font-bold ${scoreColor(site.latest_score)}`}>{site.latest_score ?? "—"}</div>
          <div className="text-xs text-muted-foreground">{scoreLabel(site.latest_score)}</div>
        </div>
      </div>

      {!audit ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            This site hasn&apos;t been scanned yet. <Button variant="link" render={<Link href="/dashboard" />}>Back to Dashboard</Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {audit.summary && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{audit.summary}</p>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {GEO_CATEGORIES.map((cat) => {
              const value = categoryScores[cat.key] ?? 0;
              return (
                <Card key={cat.key}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">{cat.label}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className={`text-2xl font-bold ${scoreColor(value)}`}>{value}</div>
                    <Progress value={value} />
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="space-y-3">
            <h2 className="text-lg font-medium">Open improvements ({issues.length})</h2>
            {issues.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  All improvements appear to be resolved. 🎉
                </CardContent>
              </Card>
            ) : (
              issues.map((i) => <ImprovementCard key={i.id} improvement={i} />)
            )}
          </div>
        </>
      )}
    </div>
  );
}
