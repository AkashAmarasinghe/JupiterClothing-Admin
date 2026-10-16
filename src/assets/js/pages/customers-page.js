import '../main.js';
import { requireAdmin } from '../auth.js';
import { fetchUsers } from '../data-service.js';
import { renderShell } from '../ui-shell.js';
import { escapeHtml, formatDate, initials } from '../utils.js';

const user = await requireAdmin();
const page = renderShell({
  pageTitle: 'Customers',
  pageSubtitle: 'View customer records stored in Firebase.',
  activePage: 'customers.html',
  user
});

page.innerHTML = `
  <div id="customersAlert"></div>
  <div class="card border-0 shadow-sm"><div class="card-body">
    <div class="d-flex justify-content-between align-items-center mb-3"><h2 class="h5 mb-0">Customer list</h2><span id="customerCount" class="badge text-bg-light">Loading...</span></div>
    <div class="table-responsive"><table class="table align-middle"><thead><tr><th>Customer</th><th>Contact</th><th>Address</th><th>Latest activity</th><th>Unread</th></tr></thead><tbody id="customersBody"><tr><td colspan="5" class="text-center text-secondary py-5">Loading customers...</td></tr></tbody></table></div>
  </div></div>
`;

try {
  const customers = await fetchUsers();
  document.getElementById('customerCount').textContent = `${customers.length} customers`;
  document.getElementById('customersBody').innerHTML = customers.map((customer) => {
    const avatar = customer.profileImageUrl
      ? `<img src="${escapeHtml(customer.profileImageUrl)}" alt="" class="rounded-circle" style="width:44px;height:44px;object-fit:cover;">`
      : `<div class="rounded-circle bg-dark text-white d-inline-flex align-items-center justify-content-center" style="width:44px;height:44px;">${escapeHtml(initials(customer.name || customer.email || 'U'))}</div>`;

    return `
      <tr>
        <td>
          <div class="d-flex align-items-center gap-3">
            ${avatar}
            <div>
              <div class="fw-semibold">${escapeHtml(customer.name || 'Unknown user')}</div>
              <div class="small text-secondary">UID: ${escapeHtml(customer.uid || customer.id || '-')}</div>
            </div>
          </div>
        </td>
        <td>
          <div>${escapeHtml(customer.email || '-')}</div>
          <div class="small text-secondary">${escapeHtml(customer.mobile || '-')}</div>
        </td>
        <td>${escapeHtml(customer.address || '-')}</td>
        <td>
          <div>${formatDate(customer.joinedAt)}</div>
          <div class="small text-secondary">${escapeHtml(customer.latestNotificationTitle || customer.latestNotificationMessage || 'No recent notification')}</div>
        </td>
        <td>${customer.hasUnreadNotifications ? '<span class="badge text-bg-danger">Unread</span>' : '<span class="badge text-bg-light">No</span>'}</td>
      </tr>
    `;
  }).join('') || '<tr><td colspan="5" class="text-center text-secondary py-5">No customers found.</td></tr>';
} catch (error) {
  console.error('[Jupiter Admin] Customers load failed:', error);
  document.getElementById('customerCount').textContent = 'Load error';
  document.getElementById('customersAlert').innerHTML = '<div class="alert alert-danger border-0 shadow-sm">Could not read the Firebase <strong>users</strong> collection. Check the included Firestore rules.</div>';
  document.getElementById('customersBody').innerHTML = `<tr><td colspan="5" class="text-center text-danger py-5">${escapeHtml(error?.message || 'Failed to load customers')}</td></tr>`;
}
