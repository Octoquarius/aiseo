// Skor renk/etiket yardımcıları (UI genelinde tutarlı).

export function scoreColor(score: number | null | undefined): string {
  if (score == null) return "text-muted-foreground";
  if (score >= 80) return "text-emerald-600";
  if (score >= 60) return "text-amber-600";
  if (score >= 40) return "text-orange-600";
  return "text-red-600";
}

export function scoreLabel(score: number | null | undefined): string {
  if (score == null) return "Taranmadı";
  if (score >= 80) return "Mükemmel";
  if (score >= 60) return "İyi";
  if (score >= 40) return "Geliştirilmeli";
  return "Zayıf";
}

export function severityWeight(severity: string): number {
  return severity === "high" ? 3 : severity === "medium" ? 2 : 1;
}

export const SEVERITY_LABEL: Record<string, string> = {
  high: "Yüksek",
  medium: "Orta",
  low: "Düşük",
};

export const SEVERITY_VARIANT: Record<string, "destructive" | "default" | "secondary"> = {
  high: "destructive",
  medium: "default",
  low: "secondary",
};
