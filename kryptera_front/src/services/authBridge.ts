/**
 * Optional bridge so api.ts can refresh access tokens on 401 without importing React.
 */
export type AuthBridge = {
  getAccess: () => string | null;
  getRefresh: () => string | null;
  setAccess: (access: string) => void;
};

let bridge: AuthBridge | null = null;

export function setAuthBridge(next: AuthBridge | null): void {
  bridge = next;
}

export function getAuthBridge(): AuthBridge | null {
  return bridge;
}
