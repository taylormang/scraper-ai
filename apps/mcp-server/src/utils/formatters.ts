/**
 * Formatting utilities for MCP responses
 */

/**
 * Format event type to icon
 */
export function formatEventIcon(type: string): string {
  switch (type) {
    case 'start':
      return '▶️';
    case 'success':
      return '✓';
    case 'error':
      return '✗';
    case 'warning':
      return '⚠️';
    case 'info':
      return 'ℹ️';
    default:
      return '•';
  }
}

/**
 * Truncate string to max length with ellipsis
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) {
    return str;
  }
  return str.substring(0, maxLength) + '...';
}

/**
 * Format JSON value for display
 */
export function formatValue(value: any, maxLength = 100): string {
  if (value === null || value === undefined) {
    return 'null';
  }
  if (typeof value === 'string' && value.length > maxLength) {
    return truncate(value, maxLength);
  }
  return JSON.stringify(value);
}
