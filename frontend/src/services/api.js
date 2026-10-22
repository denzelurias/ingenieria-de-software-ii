import { TOKEN_KEY, SESSION_EXPIRED_EVENT } from '../utils/constants.js';

let memoryToken;
export function getToken() {
  if (memoryToken !== undefined) return memoryToken;
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}
export function setToken(token, { persist = true } = {}) {
  memoryToken = token || null;
  if (persist) {
    try { if (memoryToken) localStorage.setItem(TOKEN_KEY, memoryToken); else localStorage.removeItem(TOKEN_KEY); } catch { /* La sesión permanece disponible en memoria. */ }
  }
}
export class ApiError extends Error {
  constructor(message, { status = 0, code = 'NETWORK_ERROR', details } = {}) {
    super(message); this.name = 'ApiError'; this.status = status; this.code = code; this.details = details;
  }
}
const baseUrl = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');
export async function request(path, { method = 'GET', body, params, signal, auth = true, headers: extraHeaders, responseType = 'json' } = {}) {
  if (!path.startsWith('/') || path.startsWith('//') || path.split(/[/?#]/).includes('..')) throw new ApiError('La dirección de la solicitud no es válida.', { code: 'INVALID_REQUEST' });
  const url = new URL(baseUrl + path, window.location.origin);
  for (const [key, value] of Object.entries(params ?? {})) if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, Array.isArray(value) ? value.join(',') : String(value));
  const headers = new Headers(extraHeaders);
  headers.set('Accept', responseType === 'blob' ? '*/*' : 'application/json');
  const token = auth ? getToken() : null;
  headers.delete('Authorization');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const isForm = body instanceof FormData;
  if (isForm) headers.delete('Content-Type');
  else if (body !== undefined) headers.set('Content-Type', 'application/json');
  let response;
  try { response = await fetch(url, { method, headers, body: body === undefined ? undefined : isForm ? body : JSON.stringify(body), signal, credentials: 'omit', cache: 'no-store' }); }
  catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new ApiError('No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.');
  }
  // Un proxy también puede responder 401 sin JSON; la sesión debe cerrarse igualmente.
  if (response.status === 401 && token && getToken() === token) {
    window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT, { detail: { token, code: 'UNAUTHORIZED', message: 'Tu sesión expiró o no es válida. Inicia sesión nuevamente.' } }));
  }
  if (response.ok && responseType === 'blob') return response.blob();
  let envelope;
  try { envelope = await response.json(); }
  catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new ApiError('El servidor envió una respuesta que no pudimos leer. Inténtalo de nuevo.', { status: response.status, code: 'INVALID_RESPONSE' });
  }
  if (!response.ok || envelope?.ok !== true) {
    const error = new ApiError(typeof envelope?.error?.message === 'string' ? envelope.error.message : 'No se pudo completar la solicitud. Inténtalo de nuevo.',
      { status: response.status, code: envelope?.error?.code ?? 'INTERNAL_ERROR', details: envelope?.error?.details });
    if (token && getToken() === token && ['ACCOUNT_PENDING', 'ACCOUNT_REJECTED', 'ACCOUNT_SUSPENDED'].includes(error.code)) {
      window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT, { detail: { token, code: error.code, message: error.message } }));
    }
    throw error;
  }
  return envelope;
}
export const api = {
  get: (path, options) => request(path, options),
  post: (path, body, options) => request(path, { ...options, method: 'POST', body }),
  put: (path, body, options) => request(path, { ...options, method: 'PUT', body }),
  patch: (path, body, options) => request(path, { ...options, method: 'PATCH', body }),
  delete: (path, body, options) => request(path, { ...options, method: 'DELETE', body }),
  blob: (path, options) => request(path, { ...options, responseType: 'blob' })
};
export default api;
