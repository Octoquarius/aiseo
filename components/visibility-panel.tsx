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
      if (res.ok) toast.success(res.message || "Scanned.");
      else toast.error(res.error || "Scan failed.");
    });

  const regen = () =>
    startTransition(async () => {
      const res = await generateSiteQueries(siteId);
      if (res.ok) toast.success(res.message || "Queries generated.");
      else toast.error(res.error || "Generation failed.");
    });

  return (
    <div className="flex gap-2">
      <Button size="sm" onClick={run} disabled={pending}>
        {pending ? "Running… (this may take a while)" : "Run visibility scan"}
      </Button>
      <Button size="sm" variant="outline" onClick={regen} disabled={pending}>
        Regenerate questions
      </Button>
    </div>
  );
}
