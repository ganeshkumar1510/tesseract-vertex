const CURRENCY_SYMBOLS = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  INR: '₹',
};

export function getCurrencySymbol(currency = 'USD') {
  return CURRENCY_SYMBOLS[currency] || '$';
}

export function formatMoney(amount, currency = 'USD') {
  const n = Number(amount) || 0;
  return `${getCurrencySymbol(currency)}${n.toLocaleString()}`;
}

export function todayISO() {
  return new Date().toISOString().split('T')[0];
}

export function formatAddedDate(createdAt) {
  const d = new Date(createdAt);
  if (!createdAt || Number.isNaN(d.getTime())) return 'Added recently';
  return `Added ${d.toLocaleDateString()}`;
}
