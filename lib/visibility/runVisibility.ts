import type { ProbeResult, VisibilityEngine } from "@/lib/types";
import { DEFAULT_MODEL } from "@/lib/anthropic";
import { askEngine } from "./askEngine";
import { analyzeAnswer } from "./analyzeAnswer";
import { brandAliases } from "./brand";

// Currently active engines. Add openai/perplexity here when they're supported later.
export const ACTIVE_ENGINES: VisibilityEngine[] = ["claude-web"];

// End-to-end probe for a single (query, engine) pair: get the answer + analyze it.
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
