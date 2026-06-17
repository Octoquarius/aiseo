// n8n "Sanitize Website URL" düğümünün portu.
// Kullanıcı girdisini normalize edilmiş, geçerli bir http(s) URL'sine çevirir.
export function sanitizeUrl(input: string): string {
  let value = (input ?? "").trim();
  if (!value) throw new Error("URL boş olamaz.");

  const schemeMatch = value.match(/^([a-z][a-z0-9+.-]*):\/\//i);
  if (schemeMatch) {
    // Açık bir şema var; http/https dışındakileri reddet.
    const scheme = schemeMatch[1].toLowerCase();
    if (scheme !== "http" && scheme !== "https") {
      throw new Error("Yalnızca http/https URL'leri desteklenir.");
    }
  } else {
    // Şema yoksa https ekle.
    value = "https://" + value;
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`Geçersiz URL: ${input}`);
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Yalnızca http/https URL'leri desteklenir.");
  }

  // Hostname'i küçük harfe çevir, sondaki tek slash'ı koru.
  parsed.hostname = parsed.hostname.toLowerCase();
  return parsed.toString();
}

// robots.txt / llms.txt gibi kök dosyalar için origin döndürür (sondaki slash yok).
export function originOf(url: string): string {
  return new URL(url).origin;
}
