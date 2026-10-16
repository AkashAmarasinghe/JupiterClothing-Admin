import '../main.js';
import ApexCharts from 'apexcharts';
import { requireAdmin } from '../auth.js';
import { buildDashboardData, watchOrders, summarizeOrders } from '../data-service.js';
import { renderShell } from '../ui-shell.js';
import { escapeHtml, formatCurrency, formatDate, statusBadge } from '../utils.js';

const user = await requireAdmin();
const page = renderShell({
  pageTitle: 'Dashboard',
  pageSubtitle: 'Overview of products, customers, revenue and payment-based orders.',
  activePage: 'index.html',
  user
});

page.innerHTML = `
  <div id="dataWarning"></div>
  <div class="row g-3 mb-4" id="statsRow">
    <div class="col-12"><div class="card border-0 shadow-sm"><div class="card-body text-secondary"><span class="spinner-border spinner-border-sm me-2"></span>loading...</div></div></div>
  </div>
  <div class="row g-3 mb-4">
    <div class="col-lg-8"><div class="card border-0 shadow-sm"><div class="card-body"><div class="d-flex justify-content-between align-items-center mb-3"><h2 class="h5 mb-0">Last 7 days revenue</h2><span class="small text-secondary">Live Firebase payment records</span></div><div id="salesChart"></div></div></div></div>
    <div class="col-lg-4"><div class="card border-0 shadow-sm h-100"><div class="card-body"><h2 class="h5 mb-3">Orders by status</h2><div id="statusChart"></div></div></div></div>
  </div>
  <div class="card border-0 shadow-sm">
    <div class="card-body">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <div><h2 class="h5 mb-0">Recent payments</h2><div id="paymentSourceState" class="small text-secondary mt-1">Connecting to Firestore...</div></div>
        <a href="orders.html" class="btn btn-outline-dark btn-sm">Open orders</a>
      </div>
      <div class="table-responsive"><table class="table align-middle"><thead><tr><th>Payment ID</th><th>Customer</th><th>Status</th><th>Total</th><th>Date</th></tr></thead><tbody id="recentOrdersBody"><tr><td colspan="5" class="text-center text-secondary py-5">Loading payments...</td></tr></tbody></table></div>
    </div>
  </div>
`;

let dashboardData = await buildDashboardData();
let salesChart = null;
let statusChart = null;
renderDashboard(dashboardData);

// Keep payment figures and the recent-payment table live after a customer pays.
watchOrders(
  (orders) => {
    dashboardData = { ...dashboardData, orders, ...summarizeOrders(orders) };
    renderDashboard(dashboardData);
    const state = document.getElementById('paymentSourceState');
    if (state) state.textContent = `Live • ${orders.length} payment record${orders.length === 1 ? '' : 's'}`;
  },
  (error) => {
    console.error('[Jupiter Admin] Live payment listener failed:', error);
    const state = document.getElementById('paymentSourceState');
    if (state) state.innerHTML = '<span class="text-danger">Could not read payments. Check Firestore rules.</span>';
    renderWarnings([...(dashboardData.errors || []), { source: 'live payments', message: friendlyError(error) }]);
  }
);

function renderDashboard(data) {
  renderWarnings(data.errors || []);

  const stats = [
   
    ['Total Payments', String(data.orders.length), 'ti-package', 'primary'],
    ['Revenue', formatCurrency(data.totalRevenue), 'ti-cash-banknote', 'success'],
    ['Completed', String(data.completedOrders), 'ti-circle-check', 'warning']
  ];

  document.getElementById('statsRow').innerHTML = stats.map(([label, value, icon, tone]) => `
    <div class="col-lg-4 col-md-6">
      <div class="card border-0 shadow-sm stat-card h-100">
        <div class="card-body d-flex align-items-center gap-3">
          <div class="icon-shape icon-md bg-${tone} bg-opacity-10 text-${tone} rounded-3"><i class="ti ${icon}"></i></div>
          <div><div class="small text-secondary mb-1">${label}</div><div class="h4 mb-0">${value}</div></div>
        </div>
      </div>
    </div>
  `).join('');

  if (salesChart) salesChart.destroy();
  salesChart = new ApexCharts(document.querySelector('#salesChart'), {
    chart: { type: 'area', height: 320, toolbar: { show: false }, animations: { enabled: true } },
    series: [{ name: 'Revenue', data: data.dailySales.map((item) => item.total) }],
    xaxis: { categories: data.dailySales.map((item) => item.date) },
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth' },
    noData: { text: 'No payment data yet' },
    yaxis: { labels: { formatter: (value) => formatCurrency(value) } },
    tooltip: { y: { formatter: (value) => formatCurrency(value) } }
  });
  salesChart.render();

  if (statusChart) statusChart.destroy();
  statusChart = new ApexCharts(document.querySelector('#statusChart'), {
    chart: { type: 'donut', height: 300 },
    series: data.ordersByStatus.map((item) => item.count),
    labels: data.ordersByStatus.map((item) => item.status),
    noData: { text: 'No orders yet' },
    legend: { position: 'bottom' }
  });
  statusChart.render();

  document.getElementById('recentOrdersBody').innerHTML = data.orders.slice(0, 8).map((order) => `
    <tr>
      <td class="fw-semibold">${escapeHtml(order.paymentCode || order.orderId || order.id || '-')}</td>
      <td>${escapeHtml(order.user?.name || order.user?.fullName || order.user?.email || order.userId || 'Customer')}</td>
      <td>${statusBadge(order.status || 'completed')}</td>
      <td>${formatCurrency(order.total)}</td>
      <td>${formatDate(order.createdAt || order.createdAtClient)}</td>
    </tr>
  `).join('') || '<tr><td colspan="5" class="text-center text-secondary py-5">No payment records available yet.</td></tr>';
}

function renderWarnings(errors) {
  const target = document.getElementById('dataWarning');
  if (!target) return;
  const unique = [...new Map((errors || []).map((item) => [`${item.source}:${item.message}`, item])).values()];
 
}

function friendlyError(error) {
  const code = String(error?.code || '');
  const message = String(error?.message || error || 'Unknown error');
  if (code.includes('permission-denied') || /permission/i.test(message)) {
    return 'Permission denied by Firestore rules. Use the included firestore.rules.';
  }
  return message;
}
