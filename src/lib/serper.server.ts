export interface SerperOrganicResult {
  title: string;
  link: string;
  snippet?: string;
  position?: number;
}

export interface SerperSearchResponse {
  searchParameters?: {
    q: string;
    gl?: string;
    hl?: string;
  };
  organic?: SerperOrganicResult[];
  retryAfter?: number;
}

const GOOGLE_GOTO_RE = /google\.com\/goto\?url=/i;

export function hasGoogleRedirectLinks(data: SerperSearchResponse): boolean {
  return Boolean(data.organic?.some((item) => item.link && GOOGLE_GOTO_RE.test(item.link)));
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function resolveSerperLinks(
  data: SerperSearchResponse,
  apiKey: string,
  maxRetries = 2,
): Promise<SerperSearchResponse> {
  let current = data;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (!hasGoogleRedirectLinks(current)) {
      return current;
    }

    const res = await fetch("https://google.serper.dev/resolve", {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(current),
    });

    if (!res.ok) {
      throw new Error(`Serper resolve error: ${res.status} ${res.statusText}`);
    }

    current = (await res.json()) as SerperSearchResponse;

    if (current.retryAfter && attempt < maxRetries && hasGoogleRedirectLinks(current)) {
      const waitSeconds = Math.min(Math.max(current.retryAfter, 1), 35);
      await sleep(waitSeconds * 1000);
      continue;
    }

    return current;
  }

  return current;
}

/**
 * Server-only Serper.dev Google SERP lookup.
 * Reads SERPER_API_KEY strictly from server environment variables.
 */
export async function searchSerper(
  query: string,
  options: { gl?: string; hl?: string; num?: number; resolveLinks?: boolean } = {},
): Promise<SerperSearchResponse> {
  const apiKey = process.env.SERPER_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("SERPER_API_KEY is not configured on the server");
  }

  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    throw new Error("Search query must not be empty");
  }

  const payload: Record<string, unknown> = {
    q: trimmedQuery,
    gl: options.gl ?? "sk",
    hl: options.hl ?? "sk",
    num: options.num ?? 10,
  };

  if (options.resolveLinks === false) {
    payload.resolveLinks = false;
  }

  const response = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: {
      "X-API-KEY": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Serper API error: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as SerperSearchResponse;

  if (options.resolveLinks !== false && hasGoogleRedirectLinks(data)) {
    return resolveSerperLinks(data, apiKey);
  }

  return data;
}
