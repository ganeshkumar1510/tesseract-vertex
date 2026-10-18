import { Window } from 'happy-dom';

// In this environment `localStorage` can be bound to an empty stub object
// (Node 25's experimental Web Storage meeting the test worker's
// --localstorage-file spawn on Windows). Install a fresh happy-dom storage
// on the globals so application code exercises the real Web Storage API.
const storage = new Window();

for (const name of ['localStorage', 'sessionStorage']) {
  const impl = storage[name];
  for (const target of [globalThis, window]) {
    try {
      Object.defineProperty(target, name, { value: impl, configurable: true, writable: true });
    } catch {
      /* leave the environment as-is */
    }
  }
}
