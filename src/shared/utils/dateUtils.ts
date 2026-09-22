/**
 * Date utilities for timezone-aware local date handling across Electron main and renderer processes.
 */

/**
 * Returns today's date formatted as `YYYY-MM-DD` according to local desktop time.
 */
export function getTodayDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parses a `YYYY-MM-DD` string (or defaults to today) into start of day (00:00:00.000)
 * and end of day (23:59:59.999) Date objects in local timezone.
 */
export function parseLocalDateRange(dateStr?: string): { start: Date; end: Date } {
  if (dateStr && dateStr.trim() && /^\d{4}-\d{2}-\d{2}$/.test(dateStr.trim())) {
    const [year, month, day] = dateStr.trim().split('-').map(Number);
    const start = new Date(year, month - 1, day, 0, 0, 0, 0);
    const end = new Date(year, month - 1, day, 23, 59, 59, 999);
    return { start, end };
  }

  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  return { start, end };
}
