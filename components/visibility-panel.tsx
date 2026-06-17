"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { runSiteVisibility, generateSiteQueries } from "@/app/(dashboard)/visibility-actions";

export function VisibilityActions({ siteId }: { siteId: string }) {
  const [pending, startTransition] = useTransition();

  const run = () =>
    startTransition(async () => {
      const res = await runSiteVisibility(siteId);
      if (res.ok) toast.success(res.message || "Tarandı.");
      else toast.error(res.error || "Tarama başarısız.");
    });

  const regen = () =>
    startTransition(async () => {
      const res = await generateSiteQueries(siteId);
      if (res.ok) toast.success(res.message || "Sorgular üretildi.");
      else toast.error(res.error || "Üretim başarısız.");
    });

  return (
    <div className="flex gap-2">
      <Button size="sm" onClick={run} disabled={pending}>
        {pending ? "Çalışıyor… (bu biraz sürebilir)" : "Görünürlük taraması çalıştır"}
      </Button>
      <Button size="sm" variant="outline" onClick={regen} disabled={pending}>
        Soruları yeniden üret
      </Button>
    </div>
  );
}
