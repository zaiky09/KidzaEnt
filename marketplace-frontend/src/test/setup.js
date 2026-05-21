import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Node 26 + jsdom 29 fail to populate window.localStorage in this combo.
// A small in-memory shim keeps tests deterministic and independent of jsdom internals.
class StorageMock {
  constructor() { this.store = Object.create(null); }
  getItem(key) { return key in this.store ? this.store[key] : null; }
  setItem(key, value) { this.store[key] = String(value); }
  removeItem(key) { delete this.store[key]; }
  clear() { this.store = Object.create(null); }
  key(i) { return Object.keys(this.store)[i] ?? null; }
  get length() { return Object.keys(this.store).length; }
}

if (typeof globalThis.localStorage === 'undefined') {
  globalThis.localStorage = new StorageMock();
}
if (typeof globalThis.sessionStorage === 'undefined') {
  globalThis.sessionStorage = new StorageMock();
}

afterEach(() => {
  cleanup();
  localStorage.clear();
});
