"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { scanSite, deleteSite } from "@/app/(dashboard)/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { scoreColor, scoreLabel } from "@/lib/score";

export interface SiteCardData {
  id: string;
  url: string;
  name: string | null;
  latest_score: number | null;
  last_scanned_at: string | null;
  openIssues: number;
}

export function SiteCard({ site }: { site: SiteCardData }) {
  const [pending, startTransition] = useTransition();
  const [deleting, setDeleting] = useState(false);

  const onScan = () =>
    startTransition(async () => {
      const res = await scanSite(site.id);
      if (res.ok) toast.success(res.message || "Tarandı.");
      else toast.error(res.error || "Tarama başarısız.");
    });

  const onDelete = () =>
    startTransition(async () => {
      setDeleting(true);
      const res = await deleteSite(site.id);
      if (!res.ok) {
        toast.error(res.error || "Silinemedi.");
        setDeleting(false);
      }
    });

  return (
    <Card className={deleting ? "opacity-50" : ""}>
      <CardContent className="flex items-center justify-between gap-4 py-4">
        <div className="min-w-0">
          <Link href={`/sites/${site.id}`} className="font-medium hover:underline">
            {site.name || site.url}
          </Link>
          <p className="truncate text-sm text-muted-foreground">{site.url}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {site.openIssues} açık iyileştirme
            {site.last_scanned_at
              ? ` · son tarama ${new Date(site.last_scanned_at).toLocaleDateString("tr-TR")}`
              : " · henüz taranmadı"}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className={`text-2xl font-bold ${scoreColor(site.latest_score)}`}>
              {site.latest_score ?? "—"}
            </div>
            <div className="text-xs text-muted-foreground">{scoreLabel(site.latest_score)}</div>
          </div>
          <div className="flex flex-col gap-1">
            <Button size="sm" variant="outline" onClick={onScan} disabled={pending}>
              {pending ? "…" : "Tara"}
            </Button>
            <Button size="sm" variant="ghost" onClick={onDelete} disabled={pending}>
              Sil
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
