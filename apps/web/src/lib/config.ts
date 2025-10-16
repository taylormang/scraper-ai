export function getApiBaseUrl(): string {
  const defaultUrl = 'http://localhost:3001';
  if (typeof process === 'undefined') {
    return defaultUrl;
  }

  return (
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.API_BASE_URL ||
    defaultUrl
  );
}
