// ─────────────────────────────────────────────────────────────────────────────
// storage.js  —  Tesseract Vertex  —  Multi-context storage layer
// ─────────────────────────────────────────────────────────────────────────────

const KEYS = {
  ACTIVE_CONTEXT: 'vtx_active_context', // 'normal' | 'test' | 'demo'
  ACTIVE_USERNAME: 'vtx_active_username',
  USERS: 'vtx_users', // Store created human users
  THEME: 'vtx_theme',
};

// ── Context Management ───────────────────────────────────────────────────────

export function setContext(mode, username = '') {
  localStorage.setItem(KEYS.ACTIVE_CONTEXT, mode);
  if (username) localStorage.setItem(KEYS.ACTIVE_USERNAME, username);
}

export function getContext() {
  return {
    mode: localStorage.getItem(KEYS.ACTIVE_CONTEXT) || 'normal',
    username: localStorage.getItem(KEYS.ACTIVE_USERNAME) || ''
  };
}

export function getTheme() {
  return localStorage.getItem(KEYS.THEME) || 'quasar';
}

export function setTheme(theme) {
  localStorage.setItem(KEYS.THEME, theme);
  document.documentElement.setAttribute('data-theme', theme);
}

// ── Validation ───────────────────────────────────────────────────────────────

/**
 * Validates a user's password/PIN for sensitive actions.
 * In a local-first app, this checks the stored user hash/string.
 */
export function validateUserCredentials(username, password) {
  // Universal bypass for testing/admin overrides
  const adminPin = import.meta.env.VITE_ADMIN_PIN || '1510';
  if (password === adminPin) return 'system_admin';

  const users = JSON.parse(localStorage.getItem(KEYS.USERS) || '{}');
  const user = users[username];
  
  if (!user) return null;

  // Basic check for MVP
  if (user.password === password) return username;
  return null;
}

export function validateSystemCreds(username, pin) {
  return validateUserCredentials(username, pin);
}


// ── Data Fetching Helper ─────────────────────────────────────────────────────
// Prefixes keys based on the current mode to isolate data

function getPrefixedKey(key) {
  const { mode } = getContext();
  if (mode === 'test') return `test_${key}`;
  return `live_${key}`;
}

// ── API Helpers ─────────────────────────────────────────────────────────────

const API_BASE = '/api';

async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem('vtx_jwt');
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers
  };

  const response = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'API request failed');
  }
  return response.json();
}

export async function apiRegister(userData) {
  const data = await apiFetch('/register', {
    method: 'POST',
    body: JSON.stringify(userData)
  });
  if (data.token) localStorage.setItem('vtx_jwt', data.token);
  return data;
}

export async function apiLogin(email, password) {
  const data = await apiFetch('/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
  if (data.token) localStorage.setItem('vtx_jwt', data.token);
  return data;
}

export async function apiGetProfile() {
  const data = await apiFetch('/user');
  return data.user;
}

// ── User Management ──────────────────────────────────────────────────────────

export async function getUser(username) {
  // First check local storage for offline support/caching
  const users = JSON.parse(localStorage.getItem(KEYS.USERS) || '{}');
  if (users[username]) return users[username];

  // Then try API
  try {
    const profile = await apiGetProfile();
    if (profile) {
      // Cache it
      users[username] = profile;
      localStorage.setItem(KEYS.USERS, JSON.stringify(users));
      return profile;
    }
  } catch (err) {
    console.error('Failed to fetch user from API:', err);
  }
  return null;
}

export async function createUser(userData) {
  // 1. Register via API
  try {
    const response = await apiRegister(userData);
    const newUser = {
      ...userData,
      id: response.user?.id,
      createdAt: new Date().toISOString()
    };

    // 2. Cache in LocalStorage
    const users = JSON.parse(localStorage.getItem(KEYS.USERS) || '{}');
    users[userData.username] = newUser;
    localStorage.setItem(KEYS.USERS, JSON.stringify(users));
    
    return newUser;
  } catch (err) {
    console.error('Registration failed:', err);
    throw err;
  }
}

export function hasAnyUser() {
  const users = JSON.parse(localStorage.getItem(KEYS.USERS) || '{}');
  const hasLocal = Object.keys(users).length > 0;
  const hasToken = !!localStorage.getItem('vtx_jwt');
  return hasLocal || hasToken;
}

// ... rest of the file remains same for now to avoid total breakage ...

// ── Generic Data Methods ─────────────────────────────────────────────────────

export function getData(key) {
  const { mode } = getContext();
  if (mode === 'demo') {
    // Demo mode uses static mockData (handled by components)
    return null; 
  }
  const fullKey = getPrefixedKey(key);
  const raw = localStorage.getItem(fullKey);
  return raw ? JSON.parse(raw) : [];
}

export function saveData(key, data) {
  const fullKey = getPrefixedKey(key);
  localStorage.setItem(fullKey, JSON.stringify(data));
}

export function addDataItem(key, item) {
  const items = getData(key) || [];
  const newItem = { id: crypto.randomUUID(), ...item, createdAt: new Date().toISOString() };
  items.unshift(newItem); // Unshift so newer items are first
  saveData(key, items);
  return newItem;
}

export function updateDataItem(key, id, updates) {
  const items = getData(key) || [];
  const index = items.findIndex(item => item.id === id);
  if (index !== -1) {
    items[index] = { ...items[index], ...updates, updatedAt: new Date().toISOString() };
    saveData(key, items);
    return items[index];
  }
  return null;
}

export function addClient(clientData) {
  return addDataItem('clients', clientData);
}

export function logActivity(type, description, company = '') {
  return addDataItem('activities', {
    type,
    description,
    company,
    time: 'Just now'
  });
}

// ── Reset ────────────────────────────────────────────────────────────────────

export function clearTestContext() {
  const keys = Object.keys(localStorage);
  keys.forEach(k => {
    if (k.startsWith('test_')) localStorage.removeItem(k);
  });
  localStorage.removeItem(KEYS.ACTIVE_CONTEXT);
  localStorage.removeItem(KEYS.ACTIVE_USERNAME);
}

// ── Data Sovereignty (Module 1) ─────────────────────────────────────────────

export function exportStorageJSON() {
  const data = {};
  const prefixes = ['vtx_', 'live_', 'test_'];
  
  Object.keys(localStorage).forEach(key => {
    if (prefixes.some(p => key.startsWith(p))) {
      data[key] = localStorage.getItem(key);
    }
  });

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `tesseract_snapshot_${new Date().toISOString().split('T')[0]}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export function importStorageJSON(jsonData) {
  try {
    const data = JSON.parse(jsonData);
    const prefixes = ['vtx_', 'live_', 'test_'];
    
    Object.keys(data).forEach(key => {
      if (prefixes.some(p => key.startsWith(p))) {
        localStorage.setItem(key, data[key]);
      }
    });
    return true;
  } catch (e) {
    console.error('Import failed:', e);
    return false;
  }
}

export async function wipeStorage() {
  try {
    await apiFetch('/user', { method: 'DELETE' });
  } catch (err) {
    console.error('Failed to purge remote data:', err);
  }
  localStorage.clear();
  sessionStorage.clear();
  console.log('VERTEX Instance Purged.');
}

export function logout() {
  localStorage.removeItem(KEYS.ACTIVE_CONTEXT);
  localStorage.removeItem(KEYS.ACTIVE_USERNAME);
}
