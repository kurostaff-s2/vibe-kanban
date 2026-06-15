/**
 * JWT utilities — stubbed for single-user mode.
 * VK's auth is disabled; no token refresh needed.
 */

export const shouldRefreshAccessToken = (_token: string): boolean => {
  return false; // no auth in single-user mode
};
