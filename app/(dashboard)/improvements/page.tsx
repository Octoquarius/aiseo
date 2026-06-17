import { createClient } from "@/lib/supabase/server";
import { ImprovementCard, type ImprovementData } from "@/components/improvement-card";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { severityWeight } from "@/lib/score";

export const dynamic = "force-dynamic";

interface Row extends Omit<ImprovementData, "siteName"> {
  sites: { name: string | null; url: string } | null;
}

function sortBySeverity(a: ImprovementData, b: ImprovementData) {
  return severityWeight(b.severity) - severityWeight(a.severity);
}

export default async function ImprovementsPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("improvements")
    .select(
      "id, site_id, category, severity, title, description, code_location, current_code, suggested_code, status, sites(name, url)",
    )
    .order("created_at", { ascending: false });

  const rows = (data ?? []) as unknown as Row[];
  const all: ImprovementData[] = rows.map((r) => ({
    id: r.id,
    site_id: r.site_id,
    siteName: r.sites?.name ?? r.sites?.url ?? null,
    category: r.category,
    severity: r.severity,
    title: r.title,
    description: r.description,
    code_location: r.code_location,
    current_code: r.current_code,
    suggested_code: r.suggested_code,
    status: r.status,
  }));

  const open = all.filter((i) => i.status === "open").sort(sortBySeverity);
  const resolved = all.filter((i) => i.status !== "open").sort(sortBySeverity);

  const empty = (
    <Card>
      <CardContent className="py-10 text-center text-muted-foreground">
        Burada gösterilecek iyileştirme yok. Dashboard&apos;tan bir site tarayın.
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Improvements</h1>
        <p className="text-muted-foreground">
          Her sorunun yanındaki <strong>Improve</strong> butonuna basın; kodu nereye, nasıl ekleyeceğinizi görün.
        </p>
      </div>

      <Tabs defaultValue="open">
        <TabsList>
          <TabsTrigger value="open">Açık ({open.length})</TabsTrigger>
          <TabsTrigger value="resolved">Çözülen ({resolved.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="open" className="space-y-3 pt-4">
          {open.length === 0 ? empty : open.map((i) => <ImprovementCard key={i.id} improvement={i} />)}
        </TabsContent>
        <TabsContent value="resolved" className="space-y-3 pt-4">
          {resolved.length === 0 ? empty : resolved.map((i) => <ImprovementCard key={i.id} improvement={i} />)}
        </TabsContent>
      </Tabs>
    </div>
  );
}
