function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, '');
}

export function getApiBaseUrl() {
  const configured = import.meta.env.VITE_API_BASE_URL?.trim();
  if (configured) {
    return trimTrailingSlash(configured);
  }

  return '';
}

export function getApiUrl(path: string) {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) {
    return path;
  }

  return `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
}
