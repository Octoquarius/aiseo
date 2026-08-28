"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CopyButton } from "@/components/copy-button";
import { updateImprovementStatus } from "@/app/(dashboard)/actions";
import { SEVERITY_LABEL, SEVERITY_VARIANT } from "@/lib/score";
import { GEO_CATEGORIES, type ImprovementStatus } from "@/lib/types";

export interface ImprovementData {
  id: string;
  site_id: string;
  siteName?: string | null;
  category: string;
  severity: string;
  title: string;
  description: string | null;
  code_location: string | null;
  current_code: string | null;
  suggested_code: string | null;
  status: ImprovementStatus;
}

function categoryLabel(key: string) {
  return GEO_CATEGORIES.find((c) => c.key === key)?.label ?? key;
}

export function ImprovementCard({ improvement }: { improvement: ImprovementData }) {
  const [pending, startTransition] = useTransition();

  const setStatus = (status: ImprovementStatus) =>
    startTransition(async () => {
      const res = await updateImprovementStatus(improvement.id, status);
      if (res.ok) toast.success(status === "fixed" ? "Marked as fixed." : "Updated.");
      else toast.error(res.error || "Could not update.");
    });

  const done = improvement.status !== "open";

  return (
    <Card className={done ? "opacity-60" : ""}>
      <CardContent className="flex items-start justify-between gap-4 py-4">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={SEVERITY_VARIANT[improvement.severity] ?? "secondary"}>
              {SEVERITY_LABEL[improvement.severity] ?? improvement.severity}
            </Badge>
            <Badge variant="outline">{categoryLabel(improvement.category)}</Badge>
            {improvement.siteName && (
              <span className="text-xs text-muted-foreground">{improvement.siteName}</span>
            )}
            {done && <Badge variant="secondary">{improvement.status === "fixed" ? "Fixed" : "Dismissed"}</Badge>}
          </div>
          <p className="font-medium">{improvement.title}</p>
          <p className="line-clamp-2 text-sm text-muted-foreground">{improvement.description}</p>
        </div>

        <Dialog>
          <DialogTrigger render={<Button size="sm" className="shrink-0" />}>
            Improve
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle className="break-words">{improvement.title}</DialogTitle>
              <DialogDescription>
                {categoryLabel(improvement.category)} · {SEVERITY_LABEL[improvement.severity]} priority
              </DialogDescription>
            </DialogHeader>

            <div className="min-w-0 space-y-4">
              <section className="min-w-0">
                <h4 className="mb-1 text-sm font-semibold">Description</h4>
                <p className="text-sm break-words text-muted-foreground">{improvement.description}</p>
              </section>

              {improvement.code_location && (
                <section className="min-w-0">
                  <h4 className="mb-1 text-sm font-semibold">Code location</h4>
                  <p className="rounded-md bg-muted px-3 py-2 font-mono text-sm break-words">{improvement.code_location}</p>
                </section>
              )}

              {improvement.current_code && (
                <section className="min-w-0">
                  <h4 className="mb-1 text-sm font-semibold">Current state</h4>
                  <pre className="max-h-[40vh] overflow-auto rounded-md bg-muted p-3 text-xs">
                    <code>{improvement.current_code}</code>
                  </pre>
                </section>
              )}

              {improvement.suggested_code && (
                <section className="min-w-0">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <h4 className="text-sm font-semibold">Suggested code</h4>
                    <CopyButton text={improvement.suggested_code} />
                  </div>
                  <pre className="max-h-[40vh] overflow-auto rounded-md border bg-emerald-50 p-3 text-xs dark:bg-emerald-950/30">
                    <code>{improvement.suggested_code}</code>
                  </pre>
                </section>
              )}

              <div className="flex gap-2 pt-2">
                <Button size="sm" onClick={() => setStatus("fixed")} disabled={pending || improvement.status === "fixed"}>
                  Mark as fixed
                </Button>
                {improvement.status === "open" ? (
                  <Button size="sm" variant="outline" onClick={() => setStatus("dismissed")} disabled={pending}>
                    Dismiss
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => setStatus("open")} disabled={pending}>
                    Reopen
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
