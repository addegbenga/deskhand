// MSW resolves the apps' relative handler paths (/api/...) against location, which Node lacks.
if (typeof globalThis.location === 'undefined') {
  Object.defineProperty(globalThis, 'location', { value: new URL('http://localhost/'), configurable: true })
}

// The dev settings store persists to localStorage; give Node an in-memory one.
if (typeof globalThis.localStorage === 'undefined' || typeof globalThis.localStorage.setItem !== 'function') {
  const data = new Map<string, string>()
  const storage: Storage = {
    get length() {
      return data.size
    },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (index) => [...data.keys()][index] ?? null,
    removeItem: (key) => void data.delete(key),
    setItem: (key, value) => void data.set(key, String(value)),
  }
  Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true })
}
