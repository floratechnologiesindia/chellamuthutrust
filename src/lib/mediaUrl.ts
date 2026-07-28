/** Origin for uploaded media (API serves /uploads). */
export function getUploadsOrigin(): string {
  const apiUrl = import.meta.env.VITE_API_URL || '/api';
  if (apiUrl.startsWith('http')) {
    try {
      return new URL(apiUrl).origin;
    } catch {
      // fall through
    }
  }
  if (typeof window !== 'undefined') return window.location.origin;
  return '';
}

/** Fix broken upload URLs and resolve relative /uploads paths. */
export function normalizeMediaUrl(url?: string | null): string | null {
  if (!url) return null;

  let fixed = url
    .replace(/^https:\/\.msctrustcrm\.com\/api\/uploads\//, 'https://api.msctrustcrm.com/uploads/')
    .replace(/^http:\/\.msctrustcrm\.com\/api\/uploads\//, 'http://api.msctrustcrm.com/uploads/')
    .replace(/^https:\/\.msctrustcrm\.com\/uploads\//, 'https://api.msctrustcrm.com/uploads/')
    .replace(/^http:\/\.msctrustcrm\.com\/uploads\//, 'http://api.msctrustcrm.com/uploads/');

  // Serve uploads from the current app origin (nginx proxies /uploads to API)
  if (typeof window !== 'undefined') {
    fixed = fixed.replace(/^https?:\/\/api\.msctrustcrm\.com(\/api)?\/uploads\//, `${window.location.origin}/uploads/`);
  }

  if (fixed.startsWith('/uploads/')) {
    const origin =
      typeof window !== 'undefined' ? window.location.origin : getUploadsOrigin();
    return `${origin}${fixed}`;
  }

  return fixed;
}
