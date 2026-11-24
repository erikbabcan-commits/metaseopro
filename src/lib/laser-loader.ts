/**
 * Global helpers to manually trigger the top-bar laser loader
 * during heavy asynchronous operations (e.g. AI generation, SERP scans).
 */
export const LASER_START_EVENT = "seo4web:laser-start";
export const LASER_DONE_EVENT = "seo4web:laser-done";

export function startLaserProgress(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(LASER_START_EVENT));
  }
}

export function stopLaserProgress(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(LASER_DONE_EVENT));
  }
}
