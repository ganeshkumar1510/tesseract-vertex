import { getCurrencySymbol } from './format';
import { invoiceLineItems, invoiceTotal, lineItemAmount } from './invoice';

/**
 * Drafts have no explicit fraction limit — always render cents so client-facing
 * documents look like invoices rather than rounded summaries.
 */
const money = (amount, symbol) =>
  `${symbol}${(Number(amount) || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

// Table geometry (mm)
const MARGIN_LEFT = 20;
const MARGIN_RIGHT = 190;
const DESC_X = 25;
const QTY_X = 140;
const RATE_X = 166;
const AMOUNT_X = 185;
const DESC_MAX_WIDTH = 108;
const TABLE_HEADER_Y = 105;
const TABLE_HEADER_TEXT_Y = 111.5;
const ROWS_START_Y = 125;
const PAGE_BREAK_Y = 262;

/**
 * Generates a branded Tesseract Invoice PDF.
 *
 * Invoices created before line-item support only carry a flat `amount`; those
 * are rendered as a single synthetic row (see `invoiceLineItems`) so old and
 * new invoices produce the same document shape.
 *
 * jsPDF is imported on demand so the ~350 kB library stays out of the initial
 * bundle and only loads the first time a PDF is exported.
 */
export const generateInvoicePDF = async (invoice, freelancer) => {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();
  const currencyCode = invoice.currency_code || freelancer?.currency || 'USD';
  const symbol = getCurrencySymbol(currencyCode);

  const items = invoiceLineItems(invoice);
  const total = invoiceTotal(invoice);

  // ── Branding & Header ───────────────────────────────────────────────────
  // Background rect for header
  doc.setFillColor(0, 0, 0); // Pitch Black
  doc.rect(0, 0, 210, 40, 'F');

  // Ether Violet Accent Line
  doc.setDrawColor(124, 58, 237); // #7C3AED
  doc.setLineWidth(1);
  doc.line(0, 40, 210, 40);

  // Tesseract Logo Text
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.text('VERTEX', 20, 25);

  doc.setFontSize(10);
  doc.setTextColor(113, 113, 122); // Secondary text
  doc.text('EST. 2026 • THE FOCUS OPERATING SYSTEM', 20, 32);

  // Invoice Number (Top Right)
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.text(`INVOICE: ${invoice.id}`, 190, 25, { align: 'right' });

  // ── Freelancer & Client Info ────────────────────────────────────────────
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('FROM:', 20, 55);
  doc.setFont('helvetica', 'normal');
  doc.text([
    freelancer?.name || 'Your Name',
    freelancer?.email || 'yourname@email.com',
    freelancer?.workspace || 'Your Studio'
  ], 20, 62);

  doc.setFont('helvetica', 'bold');
  doc.text('BILL TO:', 120, 55);
  doc.setFont('helvetica', 'normal');
  doc.text([
    invoice.client || 'Client Name',
    invoice.project || 'Project Name',
    'Payment Terms: Net 15'
  ], 120, 62);

  // ── Date Info ────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.text('ISSUED:', 20, 95);
  doc.setFont('helvetica', 'normal');
  doc.text(String(invoice.issued || '—'), 40, 95);

  doc.setFont('helvetica', 'bold');
  doc.text('DUE DATE:', 120, 95);
  doc.setFont('helvetica', 'normal');
  doc.text(String(invoice.due || '—'), 145, 95);

  // ── Table Header ────────────────────────────────────────────────────────
  const drawTableHeader = () => {
    doc.setFillColor(248, 249, 250); // bg-surface Equivalent
    doc.rect(MARGIN_LEFT, TABLE_HEADER_Y, MARGIN_RIGHT - MARGIN_LEFT, 10, 'F');

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.1);
    doc.line(MARGIN_LEFT, TABLE_HEADER_Y, MARGIN_RIGHT, TABLE_HEADER_Y);
    doc.line(MARGIN_LEFT, TABLE_HEADER_Y + 10, MARGIN_RIGHT, TABLE_HEADER_Y + 10);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('DESCRIPTION', DESC_X, TABLE_HEADER_TEXT_Y);
    doc.text('QTY', QTY_X, TABLE_HEADER_TEXT_Y, { align: 'right' });
    doc.text('RATE', RATE_X, TABLE_HEADER_TEXT_Y, { align: 'right' });
    doc.text('AMOUNT', AMOUNT_X, TABLE_HEADER_TEXT_Y, { align: 'right' });
  };

  drawTableHeader();

  // ── Line Items ──────────────────────────────────────────────────────────
  let y = ROWS_START_Y;

  items.forEach((item) => {
    const description = String(item.description || 'Professional services');
    const wrapped = doc.splitTextToSize(description, DESC_MAX_WIDTH);
    const rowHeight = Math.max(9, wrapped.length * 4.5 + 4);

    if (y + rowHeight > PAGE_BREAK_Y) {
      doc.addPage();
      drawTableHeader();
      y = ROWS_START_Y;
    }

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text(wrapped, DESC_X, y);

    const quantity = Number(item.quantity) || 0;
    doc.text(String(quantity), QTY_X, y, { align: 'right' });
    doc.text(money(item.rate, symbol), RATE_X, y, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.text(money(lineItemAmount(item), symbol), AMOUNT_X, y, { align: 'right' });

    y += rowHeight;
  });

  // ── Total ───────────────────────────────────────────────────────────────
  // Keep the total block intact on one page.
  if (y + 25 > 275) {
    doc.addPage();
    y = 60;
  }

  const totalY = y + 6;

  doc.setDrawColor(124, 58, 237);
  doc.setLineWidth(0.5);
  doc.line(120, totalY, MARGIN_RIGHT, totalY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text('TOTAL DUE:', 120, totalY + 10);
  doc.text(money(total, symbol), AMOUNT_X, totalY + 10, { align: 'right' });

  // ── Footer (every page) ─────────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(113, 113, 122);
    doc.text('Generated via VERTEX — Privacy-First Focus OS.', 105, 285, { align: 'center' });
  }

  // SAVE
  doc.save(`${invoice.id}_VERTEX_Invoice.pdf`);
};
