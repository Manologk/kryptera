/**
 * Optional bridge so api.ts can refresh access tokens on 401 without importing React.
 */
export type AuthBridge = {
  getAccess: () => string | null;
  getRefresh: () => string | null;
  setAccess: (access: string) => void;
  /** Called when access/refresh tokens are invalid; should log out and route to login. */
  onAuthFailure?: () => void;
};

let bridge: AuthBridge | null = null;
let authFailureHandled = false;

export function setAuthBridge(next: AuthBridge | null): void {
  bridge = next;
  if (!next) authFailureHandled = false;
}

export function getAuthBridge(): AuthBridge | null {
  return bridge;
}

export function resetAuthFailureGuard(): void {
  authFailureHandled = false;
}

export function notifyAuthFailure(): void {
  if (authFailureHandled) return;
  authFailureHandled = true;
  bridge?.onAuthFailure?.();
}
