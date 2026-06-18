const TOKEN_KEY = 'buildtrack_token';
const SESSION_TOKEN_KEY = 'buildtrack_session_token';

function getStorage() {
  if (typeof window === 'undefined') return null;
  try {
    return {
      local: window.localStorage,
      session: window.sessionStorage,
    };
  } catch {
    return null;
  }
}

export function getToken() {
  const storage = getStorage();
  if (!storage) return null;
  return storage.session.getItem(SESSION_TOKEN_KEY) || storage.local.getItem(TOKEN_KEY);
}

export function setToken(token, rememberMe = true) {
  const storage = getStorage();
  if (!storage) return;

  storage.local.removeItem(TOKEN_KEY);
  storage.session.removeItem(SESSION_TOKEN_KEY);

  if (!token) return;
  if (rememberMe) storage.local.setItem(TOKEN_KEY, token);
  else storage.session.setItem(SESSION_TOKEN_KEY, token);
}

function authHeaders(options = {}) {
  const token = options.token === undefined ? getToken() : options.token;
  const headers = {
    ...(options.headers || {})
  };

  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export async function api(path, options = {}) {
  const headers = authHeaders(options);
  let body;

  if (options.body !== undefined) {
    if (options.body instanceof FormData) {
      body = options.body;
    } else {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(options.body);
    }
  }

  const response = await fetch(`${(import.meta.env.VITE_API_URL || '/api')}${path}`, {
    method: options.method || 'GET',
    headers,
    body
  });

  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await response.json() : null;

  if (!response.ok) {
    throw new Error((data && data.error) || `Request failed with status ${response.status}`);
  }

  return data;
}

export async function downloadFromApi(path, fallbackName = 'download') {
  const response = await fetch(`${(import.meta.env.VITE_API_URL || '/api')}${path}`, {
    method: 'GET',
    headers: authHeaders()
  });

  if (!response.ok) {
    let message = `Download failed with status ${response.status}`;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await response.json();
      message = data?.error || message;
    }
    throw new Error(message);
  }

  const blob = await response.blob();
  const disposition = response.headers.get('content-disposition') || '';
  const encodedName = /filename\*=UTF-8''([^;]+)/i.exec(disposition)?.[1];
  const fileName = encodedName ? decodeURIComponent(encodedName) : fallbackName;
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);
}
