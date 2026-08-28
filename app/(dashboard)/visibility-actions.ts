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

// Generates seed queries for a site (replaces old ones if any exist).
export async function generateSiteQueries(siteId: string): Promise<ActionResult> {
  const site = await getOwnedSite(siteId);
  if (!site) return { ok: false, error: "Site not found." };

  const supabase = await createClient();

  // Fetch the latest audit summary/preview for context.
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
    return { ok: false, error: err instanceof Error ? err.message : "Query generation failed." };
  }

  if (queries.length === 0) return { ok: false, error: "Failed to generate queries." };

  // Replace the old queries (their results are cleared via FK cascade).
  await supabase.from("visibility_queries").delete().eq("site_id", siteId);
  const { error } = await supabase
    .from("visibility_queries")
    .insert(queries.map((q) => ({ site_id: siteId, query_text: q })));
  if (error) return { ok: false, error: error.message };

  revalidatePath("/visibility");
  return { ok: true, message: `Generated ${queries.length} quer${queries.length === 1 ? "y" : "ies"}.` };
}

// Visibility scan for a site: run a probe for each query × engine pair and write the results.
export async function runSiteVisibility(siteId: string): Promise<ActionResult> {
  const site = await getOwnedSite(siteId);
  if (!site) return { ok: false, error: "Site not found." };

  const supabase = await createClient();
  const brand = deriveBrand(site.url, site.name, site.brand);

  // Auto-generate queries if none exist.
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
  if (!queryRows || queryRows.length === 0) return { ok: false, error: "No queries to run." };

  // Build (query × engine) pairs.
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
    return { ok: false, error: err instanceof Error ? err.message : "Visibility scan failed." };
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
    message: `Scanned ${rows.length} queries — your brand was recommended in ${appeared} of them.`,
  };
}
