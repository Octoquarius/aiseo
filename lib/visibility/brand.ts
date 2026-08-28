// Determines the brand name for a site.
// Priority: explicitly given brand -> name derived from the hostname.
export function deriveBrand(url: string, name?: string | null, brand?: string | null): string {
  if (brand && brand.trim()) return brand.trim();

  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    host = name || url;
  }
  host = host.replace(/^www\./, "");
  // The first label is the brand (e.g. "shop.acme.co.uk" -> "shop"? no -> "acme").
  // Simple approach: drop the TLD and common second-level suffixes, take the main label.
  const parts = host.split(".");
  // "acme.com" -> acme ; "shop.acme.com" -> acme ; "acme.co.uk" -> acme
  let labelIdx = parts.length - 2;
  if (
    parts.length >= 3 &&
    ["co", "com", "org", "net", "gov", "edu"].includes(parts[parts.length - 2])
  ) {
    labelIdx = parts.length - 3;
  }
  const brandLabel = parts[Math.max(0, labelIdx)] || host;
  // Capitalize the first letter.
  return brandLabel.charAt(0).toUpperCase() + brandLabel.slice(1);
}

// Keys used to match brand/domain mentions in answer text.
export function brandAliases(url: string, brand: string): string[] {
  const aliases = new Set<string>([brand.toLowerCase()]);
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    aliases.add(host.toLowerCase());
    aliases.add(host.split(".")[0].toLowerCase());
  } catch {
    /* ignore */
  }
  return Array.from(aliases).filter(Boolean);
}
