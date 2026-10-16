import '../main.js';
import ApexCharts from 'apexcharts';
import { requireAdmin } from '../auth.js';
import { buildDashboardData } from '../data-service.js';
import { renderShell } from '../ui-shell.js';
import { escapeHtml, formatCurrency } from '../utils.js';

const user = await requireAdmin();
const page = renderShell({
  pageTitle: 'Reports',
  pageSubtitle: 'Sales and product summaries generated from Firebase data.',
  activePage: 'reports.html',
  user
});

page.innerHTML = `
  <div id="reportsWarning"></div>
  <div class="row g-4 mb-4">
    <div class="col-lg-6"><div class="card border-0 shadow-sm"><div class="card-body"><h2 class="h5 mb-3">Revenue by day</h2><div id="reportSalesChart"></div></div></div></div>
    <div class="col-lg-6"><div class="card border-0 shadow-sm"><div class="card-body"><h2 class="h5 mb-3">Order status breakdown</h2><div id="reportStatusChart"></div></div></div></div>
  </div>
  <div class="card border-0 shadow-sm"><div class="card-body">
    <h2 class="h5 mb-3">Top selling products</h2>
    <div class="table-responsive"><table class="table align-middle"><thead><tr><th>Product</th><th>Sold Count</th><th>Stock</th><th>Price</th></tr></thead><tbody id="topProductsBody"></tbody></table></div>
  </div></div>
`;

const data = await buildDashboardData();
if (data.errors?.length) {
  document.getElementById('reportsWarning').innerHTML = `
    <div class="alert alert-warning border-0 shadow-sm mb-4">
      ${data.errors.map((item) => `<div class="small"><strong>${escapeHtml(item.source)}:</strong> ${escapeHtml(item.message)}</div>`).join('')}
    </div>`;
}

new ApexCharts(document.querySelector('#reportSalesChart'), {
  chart: { type: 'bar', height: 320, toolbar: { show: false } },
  series: [{ name: 'Revenue', data: data.dailySales.map((item) => item.total) }],
  xaxis: { categories: data.dailySales.map((item) => item.date) },
  dataLabels: { enabled: false },
  noData: { text: 'No payment data yet' },
  yaxis: { labels: { formatter: (value) => formatCurrency(value) } },
  tooltip: { y: { formatter: (value) => formatCurrency(value) } }
}).render();

new ApexCharts(document.querySelector('#reportStatusChart'), {
  chart: { type: 'pie', height: 320 },
  series: data.ordersByStatus.map((item) => item.count),
  labels: data.ordersByStatus.map((item) => item.status),
  noData: { text: 'No orders yet' },
  legend: { position: 'bottom' }
}).render();

const topProducts = [...data.products].sort((a, b) => Number(b.soldCount || 0) - Number(a.soldCount || 0)).slice(0, 8);
document.getElementById('topProductsBody').innerHTML = topProducts.map((product) => `
  <tr>
    <td>${escapeHtml(product.name || product.title || product.id)}</td>
    <td>${product.soldCount || 0}</td>
    <td>${product.stock ?? product.stockCount ?? 0}</td>
    <td>${formatCurrency(product.price)}</td>
  </tr>
`).join('') || '<tr><td colspan="4" class="text-center text-secondary py-5">No products available.</td></tr>';
