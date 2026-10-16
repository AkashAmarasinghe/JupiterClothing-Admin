import '../main.js';
import { APP_NAME, APP_SUBTITLE } from '../firebase-config.js';
import { listenAuth, isAdmin, loginAdmin } from '../auth.js';

const root = document.getElementById('app');
document.title = `Sign In • ${APP_NAME}`;
root.innerHTML = `
  <div class="container d-flex align-items-center justify-content-center min-vh-100 py-5">
    <div class="card shadow-sm border-0 auth-card auth-surface">
      <div class="card-body p-5">
        <div class="text-center mb-4">
          <img src="./assets/images/jupiter-logo.jpg" alt="Jupiter" class="signin-logo mb-3" />
          <h1 class="h3 mb-2 text-white">${APP_NAME}</h1>
          <p class="text-white-50 mb-0">${APP_SUBTITLE}</p>
          <p class="text-white-50 mt-3 mb-0">Sign in with the single admin account to manage products, categories, customers, revenue and read-only orders.</p>
        </div>

        <form id="loginForm" class="d-grid gap-3 mt-4">
          <div>
            <label class="form-label text-white">Email address</label>
            <input id="email" type="email" class="form-control form-control-lg" placeholder="jupiter@gmail.com" required>
          </div>
          <div>
            <label class="form-label text-white">Password</label>
            <input id="password" type="password" class="form-control form-control-lg" placeholder="Enter your password" required>
          </div>
          <button id="loginBtn" class="btn btn-light w-100 btn-lg fw-semibold" type="submit">Sign in</button>
          <div id="loginAlert"></div>
        </form>
      </div>
    </div>
  </div>
`;

listenAuth((user) => {
  if (user && isAdmin(user)) {
    window.location.href = 'index.html';
  }
});

const form = document.getElementById('loginForm');
const alertBox = document.getElementById('loginAlert');
const loginBtn = document.getElementById('loginBtn');

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  alertBox.innerHTML = '';
  loginBtn.disabled = true;
  loginBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Signing in...';

  try {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    await loginAdmin(email, password);
    window.location.href = 'index.html';
  } catch (error) {
    alertBox.innerHTML = `<div class="alert alert-danger mt-1 mb-0">${error.message}</div>`;
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = 'Sign in';
  }
});
