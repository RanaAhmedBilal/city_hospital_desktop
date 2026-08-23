/**
 * Safely escape HTML special characters to prevent XSS injection in template rendering
 */
export function escapeHtml(unsafe: string | number | null | undefined): string {
  if (unsafe == null) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function escapeHtmlOrDash(unsafe: string | number | null | undefined): string {
  if (unsafe == null || !String(unsafe).trim()) return '—';
  return escapeHtml(unsafe);
}
