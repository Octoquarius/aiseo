"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { runAudit } from "@/lib/analysis/runAudit";
import { sanitizeUrl } from "@/lib/analysis/sanitizeUrl";
import type { ImprovementStatus } from "@/lib/types";

export interface ActionResult {
  ok: boolean;
  error?: string;
  message?: string;
}

// Runs the pipeline for a site and writes the audit + improvements records.
async function persistAudit(siteId: string, url: string) {
  const output = await runAudit(url);

  const supabase = await createClient();
  const { data: audit, error: auditErr } = await supabase
    .from("audits")
    .insert({
      site_id: siteId,
      overall_score: output.audit.overall_score,
      category_scores: output.audit.category_scores,
      raw_features: { features: output.features, robots: output.robots },
      summary: output.audit.summary,
      model: output.model,
    })
    .select("id")
    .single();
  if (auditErr || !audit) throw new Error(auditErr?.message || "Failed to save audit.");

  // Rescan: delete the previous improvements so they don't duplicate/pile up.
  // Each scan replaces the site's improvement set with the current one.
  await supabase.from("improvements").delete().eq("site_id", siteId);

  if (output.audit.issues.length > 0) {
    const rows = output.audit.issues.map((i) => ({
      audit_id: audit.id,
      site_id: siteId,
      category: i.category,
      severity: i.severity,
      title: i.title,
      description: i.description,
      code_location: i.code_location,
      current_code: i.current_code,
      suggested_code: i.suggested_code,
      status: "open" as const,
    }));
    const { error: impErr } = await supabase.from("improvements").insert(rows);
    if (impErr) throw new Error(impErr.message);
  }

  await supabase
    .from("sites")
    .update({ latest_score: output.audit.overall_score, last_scanned_at: new Date().toISOString() })
    .eq("id", siteId);
}

// Runs a list of tasks with bounded concurrency.
async function runWithConcurrency<T>(items: T[], limit: number, fn: (item: T) => Promise<void>) {
  const queue = [...items];
  const workers = Array.from({ length: Math.min(limit, queue.length) }, async () => {
    while (queue.length) {
      const item = queue.shift()!;
      try {
        await fn(item);
      } catch (err) {
        console.error("Audit error:", err);
      }
    }
  });
  await Promise.all(workers);
}

// Adds multiple URLs (separated by newline/comma) and scans each of them.
export async function addSites(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const raw = String(formData.get("urls") || "");
  const candidates = raw
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (candidates.length === 0) return { ok: false, error: "Enter at least one URL." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "No session found." };

  // Normalize URLs + filter out invalid ones.
  const valid: string[] = [];
  for (const c of candidates) {
    try {
      valid.push(sanitizeUrl(c));
    } catch {
      /* skip invalid URL */
    }
  }
  if (valid.length === 0) return { ok: false, error: "No valid URL found." };

  const { data: inserted, error } = await supabase
    .from("sites")
    .insert(valid.map((url) => ({ user_id: user.id, url, name: new URL(url).hostname })))
    .select("id, url");
  if (error || !inserted) return { ok: false, error: error?.message || "Failed to add site." };

  await runWithConcurrency(inserted, 3, (s) => persistAudit(s.id, s.url));

  revalidatePath("/dashboard");
  revalidatePath("/improvements");
  return { ok: true, message: `${inserted.length} site(s) added and analyzed.` };
}

// Rescans an existing site.
export async function scanSite(siteId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: site, error } = await supabase
    .from("sites")
    .select("id, url")
    .eq("id", siteId)
    .single();
  if (error || !site) return { ok: false, error: "Site not found." };

  try {
    await persistAudit(site.id, site.url);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Scan failed." };
  }

  revalidatePath("/dashboard");
  revalidatePath(`/sites/${siteId}`);
  revalidatePath("/improvements");
  return { ok: true, message: "Site rescanned." };
}

export async function deleteSite(siteId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("sites").delete().eq("id", siteId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard");
  revalidatePath("/improvements");
  return { ok: true };
}

export async function updateImprovementStatus(
  improvementId: string,
  status: ImprovementStatus,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("improvements")
    .update({ status })
    .eq("id", improvementId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/improvements");
  revalidatePath("/dashboard");
  return { ok: true };
}
