/**
 * @jest-environment jsdom
 */

/**
 * window-storage isolation tests.
 * Each describe block uses jest.isolateModules() to reset the module-level
 * cache (cachedWindowId, cachedIsNewWindow) between scenarios.
 */

function setupMainWindow() {
  // Main window: no electronAPI.windowId
  (window as any).electronAPI = { isElectron: true, windowId: null };
  sessionStorage.clear();
  localStorage.clear();
}

function setupChildWindow(windowId: string) {
  (window as any).electronAPI = { isElectron: true, windowId };
  sessionStorage.clear();
  localStorage.clear();
}

function setupNewWindow(windowId: string) {
  (window as any).electronAPI = { isElectron: true, windowId };
  sessionStorage.clear();
  localStorage.clear();
  // Simulate ?newWindow=true already persisted to sessionStorage
  sessionStorage.setItem('__modscan_new_window__', 'true');
}

// Helper: load a fresh copy of the module inside isolateModules
function loadModule() {
  let mod: typeof import('./window-storage');
  jest.isolateModules(() => {
    mod = require('./window-storage');
  });
  return mod!;
}

// ─── Main window ─────────────────────────────────────────────────────────────

describe('main window (no windowId)', () => {
  beforeEach(setupMainWindow);

  it('reads and writes using global (unprefixed) keys', () => {
    const { getWindowItem, setWindowItem } = loadModule();
    setWindowItem('foo', 'bar');
    expect(localStorage.getItem('foo')).toBe('bar');
    expect(getWindowItem('foo')).toBe('bar');
  });

  it('returns null for a key that has not been set', () => {
    const { getWindowItem } = loadModule();
    expect(getWindowItem('missing')).toBeNull();
  });

  it('removes a key correctly', () => {
    const { setWindowItem, removeWindowItem, getWindowItem } = loadModule();
    setWindowItem('del', 'x');
    removeWindowItem('del');
    expect(getWindowItem('del')).toBeNull();
  });

  it('overwrites an existing value', () => {
    const { setWindowItem, getWindowItem } = loadModule();
    setWindowItem('k', 'first');
    setWindowItem('k', 'second');
    expect(getWindowItem('k')).toBe('second');
  });
});

// ─── Child window ─────────────────────────────────────────────────────────────

describe('child window (with windowId)', () => {
  const WIN_ID = 'win42';

  beforeEach(() => setupChildWindow(WIN_ID));

  it('writes to a prefixed key', () => {
    const { setWindowItem } = loadModule();
    setWindowItem('foo', 'bar');
    expect(localStorage.getItem(`win_${WIN_ID}_foo`)).toBe('bar');
  });

  it('reads from a prefixed key', () => {
    const { getWindowItem } = loadModule();
    localStorage.setItem(`win_${WIN_ID}_foo`, 'hello');
    expect(getWindowItem('foo')).toBe('hello');
  });

  it('does NOT fall back to the global (unprefixed) key', () => {
    const { getWindowItem } = loadModule();
    localStorage.setItem('foo', 'global-value'); // global key exists
    // prefixed key is absent → should return null, not global value
    expect(getWindowItem('foo')).toBeNull();
  });

  it('different windowIds are fully isolated from each other', () => {
    setupChildWindow('win1');
    const mod1 = loadModule();
    mod1.setWindowItem('x', 'from-win1');

    setupChildWindow('win2');
    const mod2 = loadModule();
    expect(mod2.getWindowItem('x')).toBeNull();
  });

  it('child window key does not bleed into main window namespace', () => {
    const { setWindowItem } = loadModule();
    setWindowItem('conn', 'child-value');

    // Main window reads unprefixed 'conn' — should be absent
    expect(localStorage.getItem('conn')).toBeNull();
  });

  it('removes only the prefixed key', () => {
    const { setWindowItem, removeWindowItem, getWindowItem } = loadModule();
    localStorage.setItem('foo', 'global');           // unrelated global key
    setWindowItem('foo', 'child');
    removeWindowItem('foo');
    expect(getWindowItem('foo')).toBeNull();
    expect(localStorage.getItem('foo')).toBe('global'); // global untouched
  });
});

// ─── New window ───────────────────────────────────────────────────────────────

describe('new window (?newWindow=true)', () => {
  const WIN_ID = 'win99';

  beforeEach(() => setupNewWindow(WIN_ID));

  it('getWindowItem always returns null (start clean)', () => {
    const { getWindowItem } = loadModule();
    // Even if the prefixed key exists in localStorage, reads return null
    localStorage.setItem(`win_${WIN_ID}_foo`, 'exists');
    expect(getWindowItem('foo')).toBeNull();
  });

  it('setWindowItem still writes (persistence works after initial load)', () => {
    const { setWindowItem } = loadModule();
    setWindowItem('bar', 'value');
    expect(localStorage.getItem(`win_${WIN_ID}_bar`)).toBe('value');
  });
});

// ─── SSR guard ────────────────────────────────────────────────────────────────

describe('SSR environment (window undefined)', () => {
  it('getWindowItem returns null without throwing', () => {
    // Simulate SSR by temporarily hiding window
    const original = global.window;
    // @ts-expect-error intentional
    delete global.window;
    try {
      const { getWindowItem } = loadModule();
      expect(getWindowItem('any')).toBeNull();
    } finally {
      global.window = original;
    }
  });
});
