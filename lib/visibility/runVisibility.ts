import type { ProbeResult, VisibilityEngine } from "@/lib/types";
import { DEFAULT_MODEL } from "@/lib/anthropic";
import { askEngine } from "./askEngine";
import { analyzeAnswer } from "./analyzeAnswer";
import { brandAliases } from "./brand";

// Şu an aktif motorlar. İleride openai/perplexity eklendiğinde buraya eklenir.
export const ACTIVE_ENGINES: VisibilityEngine[] = ["claude-web"];

// Tek bir (sorgu, motor) için uçtan uca prob: cevabı al + analiz et.
export async function probeOne(params: {
  brand: string;
  url: string;
  query: string;
  engine: VisibilityEngine;
  model?: string;
}): Promise<ProbeResult> {
  const model = params.model || DEFAULT_MODEL;
  const answer = await askEngine(params.engine, params.query, model);
  return analyzeAnswer({
    brand: params.brand,
    aliases: brandAliases(params.url, params.brand),
    query: params.query,
    answer,
    model,
  });
}
