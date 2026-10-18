// ─────────────────────────────────────────────────────────────────────────────
// invoice.js  —  Invoice line-item model (single source of truth)
// Used by the Invoices page, invoice displays, and the PDF generator so every
// surface agrees on what an invoice contains and what it totals.
// ─────────────────────────────────────────────────────────────────────────────

/** Rounds to 2 decimal places to keep stored money values exact. */
export const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

let seq = 0;

/** Creates a blank editable line item (form-shaped: `rate` may be a string). */
export function createLineItem(overrides = {}) {
  seq += 1;
  return {
    id: `li_${Date.now().toString(36)}_${seq.toString(36)}`,
    description: '',
    quantity: 1,
    rate: '',
    ...overrides,
  };
}

/** Quantity × rate for a form-shaped or stored line item. */
export function lineItemAmount(item) {
  if (!item) return 0;
  // A stored item may already carry a derived `amount`; prefer recomputing.
  return round2((Number(item.quantity) || 0) * (Number(item.rate) || 0));
}

/**
 * Cleans form rows into storable line items: drops empty rows, coerces numbers,
 * and stamps the derived `amount`.
 */
export function normalizeLineItems(items = []) {
  return (Array.isArray(items) ? items : [])
    .filter((it) => {
      if (!it) return false;
      const hasDescription = String(it.description || '').trim() !== '';
      const hasValue = Number(it.rate) > 0;
      return hasDescription || hasValue;
    })
    .map((it) => {
      const quantity = Number(it.quantity) || 0;
      const rate = round2(it.rate);
      return {
        id: it.id || createLineItem().id,
        description: String(it.description || '').trim(),
        quantity,
        rate,
        amount: round2(quantity * rate),
      };
    });
}

/** Sum of line items, falling back to the legacy flat `amount` field. */
export function invoiceTotal(invoice) {
  if (!invoice) return 0;
  const items = Array.isArray(invoice.line_items) ? invoice.line_items : [];
  if (items.length > 0) {
    return round2(items.reduce((sum, it) => sum + lineItemAmount(it), 0));
  }
  return round2(invoice.amount);
}

/**
 * Line items for rendering. Invoices created before line items existed are
 * represented as a single synthetic row so old and new invoices look identical.
 */
export function invoiceLineItems(invoice) {
  const items = Array.isArray(invoice?.line_items) ? invoice.line_items : [];
  if (items.length > 0) return items;

  const amount = round2(invoice?.amount);
  if (!amount) return [];

  const label = invoice?.project
    ? `Professional Services: ${invoice.project}`
    : 'Professional Services';

  return [{
    id: `${invoice?.id || 'invoice'}_legacy`,
    description: label,
    quantity: 1,
    rate: amount,
    amount,
  }];
}

/** Number of billable rows — drives the "N items" affordance in tables. */
export function invoiceItemCount(invoice) {
  return invoiceLineItems(invoice).length;
}
