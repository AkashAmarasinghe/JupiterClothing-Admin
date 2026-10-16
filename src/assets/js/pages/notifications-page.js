import '../main.js';
import { requireAdmin } from '../auth.js';
import { fetchUsers, sendNotificationToAll, sendNotificationToSelected } from '../data-service.js';
import { renderShell } from '../ui-shell.js';
import { escapeHtml, setButtonLoading } from '../utils.js';

const user = await requireAdmin();
const page = renderShell({
  pageTitle: 'Notifications',
  pageSubtitle: 'Send promotional or service notifications to all users or selected users.',
  activePage: 'notifications.html',
  user
});

let users = [];
let usersLoadError = null;
try {
  users = await fetchUsers();
} catch (error) {
  console.error('[Jupiter Admin] Notification recipients load failed:', error);
  usersLoadError = error;
}

page.innerHTML = `
 
  <div class="row g-4">
    <div class="col-lg-5">
      <div class="card border-0 shadow-sm"><div class="card-body">
        <h2 class="h5 mb-3">Compose notification</h2>
        <form id="notificationForm" class="d-grid gap-3">
          <div>
            <label class="form-label">Send type</label>
            <select id="sendType" class="form-select">
              <option value="all">All users</option>
              <option value="selected">Selected users</option>
            </select>
          </div>
          <div>
            <label class="form-label">Title</label>
            <input id="notificationTitle" class="form-control" required>
          </div>
          <div>
            <label class="form-label">Message</label>
            <textarea id="notificationMessage" class="form-control" rows="4" required></textarea>
          </div>
          <div id="userPickerWrap" class="d-none">
            <label class="form-label">Select users</label>
            <div class="user-picker" id="userPicker">${users.map((row) => `<label class="list-group-item d-flex gap-2 align-items-center"><input class="form-check-input me-1 selected-user" type="checkbox" value="${row.id}"><span>${escapeHtml(row.name || row.fullName || row.email || row.id)}</span></label>`).join('')}</div>
          </div>
          <button id="notificationSubmitBtn" class="btn btn-primary" type="submit">Send notification</button>
          <div id="notificationAlert"></div>
        </form>
      </div></div>
    </div>
    <div class="col-lg-7">
      <div class="card border-0 shadow-sm"><div class="card-body">
        <h2 class="h5 mb-3">Recipients preview</h2>
        <div class="list-group">${users.map((row) => `<div class="list-group-item"><div class="fw-semibold">${escapeHtml(row.name || row.fullName || 'Customer')}</div><div class="small text-secondary">${escapeHtml(row.email || row.id)}</div></div>`).join('')}</div>
      </div></div>
    </div>
  </div>
`;

const sendType = document.getElementById('sendType');
sendType.addEventListener('change', () => {
  document.getElementById('userPickerWrap').classList.toggle('d-none', sendType.value !== 'selected');
});

document.getElementById('notificationForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const submitBtn = document.getElementById('notificationSubmitBtn');
  const alertBox = document.getElementById('notificationAlert');
  setButtonLoading(submitBtn, true, 'Send notification');
  alertBox.innerHTML = '';

  try {
    const title = document.getElementById('notificationTitle').value.trim();
    const message = document.getElementById('notificationMessage').value.trim();
    if (sendType.value === 'all') {
      await sendNotificationToAll(title, message);
    } else {
      const selected = [...document.querySelectorAll('.selected-user:checked')].map((input) => input.value);
      if (!selected.length) throw new Error('Select at least one user.');
      await sendNotificationToSelected(selected, title, message);
    }
    event.target.reset();
    document.getElementById('userPickerWrap').classList.add('d-none');
    alertBox.innerHTML = '<div class="alert alert-success mb-0">Notification sent successfully.</div>';
  } catch (error) {
    alertBox.innerHTML = `<div class="alert alert-danger mb-0">${error.message}</div>`;
  } finally {
    setButtonLoading(submitBtn, false, 'Send notification');
  }
});
