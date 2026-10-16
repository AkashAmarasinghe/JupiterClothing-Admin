import '../main.js';
import { requireAdmin } from '../auth.js';
import { renderShell } from '../ui-shell.js';
import { escapeHtml, formatCurrency, formatDate, statusBadge } from '../utils.js';
import { fetchOrders, watchOrders } from '../data-service.js';

const user = await requireAdmin();
const page = renderShell({
  pageTitle: 'Orders',
  pageSubtitle: 'Payment records loaded live from Firebase.',
  activePage: 'orders.html',
  user
});

page.innerHTML = `
  <div id="ordersAlert"></div>
  <div class="card border-0 shadow-sm"><div class="card-body">
    <div class="d-flex justify-content-between align-items-center mb-3"><h2 class="h5 mb-0">Payment orders</h2><span id="ordersCount" class="badge text-bg-light">Loading...</span></div>
    <div class="table-responsive"><table class="table align-middle"><thead><tr><th>Payment ID</th><th>Customer</th><th>Product</th><th>Total</th><th>Status</th><th>Paid at</th></tr></thead><tbody id="ordersBody"><tr><td colspan="6" class="text-center text-secondary py-5">Loading Firebase payments...</td></tr></tbody></table></div>
  </div></div>
`;

const body = document.getElementById('ordersBody');

try {
  renderOrders(await fetchOrders());
} catch (error) {
  showError(error);
}

watchOrders(renderOrders, showError);

function renderOrders(orders) {
  document.getElementById('ordersAlert').innerHTML = '';
  document.getElementById('ordersCount').textContent = `${orders.length} payment${orders.length === 1 ? '' : 's'}`;
  body.innerHTML = orders.map((order) => {
    const item = Array.isArray(order.items) ? order.items[0] : null;
    return `
      <tr>
        <td><div class="fw-semibold">${escapeHtml(order.paymentCode || order.orderId || order.id || '-')}</div><div class="small text-secondary">${escapeHtml(order.paymentMethod || 'Payment recorded')}</div></td>
        <td><div>${escapeHtml(order.user?.name || order.user?.fullName || 'Customer')}</div><div class="small text-secondary">${escapeHtml(order.user?.email || order.userId || '')}</div></td>
        <td><div>${escapeHtml(item?.name || order.productName || order.productId || 'Product')}</div><div class="small text-secondary">${escapeHtml(order.productId || '')}</div></td>
        <td>${formatCurrency(order.total)}</td>
        <td>${statusBadge(order.status)}</td>
        <td>${formatDate(order.createdAt || order.createdAtClient)}</td>
      </tr>
    `;
  }).join('') || '<tr><td colspan="6" class="text-center text-secondary py-5">No payment records available yet.</td></tr>';
}

function showError(error) {
  console.error('[Jupiter Admin] Orders load failed:', error);
  document.getElementById('ordersCount').textContent = 'Load error';
  document.getElementById('ordersAlert').innerHTML = `
    <div class="alert alert-danger border-0 shadow-sm">
      <strong>Firebase payments cannot be read.</strong><br>
      <span class="small">${escapeHtml(readableError(error))}</span>
    </div>`;
  body.innerHTML = '<tr><td colspan="6" class="text-center text-danger py-5">Payment data could not be loaded. Check Firestore rules.</td></tr>';
}

function readableError(error) {
  const code = String(error?.code || '');
  const message = String(error?.message || error || 'Unknown Firebase error');
  return code.includes('permission-denied') || /permission/i.test(message)
    ? 'Permission denied. Deploy/paste the included firestore.rules and keep the admin email matched to firebase-config.js.'
    : message;
}
