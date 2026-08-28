// Helpers for computing statistics from visibility results.

export interface ResultLike {
  query_id: string | null;
  engine: string;
  appeared: boolean;
  rank: number | null;
  checked_at: string;
}

// Returns the latest result for each (query_id + engine) pair (filters out older repeat scans).
export function latestResults<T extends ResultLike>(rows: T[]): T[] {
  const byKey = new Map<string, T>();
  for (const r of rows) {
    const key = `${r.query_id ?? "?"}|${r.engine}`;
    const existing = byKey.get(key);
    if (!existing || new Date(r.checked_at) > new Date(existing.checked_at)) {
      byKey.set(key, r);
    }
  }
  return Array.from(byKey.values());
}

// The brand's recommendation rate (0-100) and counts across the latest results.
export function appearanceStats(rows: ResultLike[]): {
  rate: number | null;
  appeared: number;
  total: number;
} {
  const latest = latestResults(rows);
  const total = latest.length;
  if (total === 0) return { rate: null, appeared: 0, total: 0 };
  const appeared = latest.filter((r) => r.appeared).length;
  return { rate: Math.round((appeared / total) * 100), appeared, total };
}
