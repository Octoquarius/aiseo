// n8n "Get HTML from Website" düğümünün portu.
// LLM tarayıcılarının gördüğü gibi, JS çalıştırmadan ham HTML çeker.

export interface FetchHtmlResult {
  html: string;
  finalUrl: string;
  statusCode: number;
}

// Googlebot benzeri User-Agent — birçok site bot trafiğine ham HTML döndürür.
const USER_AGENT =
  "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";

export async function fetchHtml(
  url: string,
  timeoutMs = 12000,
): Promise<FetchHtmlResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
      },
    });

    const html = await res.text();
    return { html, finalUrl: res.url || url, statusCode: res.status };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`Site ${timeoutMs}ms içinde yanıt vermedi: ${url}`);
    }
    throw new Error(
      `Site getirilemedi (${url}): ${err instanceof Error ? err.message : String(err)}`,
    );
  } finally {
    clearTimeout(timer);
  }
}

// Basit metin kaynaklarını (robots.txt, llms.txt) getirir; hata durumunda null.
export async function fetchText(
  url: string,
  timeoutMs = 8000,
): Promise<{ text: string; statusCode: number } | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": USER_AGENT },
    });
    if (!res.ok) return { text: "", statusCode: res.status };
    return { text: await res.text(), statusCode: res.status };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
