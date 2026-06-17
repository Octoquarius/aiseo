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

// Bir site için pipeline'ı çalıştırıp audit + improvements kayıtlarını yazar.
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
  if (auditErr || !audit) throw new Error(auditErr?.message || "Audit kaydedilemedi.");

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

// Sınırlı eşzamanlılıkla bir görev listesini çalıştırır.
async function runWithConcurrency<T>(items: T[], limit: number, fn: (item: T) => Promise<void>) {
  const queue = [...items];
  const workers = Array.from({ length: Math.min(limit, queue.length) }, async () => {
    while (queue.length) {
      const item = queue.shift()!;
      try {
        await fn(item);
      } catch (err) {
        console.error("Audit hatası:", err);
      }
    }
  });
  await Promise.all(workers);
}

// Birden çok URL ekler (satır/virgülle ayrılmış) ve her birini tarar.
export async function addSites(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const raw = String(formData.get("urls") || "");
  const candidates = raw
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (candidates.length === 0) return { ok: false, error: "En az bir URL girin." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Oturum bulunamadı." };

  // URL'leri normalize et + geçersizleri ayıkla.
  const valid: string[] = [];
  for (const c of candidates) {
    try {
      valid.push(sanitizeUrl(c));
    } catch {
      /* geçersiz URL atlanır */
    }
  }
  if (valid.length === 0) return { ok: false, error: "Geçerli URL bulunamadı." };

  const { data: inserted, error } = await supabase
    .from("sites")
    .insert(valid.map((url) => ({ user_id: user.id, url, name: new URL(url).hostname })))
    .select("id, url");
  if (error || !inserted) return { ok: false, error: error?.message || "Site eklenemedi." };

  await runWithConcurrency(inserted, 3, (s) => persistAudit(s.id, s.url));

  revalidatePath("/dashboard");
  revalidatePath("/improvements");
  return { ok: true, message: `${inserted.length} site eklendi ve analiz edildi.` };
}

// Mevcut bir siteyi yeniden tarar.
export async function scanSite(siteId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: site, error } = await supabase
    .from("sites")
    .select("id, url")
    .eq("id", siteId)
    .single();
  if (error || !site) return { ok: false, error: "Site bulunamadı." };

  try {
    await persistAudit(site.id, site.url);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Tarama başarısız." };
  }

  revalidatePath("/dashboard");
  revalidatePath(`/sites/${siteId}`);
  revalidatePath("/improvements");
  return { ok: true, message: "Site yeniden tarandı." };
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
