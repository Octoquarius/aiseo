// Bir site için marka adını belirler.
// Öncelik: açıkça verilen brand -> hostname'den türetilen ad.
export function deriveBrand(url: string, name?: string | null, brand?: string | null): string {
  if (brand && brand.trim()) return brand.trim();

  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    host = name || url;
  }
  host = host.replace(/^www\./, "");
  // İlk etiket markadır (ör. "shop.acme.co.uk" -> "shop"? hayır -> "acme").
  // Basit yaklaşım: TLD ve yaygın ikinci seviye ekleri at, ana etiketi al.
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
  // İlk harfi büyüt.
  return brandLabel.charAt(0).toUpperCase() + brandLabel.slice(1);
}

// Cevap metninde marka/domain eşleşmesi için kullanılacak anahtarlar.
export function brandAliases(url: string, brand: string): string[] {
  const aliases = new Set<string>([brand.toLowerCase()]);
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    aliases.add(host.toLowerCase());
    aliases.add(host.split(".")[0].toLowerCase());
  } catch {
    /* yok say */
  }
  return Array.from(aliases).filter(Boolean);
}
