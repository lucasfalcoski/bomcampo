/**
 * Shared date utilities for Edge Functions
 * All date operations should use these helpers to ensure consistency across the system.
 */

/**
 * Get current date in BRT (America/Sao_Paulo) timezone.
 * Returns YYYY-MM-DD format.
 * 
 * This is the single source of truth for "today" across all AI usage tracking.
 */
export function getTodayBRT(): string {
  const now = new Date();
  // BRT is UTC-3
  const brtOffset = -3 * 60;
  const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;
  const brtTime = new Date(utcTime + brtOffset * 60000);
  return brtTime.toISOString().split('T')[0];
}

/**
 * Fixed source identifier for AI usage tracking.
 * All AI interactions should use this source to ensure consistent quota tracking.
 */
export const AI_USAGE_SOURCE = 'copilot';
