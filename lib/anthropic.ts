import Anthropic from "@anthropic-ai/sdk";

export const DEFAULT_MODEL = process.env.ANALYSIS_MODEL || "claude-sonnet-4-6";
export const DEEP_MODEL = "claude-opus-4-8";

let client: Anthropic | null = null;

export function getAnthropic(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY tanımlı değil.");
  }
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}
