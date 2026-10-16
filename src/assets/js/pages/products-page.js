import '../main.js';
import { requireAdmin } from '../auth.js';
import { uploadImages } from '../cloudinary-service.js';
import { deleteProduct, fetchCategories, fetchProducts, saveProduct } from '../data-service.js';
import { renderShell } from '../ui-shell.js';
import { escapeHtml, formatCurrency, setButtonLoading } from '../utils.js';

const user = await requireAdmin();
const page = renderShell({
  pageTitle: 'Products',
  pageSubtitle: 'Add, edit and remove products. Images upload to Cloudinary and URLs save to Firestore.',
  activePage: 'products.html',
  user
});

page.innerHTML = `
  <div class="row g-4">
    <div class="col-lg-4">
      <div class="card border-0 shadow-sm"><div class="card-body">
        <h2 class="h5 mb-3">Product form</h2>
        <form id="productForm" class="d-grid gap-3">
          <input type="hidden" id="productId">
          <div><label class="form-label">Name</label><input id="productName" class="form-control" required></div>
          <div><label class="form-label">Description</label><textarea id="productDescription" class="form-control" rows="3"></textarea></div>
          <div class="row g-3">
            <div class="col-md-6"><label class="form-label">Price</label><input id="productPrice" type="number" min="0" class="form-control" required></div>
            <div class="col-md-6"><label class="form-label">Stock</label><input id="productStock" type="number" min="0" class="form-control" required></div>
          </div>
          <div><label class="form-label">Category</label><select id="productCategory" class="form-select"><option value="">Select category</option></select></div>
          <div><label class="form-label">Sizes (comma separated)</label><input id="productSizes" class="form-control" placeholder="S, M, L, XL"></div>
          <div><label class="form-label">Image URLs</label><textarea id="productImageUrls" class="form-control" rows="3" placeholder="One URL per line or upload below"></textarea></div>
          <div><label class="form-label">Upload images</label><input id="productImageFiles" type="file" class="form-control" accept="image/*" multiple></div>
          <div id="productUploadHint" class="small text-secondary">You can paste existing URLs, upload multiple files, or use both.</div>
          <div class="row g-3">
            <div class="col-md-6 form-check"><input id="productActive" class="form-check-input" type="checkbox" checked><label class="form-check-label" for="productActive">Active</label></div>
            <div class="col-md-6 form-check"><input id="productPopular" class="form-check-input" type="checkbox"><label class="form-check-label" for="productPopular">Most popular</label></div>
          </div>
          <div class="d-flex gap-2"><button id="productSaveBtn" class="btn btn-dark" type="submit">Save Product</button><button id="productResetBtn" class="btn btn-light" type="button">Reset</button></div>
          <div id="productAlert"></div>
        </form>
      </div></div>
    </div>
    <div class="col-lg-8">
      <div class="card border-0 shadow-sm"><div class="card-body">
        <div class="d-flex justify-content-between align-items-center mb-3"><h2 class="h5 mb-0">Product list</h2><span id="productCount" class="badge text-bg-light"></span></div>
        <div class="table-responsive"><table class="table align-middle"><thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th></th></tr></thead><tbody id="productsBody"></tbody></table></div>
      </div></div>
    </div>
  </div>
`;

let products = [];
let categories = [];
const categorySelect = document.getElementById('productCategory');
try {
  categories = await fetchCategories();
  categorySelect.innerHTML += categories.map((category) => `<option value="${category.id}">${escapeHtml(category.name)}</option>`).join('');
} catch (error) {
  console.error('[Jupiter Admin] Categories load failed on Products page:', error);
  document.getElementById('productAlert').innerHTML = '<div class="alert alert-warning mb-0">Categories could not be loaded. Check Firestore rules.</div>';
}

function collectImageUrls() {
  return document.getElementById('productImageUrls').value
    .split(/\n|,/) 
    .map((item) => item.trim())
    .filter(Boolean);
}

async function loadProducts() {
  try {
    products = await fetchProducts();
    document.getElementById('productCount').textContent = `${products.length} products`;
  document.getElementById('productsBody').innerHTML = products.map((product) => {
    const images = Array.isArray(product.imageUrls) && product.imageUrls.length
      ? product.imageUrls
      : [product.imageUrl].filter(Boolean);
    const preview = images.slice(0, 3).map((url) => `<img src="${escapeHtml(url)}" alt="" />`).join('');
    return `
      <tr>
        <td>
          <div class="d-flex align-items-center gap-3">
            <div class="product-gallery">${preview || '<img src="https://placehold.co/60x60?text=No+Image" alt="" />'}</div>
            <div><div class="fw-semibold">${escapeHtml(product.name || product.title || '')}</div><div class="small text-secondary">${escapeHtml(product.id)}</div></div>
          </div>
        </td>
        <td>${escapeHtml(product.categoryName || '-')}</td>
        <td>${formatCurrency(product.price)}</td>
        <td>${product.stock ?? product.stockCount ?? 0}</td>
        <td>${product.active ? '<span class="badge text-bg-success">Active</span>' : '<span class="badge text-bg-secondary">Hidden</span>'}</td>
        <td class="text-end"><div class="btn-group btn-group-sm"><button class="btn btn-light" data-edit="${product.id}">Edit</button><button class="btn btn-outline-danger" data-delete="${product.id}">Delete</button></div></td>
      </tr>
    `;
  }).join('') || '<tr><td colspan="6" class="text-center text-secondary py-4">No products found.</td></tr>';
  } catch (error) {
    console.error('[Jupiter Admin] Products load failed:', error);
    document.getElementById('productCount').textContent = 'Load error';
    document.getElementById('productsBody').innerHTML = `<tr><td colspan="6" class="text-center text-danger py-4">${escapeHtml(error?.message || 'Failed to load products')}</td></tr>`;
  }
}

await loadProducts();

document.getElementById('productForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const saveBtn = document.getElementById('productSaveBtn');
  const alertBox = document.getElementById('productAlert');
  alertBox.innerHTML = '';
  setButtonLoading(saveBtn, true, 'Save Product');

  try {
    const selectedOption = categorySelect.selectedOptions[0];
    const uploadedFiles = [...document.getElementById('productImageFiles').files];
    const uploadedUrls = await uploadImages(uploadedFiles, 'products');
    const imageUrls = [...collectImageUrls(), ...uploadedUrls];

    const payload = {
      id: document.getElementById('productId').value.trim(),
      name: document.getElementById('productName').value.trim(),
      description: document.getElementById('productDescription').value.trim(),
      price: document.getElementById('productPrice').value,
      stock: document.getElementById('productStock').value,
      categoryId: categorySelect.value,
      categoryName: selectedOption ? selectedOption.textContent : '',
      imageUrls,
      sizes: document.getElementById('productSizes').value,
      active: document.getElementById('productActive').checked,
      mostPopular: document.getElementById('productPopular').checked
    };

    await saveProduct(payload);
    event.target.reset();
    document.getElementById('productId').value = '';
    alertBox.innerHTML = '<div class="alert alert-success mb-0">Product saved successfully.</div>';
    await loadProducts();
  } catch (error) {
    alertBox.innerHTML = `<div class="alert alert-danger mb-0">${error.message}</div>`;
  } finally {
    setButtonLoading(saveBtn, false, 'Save Product');
  }
});

document.getElementById('productResetBtn').addEventListener('click', () => {
  document.getElementById('productForm').reset();
  document.getElementById('productId').value = '';
  document.getElementById('productAlert').innerHTML = '';
});

document.getElementById('productsBody').addEventListener('click', async (event) => {
  const editId = event.target.dataset.edit;
  const deleteId = event.target.dataset.delete;

  if (editId) {
    const product = products.find((item) => item.id === editId);
    if (!product) return;
    const images = Array.isArray(product.imageUrls) && product.imageUrls.length ? product.imageUrls : [product.imageUrl].filter(Boolean);
    document.getElementById('productId').value = product.id;
    document.getElementById('productName').value = product.name || product.title || '';
    document.getElementById('productDescription').value = product.description || '';
    document.getElementById('productPrice').value = product.price || 0;
    document.getElementById('productStock').value = product.stock ?? product.stockCount ?? 0;
    document.getElementById('productCategory').value = product.categoryId || '';
    document.getElementById('productImageUrls').value = images.join('\n');
    document.getElementById('productSizes').value = Array.isArray(product.sizes) ? product.sizes.join(', ') : '';
    document.getElementById('productActive').checked = !!product.active;
    document.getElementById('productPopular').checked = !!product.mostPopular;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (deleteId && confirm('Delete this product?')) {
    await deleteProduct(deleteId);
    await loadProducts();
  }
});
