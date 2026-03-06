/**
 * Window-scoped Storage Utility
 * 
 * In Electron, all BrowserWindows that load from the same origin share
 * the same localStorage. This utility prefixes storage keys with the 
 * current windowId so data is properly isolated per-window.
 * 
 * - Main window (no windowId): uses unprefixed keys (backward compatible)
 * - New windows (has windowId): uses "win_{windowId}_" prefix, NO fallback to global keys
 * - New windows with ?newWindow=true: return null for all reads (start clean)
 * 
 * IMPORTANT: The newWindow flag is persisted to sessionStorage on first check,
 * because Next.js SPA navigation strips query params from the URL.
 */

let cachedWindowId: string | null = null;
let cachedWindowIdLoaded = false;
let cachedIsNewWindow: boolean | undefined = undefined;

function getWindowId(): string | null {
  if (cachedWindowIdLoaded) return cachedWindowId;
  if (typeof window === 'undefined') return null;
  
  const api = (window as any).electronAPI;
  cachedWindowId = api?.windowId || null;
  cachedWindowIdLoaded = true;
  return cachedWindowId;
}

function isNewWindow(): boolean {
  if (cachedIsNewWindow !== undefined) return cachedIsNewWindow;
  if (typeof window === 'undefined') return false;
  
  // Check sessionStorage first (persisted from first navigation)
  const stored = sessionStorage.getItem('__modscan_new_window__');
  if (stored !== null) {
    cachedIsNewWindow = stored === 'true';
    return cachedIsNewWindow;
  }
  
  // First time: check URL query param and persist to sessionStorage
  const fromUrl = new URLSearchParams(window.location.search).get('newWindow') === 'true';
  sessionStorage.setItem('__modscan_new_window__', String(fromUrl));
  cachedIsNewWindow = fromUrl;
  return cachedIsNewWindow;
}

function getPrefix(): string {
  const id = getWindowId();
  if (!id) return ''; // Main window: no prefix
  return `win_${id}_`;
}

/**
 * Get item from storage, scoped to current window.
 * - New windows (isNewWindow=true): always returns null (start clean)
 * - Windows with windowId: reads only from prefixed key, NO fallback to global
 * - Main window (no windowId): reads from global key
 */
export function getWindowItem(key: string): string | null {
  if (typeof window === 'undefined') return null;
  
  // New windows always start clean
  if (isNewWindow()) return null;
  
  const prefix = getPrefix();
  if (prefix) {
    // Window-scoped: read ONLY from prefixed key, never fall back to global
    return localStorage.getItem(prefix + key);
  }
  
  // Main window: use global key
  return localStorage.getItem(key);
}

/**
 * Set item in storage, scoped to current window.
 */
export function setWindowItem(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  
  const prefix = getPrefix();
  if (prefix) {
    localStorage.setItem(prefix + key, value);
  } else {
    localStorage.setItem(key, value);
  }
}

/**
 * Remove item from storage, scoped to current window.
 */
export function removeWindowItem(key: string): void {
  if (typeof window === 'undefined') return;
  
  const prefix = getPrefix();
  if (prefix) {
    localStorage.removeItem(prefix + key);
  } else {
    localStorage.removeItem(key);
  }
}
