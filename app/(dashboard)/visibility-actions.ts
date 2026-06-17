"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { deriveBrand } from "@/lib/visibility/brand";
import { generateQueries } from "@/lib/visibility/generateQueries";
import { probeOne, ACTIVE_ENGINES } from "@/lib/visibility/runVisibility";
import { mapLimit } from "@/lib/concurrency";
import type { ActionResult } from "./actions";

interface SiteRow {
  id: string;
  url: string;
  name: string | null;
  brand: string | null;
}

async function getOwnedSite(siteId: string): Promise<SiteRow | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("sites")
    .select("id, url, name, brand")
    .eq("id", siteId)
    .single();
  return (data as SiteRow) ?? null;
}

// Site için tohum sorgular üretir (varsa eskileri değiştirir).
export async function generateSiteQueries(siteId: string): Promise<ActionResult> {
  const site = await getOwnedSite(siteId);
  if (!site) return { ok: false, error: "Site bulunamadı." };

  const supabase = await createClient();

  // Bağlam için en son audit özetini/önizlemesini al.
  const { data: audit } = await supabase
    .from("audits")
    .select("summary, raw_features")
    .eq("site_id", siteId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const brand = deriveBrand(site.url, site.name, site.brand);
  const previewText =
    (audit?.raw_features as { features?: { previewText?: string } } | null)?.features?.previewText;

  let queries: string[];
  try {
    queries = await generateQueries({
      brand,
      url: site.url,
      contextSummary: audit?.summary ?? undefined,
      previewText,
    });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Sorgu üretimi başarısız." };
  }

  if (queries.length === 0) return { ok: false, error: "Sorgu üretilemedi." };

  // Eski sorguları değiştir (sonuçları FK cascade ile temizlenir).
  await supabase.from("visibility_queries").delete().eq("site_id", siteId);
  const { error } = await supabase
    .from("visibility_queries")
    .insert(queries.map((q) => ({ site_id: siteId, query_text: q })));
  if (error) return { ok: false, error: error.message };

  revalidatePath("/visibility");
  return { ok: true, message: `${queries.length} sorgu üretildi.` };
}

// Site için görünürlük taraması: her sorgu × motor için prob çalıştır, sonuçları yaz.
export async function runSiteVisibility(siteId: string): Promise<ActionResult> {
  const site = await getOwnedSite(siteId);
  if (!site) return { ok: false, error: "Site bulunamadı." };

  const supabase = await createClient();
  const brand = deriveBrand(site.url, site.name, site.brand);

  // Sorgu yoksa otomatik üret.
  let { data: queryRows } = await supabase
    .from("visibility_queries")
    .select("id, query_text")
    .eq("site_id", siteId);

  if (!queryRows || queryRows.length === 0) {
    const gen = await generateSiteQueries(siteId);
    if (!gen.ok) return gen;
    ({ data: queryRows } = await supabase
      .from("visibility_queries")
      .select("id, query_text")
      .eq("site_id", siteId));
  }
  if (!queryRows || queryRows.length === 0) return { ok: false, error: "Çalıştırılacak sorgu yok." };

  // (sorgu × motor) çiftlerini oluştur.
  const jobs = queryRows.flatMap((q) =>
    ACTIVE_ENGINES.map((engine) => ({ queryId: q.id, queryText: q.query_text, engine })),
  );

  let probed;
  try {
    probed = await mapLimit(jobs, 2, async (job) => {
      const result = await probeOne({
        brand,
        url: site.url,
        query: job.queryText,
        engine: job.engine,
      });
      return { job, result };
    });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Görünürlük taraması başarısız." };
  }

  const rows = probed.map(({ job, result }) => ({
    site_id: siteId,
    query_id: job.queryId,
    query_text: job.queryText,
    engine: job.engine,
    appeared: result.appeared,
    rank: result.rank,
    snippet: result.snippet,
    competitors: result.competitors,
    raw_answer: result.raw_answer,
  }));

  const { error } = await supabase.from("visibility_results").insert(rows);
  if (error) return { ok: false, error: error.message };

  const appeared = rows.filter((r) => r.appeared).length;
  revalidatePath("/visibility");
  revalidatePath("/dashboard");
  return {
    ok: true,
    message: `${rows.length} sorgu tarandı — ${appeared} tanesinde markanız önerildi.`,
  };
}
