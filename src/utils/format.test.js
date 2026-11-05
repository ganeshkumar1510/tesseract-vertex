import { describe, it, expect } from 'vitest';
import { getCurrencySymbol, formatMoney, todayISO, formatAddedDate } from './format';

describe('format utilities', () => {
  it('resolves correct currency symbols', () => {
    expect(getCurrencySymbol('USD')).toBe('$');
    expect(getCurrencySymbol('EUR')).toBe('€');
    expect(getCurrencySymbol('GBP')).toBe('£');
    expect(getCurrencySymbol('INR')).toBe('₹');
    expect(getCurrencySymbol('OTHER')).toBe('$');
  });

  it('formats money with currency symbol and commas', () => {
    expect(formatMoney(15000, 'USD')).toBe('$15,000');
    expect(formatMoney(2500.5, 'EUR')).toBe('€2,500.5');
    expect(formatMoney(0, 'GBP')).toBe('£0');
    expect(formatMoney('50000', 'INR')).toBe('₹50,000');
  });

  it('returns ISO date string for today', () => {
    const today = todayISO();
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('formats added date safely', () => {
    expect(formatAddedDate(null)).toBe('Added recently');
    expect(formatAddedDate('invalid-date')).toBe('Added recently');
    expect(formatAddedDate('2026-10-15T10:00:00Z')).toContain('Added');
  });
});

