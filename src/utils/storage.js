// ─────────────────────────────────────────────────────────────────────────────
// storage.js  —  Tesseract Vertex  —  Multi-context storage layer
// ─────────────────────────────────────────────────────────────────────────────

import { mockData } from './mockData.js';

const KEYS = {
  ACTIVE_CONTEXT: 'vtx_active_context', // 'normal' | 'test' | 'demo'
  ACTIVE_USERNAME: 'vtx_active_username',
  USERS: 'vtx_users', // Store created human users
  STORAGE_MODE: 'vtx_storage_mode', // 'local' | 'cloud' (null = unknown/legacy)
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

// ── Storage Mode (local-only vs cloud) ───────────────────────────────────────

/** Returns 'local', 'cloud', or null when unknown (legacy installs). */
export function getStorageMode() {
  return localStorage.getItem(KEYS.STORAGE_MODE);
}

export function setStorageMode(mode) {
  if (mode) localStorage.setItem(KEYS.STORAGE_MODE, mode);
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

// ── Data Fetching Helper ─────────────────────────────────────────────────────
// Prefixes keys based on the current mode to isolate data

function isDemoEnvironmentEnabled() {
  if (getContext().mode === 'demo') return true;
  try {
    const raw = localStorage.getItem('vertex-storage');
    if (!raw) return false;
    return JSON.parse(raw)?.state?.isDemoEnvironment === true;
  } catch {
    return false;
  }
}

function getPrefixedKey(key) {
  const { mode } = getContext();
  if (mode === 'test') return `test_${key}`;
  if (isDemoEnvironmentEnabled()) return `demo_live_${key}`;
  return `live_${key}`;
}

export function isDemoMode() {
  return isDemoEnvironmentEnabled();
}

const PROJECT_STAGE_ALIASES = {
  Proposal: 'Proposal Sent',
  Negotiating: 'Negotiation',
  Complete: 'Completed',
};

/** Canonical Pipeline columns, in board order. */
export const PIPELINE_STAGES = ['Lead', 'Proposal Sent', 'Negotiation', 'Active', 'Completed'];

/**
 * Derives a Pipeline stage for a project that has no explicit stage,
 * based on its operational status. Keeps the Kanban board complete so
 * projects created outside the Pipeline never silently disappear.
 */
export function stageForStatus(status) {
  switch (String(status || '').toLowerCase()) {
    case 'completed':
    case 'archived':
      return 'Completed';
    case 'in progress':
    case 'active':
    case 'on hold':
    case 'overdue':
      return 'Active';
    default:
      return 'Lead';
  }
}

/**
 * Guarantees every project carries a valid Pipeline stage.
 * Back-fills legacy / non-Pipeline records on read (normalization).
 */
export function normalizeProject(item) {
  if (!item) return item;
  const aliased = PROJECT_STAGE_ALIASES[item.stage] || item.stage;
  const stage = aliased || stageForStatus(item.status);
  return stage === item.stage ? item : { ...item, stage };
}

function readPersisted(key) {
  const raw = localStorage.getItem(getPrefixedKey(key));
  return raw ? JSON.parse(raw) : [];
}

function getMockItems(key) {
  if (!mockData[key]) return [];
  const items = [...mockData[key]];
  return key === 'projects' ? items.map(normalizeProject) : items;
}

function mergeById(...lists) {
  const map = new Map();
  for (const list of lists) {
    for (const item of list) {
      if (item?.id != null) map.set(item.id, item);
    }
  }
  return Array.from(map.values());
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

// ── User Management ──────────────────────────────────────────────────────────

const DEFAULT_USER = {
  name: 'Freelancer',
  email: '',
  bio: '',
  profession: '',
  workspace: 'VERTEX Studio',
  currency: 'USD',
};

/** Synchronous profile for UI — reads cached local user only. */
export function getLocalUser(username) {
  const resolved = username ?? getContext().username;
  if (!resolved) return { ...DEFAULT_USER };
  const users = JSON.parse(localStorage.getItem(KEYS.USERS) || '{}');
  return users[resolved] ? { ...DEFAULT_USER, ...users[resolved] } : { ...DEFAULT_USER };
}

/** Current workspace currency code (e.g. 'USD', 'INR'). Defaults to USD. */
export function getCurrency() {
  return getLocalUser(getContext().username).currency || 'USD';
}

/** Merge-patch the local user profile. Preserves password, id, createdAt. */
export function saveUser(username, patch = {}) {
  const resolved = username ?? getContext().username;
  if (!resolved) return null;
  const users = JSON.parse(localStorage.getItem(KEYS.USERS) || '{}');
  const existing = users[resolved] || {};
  users[resolved] = {
    ...DEFAULT_USER,
    ...existing,
    ...patch,
    password: Object.prototype.hasOwnProperty.call(patch, 'password')
      ? patch.password
      : existing.password,
    id: existing.id,
    createdAt: existing.createdAt,
    username: existing.username || resolved,
  };
  localStorage.setItem(KEYS.USERS, JSON.stringify(users));
  notifyDataChange('user');
  return users[resolved];
}

export function notifyWorkspaceChange() {
  ['clients', 'projects', 'tasks', 'invoices', 'activities', 'user'].forEach(notifyDataChange);
}

// ── Generic Data Methods ─────────────────────────────────────────────────────

function notifyDataChange(key) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('vertex-data-change', { detail: { key } }));
  }
}

export function getData(key) {
  const persisted = readPersisted(key);
  const useDemo = isDemoEnvironmentEnabled();

  if (useDemo) {
    const merged = mergeById(getMockItems(key), persisted);
    return key === 'projects' ? merged.map(normalizeProject) : merged;
  }

  return key === 'projects' ? persisted.map(normalizeProject) : persisted;
}

export function saveData(key, data) {
  localStorage.setItem(getPrefixedKey(key), JSON.stringify(data));
  notifyDataChange(key);
}

export function addDataItem(key, item) {
  const persisted = readPersisted(key);
  const newItem = { id: crypto.randomUUID(), ...item, createdAt: new Date().toISOString() };
  persisted.unshift(newItem);
  saveData(key, persisted);
  return newItem;
}

export function updateDataItem(key, id, updates) {
  const persisted = readPersisted(key);
  const index = persisted.findIndex(item => item.id === id);
  if (index !== -1) {
    persisted[index] = { ...persisted[index], ...updates, updatedAt: new Date().toISOString() };
    saveData(key, persisted);
    return persisted[index];
  }

  const merged = (getData(key) || []).find(item => item.id === id);
  if (!merged) return null;
  return addDataItem(key, { ...merged, ...updates, id });
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
  const prefixes = ['vtx_', 'live_', 'test_', 'demo_live_'];
  
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
    const prefixes = ['vtx_', 'live_', 'test_', 'demo_live_'];
    
    Object.keys(data).forEach(key => {
      if (prefixes.some(p => key.startsWith(p))) {
        localStorage.setItem(key, data[key]);
      }
    });
    notifyWorkspaceChange();
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
