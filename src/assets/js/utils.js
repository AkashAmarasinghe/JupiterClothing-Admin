import { CURRENCY } from './firebase-config.js';

export function formatCurrency(value = 0) {
  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: CURRENCY,
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

export function formatDate(value) {
  if (!value) return '-';
  const date = value?.toDate ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('en-LK', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
}

export function statusBadge(status = 'placed') {
  const normalized = String(status || 'placed').toLowerCase();
  const map = {
    placed: 'warning',
    pending: 'warning',
    processing: 'info',
    completed: 'success',
    paid: 'success',
    success: 'success',
    delivered: 'success',
    failed: 'danger',
    declined: 'danger',
    cancelled: 'secondary',
    canceled: 'secondary'
  };
  return `<span class="badge text-bg-${map[normalized] || 'secondary'} text-capitalize">${escapeHtml(normalized.replaceAll('_', ' '))}</span>`;
}

export function initials(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean).slice(0, 2);
  if (!parts.length) return 'A';
  return parts.map((part) => part[0].toUpperCase()).join('');
}

export function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function slugify(value = '') {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function setButtonLoading(button, loading, label = 'Save') {
  if (!button) return;
  button.disabled = loading;
  button.innerHTML = loading
    ? '<span class="spinner-border spinner-border-sm me-2"></span>Saving...'
    : label;
}
