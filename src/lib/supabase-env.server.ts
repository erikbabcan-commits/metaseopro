// Server-only: resolves the public Supabase connection settings.
//
// Tracked `.env` carries only the 3 public VITE_SUPABASE_* keys, so server code
// prefers the explicit SUPABASE_* variables (when set on the target) and falls
// back to the VITE_* ones. Empty strings count as "not set". Callers must keep
// failing closed when this returns undefined.

function pick(primary: string | undefined, fallback: string | undefined): string | undefined {
  if (primary && primary.trim()) return primary;
  if (fallback && fallback.trim()) return fallback;
  return undefined;
}

export function getServerSupabaseUrl(): string | undefined {
  return pick(process.env.SUPABASE_URL, process.env.VITE_SUPABASE_URL);
}

export function getServerSupabasePublishableKey(): string | undefined {
  return pick(process.env.SUPABASE_PUBLISHABLE_KEY, process.env.VITE_SUPABASE_PUBLISHABLE_KEY);
}
