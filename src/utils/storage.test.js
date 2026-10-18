import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  stageForStatus,
  normalizeProject,
  validateUserCredentials,
  importStorageJSON,
  wipeStorage,
} from './storage';

describe('stageForStatus', () => {
  it('maps completed and archived statuses to Completed', () => {
    expect(stageForStatus('completed')).toBe('Completed');
    expect(stageForStatus('Archived')).toBe('Completed');
  });

  it('maps in-flight statuses to Active', () => {
    expect(stageForStatus('in progress')).toBe('Active');
    expect(stageForStatus('Active')).toBe('Active');
    expect(stageForStatus('On Hold')).toBe('Active');
    expect(stageForStatus('overdue')).toBe('Active');
  });

  it('falls back to Lead for unknown or empty input', () => {
    expect(stageForStatus('')).toBe('Lead');
    expect(stageForStatus(undefined)).toBe('Lead');
    expect(stageForStatus('something else')).toBe('Lead');
  });
});

describe('normalizeProject', () => {
  it('back-fills a pipeline stage from legacy status', () => {
    expect(normalizeProject({ id: 'p1', status: 'in progress' }).stage).toBe('Active');
    expect(normalizeProject({ id: 'p2', status: 'completed' }).stage).toBe('Completed');
  });

  it('maps legacy stage aliases to canonical stages', () => {
    expect(normalizeProject({ id: 'p3', stage: 'Proposal' }).stage).toBe('Proposal Sent');
    expect(normalizeProject({ id: 'p4', stage: 'Negotiating' }).stage).toBe('Negotiation');
    expect(normalizeProject({ id: 'p5', stage: 'Complete' }).stage).toBe('Completed');
  });

  it('returns the same object when the stage is already canonical', () => {
    const project = { id: 'p6', stage: 'Negotiation' };
    expect(normalizeProject(project)).toBe(project);
  });

  it('passes falsy input through', () => {
    expect(normalizeProject(null)).toBe(null);
    expect(normalizeProject(undefined)).toBe(undefined);
  });
});

describe('validateUserCredentials', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.unstubAllEnvs();
  });

  it('accepts the stored password for a known user', () => {
    localStorage.setItem('vtx_users', JSON.stringify({ dev: { password: 'abc123' } }));
    expect(validateUserCredentials('dev', 'abc123')).toBe('dev');
  });

  it('rejects wrong passwords and unknown users', () => {
    localStorage.setItem('vtx_users', JSON.stringify({ dev: { password: 'abc123' } }));
    expect(validateUserCredentials('dev', 'nope')).toBeNull();
    expect(validateUserCredentials('ghost', 'abc123')).toBeNull();
  });

  it('has no built-in 1510 fallback when VITE_ADMIN_PIN is unset', () => {
    vi.stubEnv('VITE_ADMIN_PIN', '');
    localStorage.setItem('vtx_users', JSON.stringify({ dev: { password: 'abc123' } }));
    expect(validateUserCredentials('dev', '1510')).toBeNull();
  });

  // In vitest DEV is true, so this documents the dev-only override branch.
  // The production build's rejection of the same PIN is covered by the
  // browser E2E suite (cdp-p4.mjs).
  it('accepts the explicit VITE_ADMIN_PIN override only in dev', () => {
    vi.stubEnv('VITE_ADMIN_PIN', '1510');
    expect(validateUserCredentials('dev', '1510')).toBe('system_admin');
  });
});

describe('importStorageJSON', () => {
  beforeEach(() => localStorage.clear());

  it('imports data-namespaced keys and ignores foreign keys', () => {
    const okResult = importStorageJSON(JSON.stringify({
      vtx_users: '{"dev":{}}',
      live_clients: '[{"id":"c1"}]',
      foreign_key: 'nope',
      'vertex-mode': 'aether',
    }));

    expect(okResult).toBe(true);
    expect(localStorage.getItem('vtx_users')).toBe('{"dev":{}}');
    expect(localStorage.getItem('live_clients')).toBe('[{"id":"c1"}]');
    expect(localStorage.getItem('foreign_key')).toBeNull();
    expect(localStorage.getItem('vertex-mode')).toBeNull();
  });

  it('returns false on malformed input', () => {
    expect(importStorageJSON('not json')).toBe(false);
  });
});

describe('wipeStorage', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('removes only Vertex-namespaced keys from both storages', () => {
    localStorage.setItem('vtx_jwt', 'token');
    localStorage.setItem('live_clients', '[]');
    localStorage.setItem('demo_live_invoices', '[]');
    localStorage.setItem('vertex-mode', 'quasar');
    localStorage.setItem('foreign_key', 'keep');
    sessionStorage.setItem('vtx_local_banner_dismissed', '1');
    sessionStorage.setItem('foreign_session', 'keep');

    wipeStorage();

    expect(localStorage.getItem('vtx_jwt')).toBeNull();
    expect(localStorage.getItem('live_clients')).toBeNull();
    expect(localStorage.getItem('demo_live_invoices')).toBeNull();
    expect(localStorage.getItem('vertex-mode')).toBeNull();
    expect(localStorage.getItem('foreign_key')).toBe('keep');
    expect(sessionStorage.getItem('vtx_local_banner_dismissed')).toBeNull();
    expect(sessionStorage.getItem('foreign_session')).toBe('keep');
  });
});
