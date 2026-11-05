import { describe, it, expect } from 'vitest';
import {
  round2,
  createLineItem,
  lineItemAmount,
  normalizeLineItems,
  invoiceTotal,
  invoiceLineItems,
  invoiceItemCount,
} from './invoice';

describe('invoice utility model', () => {
  it('round2 correctly rounds numbers to 2 decimal places', () => {
    expect(round2(10.555)).toBe(10.56);
    expect(round2(10.554)).toBe(10.55);
    expect(round2(0)).toBe(0);
    expect(round2('45.50')).toBe(45.5);
    expect(round2(null)).toBe(0);
  });

  it('createLineItem initializes with defaults and generates unique id', () => {
    const item1 = createLineItem();
    const item2 = createLineItem({ description: 'Custom' });

    expect(item1.id).not.toBe(item2.id);
    expect(item1.quantity).toBe(1);
    expect(item1.rate).toBe('');
    expect(item2.description).toBe('Custom');
  });

  it('lineItemAmount computes quantity times rate', () => {
    expect(lineItemAmount({ quantity: 2, rate: 150 })).toBe(300);
    expect(lineItemAmount({ quantity: 1.5, rate: 100 })).toBe(150);
    expect(lineItemAmount(null)).toBe(0);
  });

  it('normalizeLineItems removes empty rows and coerces numeric values', () => {
    const raw = [
      { description: '', quantity: 1, rate: 0 },
      { description: 'Design tokens', quantity: 2, rate: 125.5 },
      null,
      { description: 'Consulting', quantity: '3', rate: '200' },
    ];

    const normalized = normalizeLineItems(raw);
    expect(normalized).toHaveLength(2);
    expect(normalized[0].description).toBe('Design tokens');
    expect(normalized[0].amount).toBe(251);
    expect(normalized[1].amount).toBe(600);
  });

  it('invoiceTotal calculates total from line items if present, or falls back to legacy amount', () => {
    const withItems = {
      line_items: [
        { quantity: 2, rate: 50 },
        { quantity: 1, rate: 120 },
      ],
      amount: 500,
    };
    expect(invoiceTotal(withItems)).toBe(220);

    const legacyFlat = { amount: 850 };
    expect(invoiceTotal(legacyFlat)).toBe(850);
    expect(invoiceTotal(null)).toBe(0);
  });

  it('invoiceLineItems synthesizes row for legacy flat invoice', () => {
    const legacy = { id: 'INV-1', amount: 500, project: 'Mobile App' };
    const items = invoiceLineItems(legacy);

    expect(items).toHaveLength(1);
    expect(items[0].description).toContain('Mobile App');
    expect(items[0].amount).toBe(500);
    expect(invoiceItemCount(legacy)).toBe(1);
  });
});

