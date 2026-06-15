/**
 * Council API Transport Layer
 *
 * Replaces VK's localApiTransport.ts (Rust backend) with direct HTTP calls
 * to the Python Council Core API (Starlette, port 8000).
 *
 * Single-user mode: no auth, no idempotency keys, no revision checks.
 */

// Base URL from env. Empty string uses relative URLs (goes through Vite proxy in dev).
// Set VITE_COUNCIL_API_BASE=http://localhost:8000 for direct backend access (prod).
const COUNCIL_API_BASE = import.meta.env.VITE_COUNCIL_API_BASE || '';

export interface CouncilRequestOptions extends RequestInit {
  /** Skip JSON content-type header */
  skipJsonHeader?: boolean;
}

/**
 * Make a request to the Council Core API.
 *
 * Auto-adds Content-Type: application/json and X-Client-Type header.
 * For write methods (POST/PATCH), adds required headers:
 * - X-Source-System: council-frontend
 * - X-Actor-Id: local-user
 * - Idempotency-Key: auto-generated UUID
 */
export async function makeCouncilRequest(
  path: string,
  options: CouncilRequestOptions = {}
): Promise<Response> {
  const { skipJsonHeader, ...fetchOptions } = options;
  const headers = new Headers(fetchOptions.headers ?? {});

  if (!skipJsonHeader && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  headers.set('X-Client-Type', 'council-frontend');

  // Write methods require specific headers
  const method = (fetchOptions.method ?? 'GET').toUpperCase();
  if (method === 'POST' || method === 'PATCH') {
    headers.set('X-Source-System', 'council-frontend');
    headers.set('X-Actor-Id', 'local-user');
    if (!headers.has('Idempotency-Key')) {
      headers.set('Idempotency-Key', crypto.randomUUID());
    }
  }

  const url = path.startsWith('/') ? `${COUNCIL_API_BASE}${path}` : path;
  return fetch(url, { ...fetchOptions, headers });
}

/**
 * Open a WebSocket to the Council API.
 * Converts http:// → ws:// automatically.
 * If COUNCIL_API_BASE is empty, uses relative URL (goes through Vite proxy).
 */
export function openCouncilWebSocket(path: string): WebSocket {
  if (!COUNCIL_API_BASE) {
    // Relative URL — let browser handle protocol
    return new WebSocket(`${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}${path}`);
  }
  const wsBase = COUNCIL_API_BASE.replace(/^http/i, 'ws');
  const url = path.startsWith('/') ? `${wsBase}${path}` : path;
  return new WebSocket(url);
}

/**
 * Get the base URL (useful for constructing asset URLs).
 */
export function getCouncilApiBase(): string {
  return COUNCIL_API_BASE;
}
