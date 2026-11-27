// Generic SSE streaming helper for endpoints that proxy
// OpenAI-compatible chat completions streams.
import { supabase } from "@/integrations/supabase/client";
import { startLaserProgress, stopLaserProgress } from "./laser-loader";

function isTextPart(part: unknown): part is { type: "text"; text: string } {
  if (part === null || typeof part !== "object") return false;
  const rec = part as Record<string, unknown>;
  return rec.type === "text" && typeof rec.text === "string";
}

/**
 * Normalise OpenAI/Mistral chat `content` (a string, or an array of typed
 * parts) to visible text. Thinking / reasoning parts are dropped. Anything
 * else, including null, yields an empty string — never String(object).
 */
export function deltaToText(c: unknown): string {
  if (typeof c === "string") return c;
  if (!Array.isArray(c)) return "";
  return c
    .filter(isTextPart)
    .map((part) => part.text)
    .join("");
}

export async function streamSSE({
  url,
  body,
  signal,
  onDelta,
  onDone,
  onError,
}: {
  url: string;
  body: unknown;
  signal?: AbortSignal;
  onDelta: (chunk: string) => void;
  onDone: () => void;
  onError: (msg: string) => void;
}) {
  startLaserProgress();
  try {
    let resp: Response;
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }
      resp = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal,
      });
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      onError("Nepodarilo sa spojiť so serverom.");
      return;
    }

    if (!resp.ok || !resp.body) {
      try {
        const data = await resp.json();
        onError(data.error ?? "Chyba pri generovaní.");
      } catch {
        onError("Chyba pri generovaní.");
      }
      return;
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let done = false;

    try {
      while (!done) {
        const { done: streamDone, value } = await reader.read();
        if (streamDone) break;
        buffer += decoder.decode(value, { stream: true });

        let nl: number;
        while ((nl = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, nl);
          buffer = buffer.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line || line.startsWith(":")) continue;
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") {
            done = true;
            break;
          }
          try {
            const parsed = JSON.parse(json);
            const text = deltaToText(parsed.choices?.[0]?.delta?.content);
            if (text) onDelta(text);
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        onError("Spojenie sa prerušilo.");
        return;
      }
      return;
    }

    onDone();
  } finally {
    stopLaserProgress();
  }
}
