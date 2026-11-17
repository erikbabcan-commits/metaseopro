/**
 * Log hygiene helpers: customer e-mail addresses must never reach server logs.
 * Log a userId, or at most the masked form produced by maskEmail().
 */

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+/g;

/** "jan.novak@example.sk" -> "j***@e***". Never throws; non-emails become "***". */
export function maskEmail(email: unknown): string {
  if (typeof email !== "string") return "***";
  const at = email.indexOf("@");
  if (at < 1 || at === email.length - 1) return "***";
  return `${email[0]}***@${email[at + 1]}***`;
}

/** Replaces every e-mail address found in free text (provider error bodies, error messages). */
export function redactEmails(text: string): string {
  return text.replace(EMAIL_RE, "[redacted-email]");
}

/** Safe representation of an unknown error for logs: message only, e-mails redacted. */
export function safeErrorForLog(err: unknown): string {
  const msg = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
  return redactEmails(msg);
}
