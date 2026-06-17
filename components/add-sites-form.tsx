"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { addSites, type ActionResult } from "@/app/(dashboard)/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function AddSitesForm() {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(addSites, { ok: false });

  useEffect(() => {
    if (state.message) toast.success(state.message);
    if (state.error) toast.error(state.error);
  }, [state]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>URL Ekle</CardTitle>
        <CardDescription>
          Her satıra bir URL yazın (veya virgülle ayırın). Birden fazla site aynı anda eklenip analiz edilir.
        </CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="space-y-3">
          <textarea
            name="urls"
            rows={3}
            required
            placeholder={"https://siteniz.com\nhttps://baska-site.com"}
            className="w-full resize-y rounded-md border bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          <Button type="submit" disabled={pending}>
            {pending ? "Analiz ediliyor… (bu biraz sürebilir)" : "Ekle ve Analiz Et"}
          </Button>
        </CardContent>
      </form>
    </Card>
  );
}
