// Default AI provider: Mistral AI (direct API, OpenAI-compatible chat completions).
export const AI_CHAT_URL = "https://api.mistral.ai/v1/chat/completions";
export const AI_DEFAULT_MODEL = "mistral-large-latest";
export const AI_KEY_ENV = "MISTRAL_API_KEY";

/**
 * Returns the sanitized Mistral API key from environment variables.
 * Trims extraneous whitespace and quotes (single or double) that may be introduced
 * when secrets are configured in deployment dashboards.
 */
export function getMistralApiKey(): string | undefined {
  const raw = process.env.MISTRAL_API_KEY;
  if (!raw) return undefined;
  const sanitized = raw.replace(/['"]/g, "").trim();
  return sanitized.length > 0 ? sanitized : undefined;
}
