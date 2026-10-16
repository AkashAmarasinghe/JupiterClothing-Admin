import { APP_NAME, APP_SUBTITLE } from './firebase-config.js';
import { initials } from './utils.js';
import { logoutAdmin } from './auth.js';

const menu = [
  ['index.html', 'ti-home', 'Dashboard'],
  ['products.html', 'ti-box-seam', 'Products'],
  ['categories.html', 'ti-category', 'Categories'],
  ['orders.html', 'ti-package', 'Orders'],
  ['customers.html', 'ti-users', 'Customers'],
  ['notifications.html', 'ti-bell-ringing', 'Notifications'],
  ['reports.html', 'ti-chart-bar', 'Reports']
];

export function renderShell({ pageTitle, pageSubtitle = '', activePage, user }) {
  document.title = `${pageTitle} • ${APP_NAME}`;
  const root = document.getElementById('app');
  root.innerHTML = `
    <div id="overlay" class="overlay"></div>
    <nav id="topbar" class="navbar border-bottom fixed-top topbar px-3">
      <button id="toggleBtn" class="d-none d-lg-inline-flex btn btn-outline-light btn-icon btn-sm me-2">
        <i class="ti ti-layout-sidebar-left-expand"></i>
      </button>
      <button id="mobileBtn" class="btn btn-outline-light btn-icon btn-sm d-lg-none me-2">
        <i class="ti ti-layout-sidebar-left-expand"></i>
      </button>
      <div class="d-flex align-items-center gap-3 ms-auto">
        <div class="text-end d-none d-md-block text-white-50">
          <div class="fw-semibold text-white">${user?.displayName || 'Admin User'}</div>
          <div class="small">${user?.email || ''}</div>
        </div>
        <div class="avatar avatar-sm rounded-circle bg-white text-dark">
          <span class="avatar-initials rounded-circle">${initials(user?.displayName || user?.email || 'A')}</span>
        </div>
      </div>
    </nav>

    <aside id="sidebar" class="sidebar">
      <div class="logo-area">
        <img src="./assets/images/jupiter-logo.jpg" alt="Jupiter" class="sidebar-logo" />
        <div class="logo-text">
          <div class="fw-bold text-white">${APP_NAME}</div>
          <div class="small text-white-50">${APP_SUBTITLE}</div>
        </div>
      </div>
      <ul class="nav flex-column py-3">
        <li class="px-4 py-2"><small class="nav-text text-uppercase text-white-50">Management</small></li>
        ${menu.map(([href, icon, label]) => `
          <li><a class="nav-link ${href === activePage ? 'active' : ''}" href="${href}"><i class="ti ${icon}"></i><span class="nav-text">${label}</span></a></li>
        `).join('')}
        <li class="px-4 pt-4 pb-2"><small class="nav-text text-uppercase text-white-50">Account</small></li>
        <li><button id="logoutBtn" class="nav-link w-100 text-start border-0 bg-transparent"><i class="ti ti-logout"></i><span class="nav-text">Log out</span></button></li>
      </ul>
    </aside>

    <main id="content" class="content py-10">
      <div class="container-fluid">
        <div class="mb-4 page-header">
          <h1 class="fs-3 mb-1 text-white">${pageTitle}</h1>
          <p class="text-white-50 mb-0">${pageSubtitle}</p>
        </div>
        <div id="pageContent"></div>
      </div>
    </main>
  `;

  document.getElementById('logoutBtn')?.addEventListener('click', logoutAdmin);
  wireSidebar();
  return document.getElementById('pageContent');
}

function wireSidebar() {
  const sidebar = document.getElementById('sidebar');
  const content = document.getElementById('content');
  const topbar = document.getElementById('topbar');
  const toggleBtn = document.getElementById('toggleBtn');
  const mobileBtn = document.getElementById('mobileBtn');
  const overlay = document.getElementById('overlay');

  toggleBtn?.addEventListener('click', () => {
    sidebar?.classList.toggle('collapsed');
    content?.classList.toggle('full');
    topbar?.classList.toggle('full');
  });

  mobileBtn?.addEventListener('click', () => {
    sidebar?.classList.add('mobile-show');
    overlay?.classList.add('show');
  });

  overlay?.addEventListener('click', () => {
    sidebar?.classList.remove('mobile-show');
    overlay?.classList.remove('show');
  });
}
