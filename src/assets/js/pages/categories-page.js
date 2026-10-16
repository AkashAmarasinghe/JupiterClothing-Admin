import '../main.js';
import { requireAdmin } from '../auth.js';
import { uploadImages } from '../cloudinary-service.js';
import { deleteCategory, fetchCategories, saveCategory, seedDefaultCategories } from '../data-service.js';
import { renderShell } from '../ui-shell.js';
import { escapeHtml, setButtonLoading } from '../utils.js';

const user = await requireAdmin();
const page = renderShell({
  pageTitle: 'Categories',
  pageSubtitle: 'Maintain the category tiles shown in the mobile app.',
  activePage: 'categories.html',
  user
});

page.innerHTML = `
  <div class="row g-4">
    <div class="col-lg-4">
      <div class="card border-0 shadow-sm"><div class="card-body">
        <div class="d-flex justify-content-between align-items-center mb-3">
          <h2 class="h5 mb-0">Category form</h2>
          <button id="seedCategoriesBtn" class="btn btn-sm btn-outline-dark" type="button">Seed defaults</button>
        </div>
        <form id="categoryForm" class="d-grid gap-3">
          <input type="hidden" id="categoryId">
          <div><label class="form-label">Category name</label><input id="categoryName" class="form-control" required></div>
          <div><label class="form-label">Image URL</label><input id="categoryImageUrl" class="form-control"></div>
          <div><label class="form-label">Upload image</label><input id="categoryImageFile" type="file" class="form-control" accept="image/*"></div>
          <div class="d-flex gap-2"><button id="categorySaveBtn" class="btn btn-dark" type="submit">Save Category</button><button id="categoryResetBtn" class="btn btn-light" type="button">Reset</button></div>
          <div id="categoryAlert"></div>
        </form>
      </div></div>
    </div>
    <div class="col-lg-8">
      <div class="card border-0 shadow-sm"><div class="card-body">
        <div class="d-flex justify-content-between align-items-center mb-3"><h2 class="h5 mb-0">Category list</h2><span id="categoryCount" class="badge text-bg-light"></span></div>
        <div class="row g-3" id="categoryGrid"></div>
      </div></div>
    </div>
  </div>
`;

let categories = [];

async function loadCategories() {
  try {
    categories = await fetchCategories();
    document.getElementById('categoryCount').textContent = `${categories.length} categories`;
  document.getElementById('categoryGrid').innerHTML = categories.map((category) => `
    <div class="col-md-6">
      <div class="card border h-100">
        <div class="card-body d-flex gap-3 align-items-center">
          <img src="${escapeHtml(category.imageUrl || 'https://placehold.co/72x72?text=Cat')}" class="rounded category-thumb">
          <div class="flex-grow-1">
            <div class="fw-semibold">${escapeHtml(category.name)}</div>
            <div class="small text-secondary">${escapeHtml(category.id)}</div>
          </div>
          <div class="btn-group btn-group-sm"><button class="btn btn-light" data-edit="${category.id}">Edit</button><button class="btn btn-outline-danger" data-delete="${category.id}">Delete</button></div>
        </div>
      </div>
    </div>
  `).join('') || '<div class="col-12 text-center text-secondary py-5">No categories found.</div>';
  } catch (error) {
    console.error('[Jupiter Admin] Categories load failed:', error);
    document.getElementById('categoryCount').textContent = 'Load error';
    document.getElementById('categoryGrid').innerHTML = `<div class="col-12 text-center text-danger py-5">${escapeHtml(error?.message || 'Failed to load categories')}</div>`;
  }
}

await loadCategories();

document.getElementById('categoryForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const saveBtn = document.getElementById('categorySaveBtn');
  const alertBox = document.getElementById('categoryAlert');
  alertBox.innerHTML = '';
  setButtonLoading(saveBtn, true, 'Save Category');
  try {
    let imageUrl = document.getElementById('categoryImageUrl').value.trim();
    const file = document.getElementById('categoryImageFile').files[0];
    if (file) {
      const [uploadedUrl] = await uploadImages([file], 'categories');
      imageUrl = uploadedUrl || imageUrl;
    }
    const payload = {
      id: document.getElementById('categoryId').value.trim(),
      name: document.getElementById('categoryName').value.trim(),
      imageUrl
    };
    await saveCategory(payload);
    event.target.reset();
    document.getElementById('categoryId').value = '';
    alertBox.innerHTML = '<div class="alert alert-success mb-0">Category saved successfully.</div>';
    await loadCategories();
  } catch (error) {
    alertBox.innerHTML = `<div class="alert alert-danger mb-0">${error.message}</div>`;
  } finally {
    setButtonLoading(saveBtn, false, 'Save Category');
  }
});

document.getElementById('categoryResetBtn').addEventListener('click', () => {
  document.getElementById('categoryForm').reset();
  document.getElementById('categoryId').value = '';
  document.getElementById('categoryAlert').innerHTML = '';
});

document.getElementById('seedCategoriesBtn').addEventListener('click', async () => {
  await seedDefaultCategories();
  await loadCategories();
});

document.getElementById('categoryGrid').addEventListener('click', async (event) => {
  const editId = event.target.dataset.edit;
  const deleteId = event.target.dataset.delete;
  if (editId) {
    const category = categories.find((item) => item.id === editId);
    if (!category) return;
    document.getElementById('categoryId').value = category.id;
    document.getElementById('categoryName').value = category.name || '';
    document.getElementById('categoryImageUrl').value = category.imageUrl || '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  if (deleteId && confirm('Delete this category?')) {
    await deleteCategory(deleteId);
    await loadCategories();
  }
});
