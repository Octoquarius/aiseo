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
  return GEO_CATEGORIES.find((c) => c.key === key)?.labelTr ?? key;
}

export function ImprovementCard({ improvement }: { improvement: ImprovementData }) {
  const [pending, startTransition] = useTransition();

  const setStatus = (status: ImprovementStatus) =>
    startTransition(async () => {
      const res = await updateImprovementStatus(improvement.id, status);
      if (res.ok) toast.success(status === "fixed" ? "Düzeltildi olarak işaretlendi." : "Güncellendi.");
      else toast.error(res.error || "Güncellenemedi.");
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
            {done && <Badge variant="secondary">{improvement.status === "fixed" ? "Düzeltildi" : "Yok sayıldı"}</Badge>}
          </div>
          <p className="font-medium">{improvement.title}</p>
          <p className="line-clamp-2 text-sm text-muted-foreground">{improvement.description}</p>
        </div>

        <Dialog>
          <DialogTrigger render={<Button size="sm" className="shrink-0" />}>
            Improve
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{improvement.title}</DialogTitle>
              <DialogDescription>
                {categoryLabel(improvement.category)} · {SEVERITY_LABEL[improvement.severity]} öncelik
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <section>
                <h4 className="mb-1 text-sm font-semibold">Açıklama</h4>
                <p className="text-sm text-muted-foreground">{improvement.description}</p>
              </section>

              {improvement.code_location && (
                <section>
                  <h4 className="mb-1 text-sm font-semibold">Kodun yeri</h4>
                  <p className="rounded-md bg-muted px-3 py-2 font-mono text-sm">{improvement.code_location}</p>
                </section>
              )}

              {improvement.current_code && (
                <section>
                  <h4 className="mb-1 text-sm font-semibold">Mevcut durum</h4>
                  <pre className="max-h-[30vh] overflow-auto rounded-md bg-muted p-3 text-xs">
                    <code>{improvement.current_code}</code>
                  </pre>
                </section>
              )}

              {improvement.suggested_code && (
                <section>
                  <div className="mb-1 flex items-center justify-between">
                    <h4 className="text-sm font-semibold">Önerilen kod</h4>
                    <CopyButton text={improvement.suggested_code} />
                  </div>
                  <pre className="max-h-[30vh] overflow-auto rounded-md border bg-emerald-50 p-3 text-xs dark:bg-emerald-950/30">
                    <code>{improvement.suggested_code}</code>
                  </pre>
                </section>
              )}

              <div className="flex gap-2 pt-2">
                <Button size="sm" onClick={() => setStatus("fixed")} disabled={pending || improvement.status === "fixed"}>
                  Düzeltildi olarak işaretle
                </Button>
                {improvement.status === "open" ? (
                  <Button size="sm" variant="outline" onClick={() => setStatus("dismissed")} disabled={pending}>
                    Yok say
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => setStatus("open")} disabled={pending}>
                    Yeniden aç
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
