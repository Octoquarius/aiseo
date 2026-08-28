// Port of n8n's "Sanitize Website URL" node.
// Converts user input into a normalized, valid http(s) URL.
export function sanitizeUrl(input: string): string {
  let value = (input ?? "").trim();
  if (!value) throw new Error("URL cannot be empty.");

  const schemeMatch = value.match(/^([a-z][a-z0-9+.-]*):\/\//i);
  if (schemeMatch) {
    // An explicit scheme is present; reject anything other than http/https.
    const scheme = schemeMatch[1].toLowerCase();
    if (scheme !== "http" && scheme !== "https") {
      throw new Error("Only http/https URLs are supported.");
    }
  } else {
    // No scheme, add https.
    value = "https://" + value;
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`Invalid URL: ${input}`);
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Only http/https URLs are supported.");
  }

  // Lowercase the hostname, keep the single trailing slash.
  parsed.hostname = parsed.hostname.toLowerCase();
  return parsed.toString();
}

// Returns the origin for root-level files like robots.txt / llms.txt (no trailing slash).
export function originOf(url: string): string {
  return new URL(url).origin;
}
