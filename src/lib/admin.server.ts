// Server-only admin resolution. Fail-closed: env variables are read per call
// inside handlers, never at module top level.

export interface AdminUser {
  id: string;
  email?: string;
  email_confirmed_at?: string | null;
  email_verified?: boolean;
}

function parseCsvList(value: string | undefined): string[] {
  return (value || "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

/**
 * Single source of truth for "is this user a platform admin":
 * - primary: user.id is listed in ADMIN_USER_IDS (comma-separated UUIDs, trimmed);
 * - fallback: only when ADMIN_USER_IDS is not configured AND the email is
 *   verified (email_confirmed_at present or email_verified === true) and listed
 *   in ADMIN_EMAILS (case-insensitive);
 * - when neither variable is configured: false (fail-closed).
 *
 * The email fallback exists only for verified addresses — an unverified email
 * must never grant admin, otherwise anyone could register with an admin email.
 */
export function isAdminUser(user: AdminUser): boolean {
  if (!user || !user.id) return false;

  const adminIds = parseCsvList(process.env.ADMIN_USER_IDS);
  if (adminIds.length > 0) {
    return adminIds.includes(user.id);
  }

  const adminEmails = parseCsvList(process.env.ADMIN_EMAILS).map((e) => e.toLowerCase());
  if (adminEmails.length === 0 || !user.email) return false;

  const emailVerified = Boolean(user.email_confirmed_at) || user.email_verified === true;
  return emailVerified && adminEmails.includes(user.email.toLowerCase());
}
