export function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  const half = Math.floor(max / 2);
  const head = value.slice(0, half);
  const tail = value.slice(-half);
  return `${head}\n… [content truncated, total ${value.length} chars] …\n${tail}`;
}

export function stringifyForDisplay(value: unknown): string {
  try {
    const serialized = JSON.stringify(value, null, 2);
    return serialized ?? 'null';
  } catch {
    return String(value);
  }
}

export function getConfidenceIndicatorColor(confidence: 'low' | 'medium' | 'high'): string {
  switch (confidence) {
    case 'low':
      return 'bg-red-500';
    case 'high':
      return 'bg-green-500';
    default:
      return 'bg-yellow-500';
  }
}
