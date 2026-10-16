import {
  addDoc,
  collection,
  db,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  onSnapshot
} from './firebase.js';
import { slugify } from './utils.js';

const PAYMENT_COLLECTION_CANDIDATES = ['payments', 'payment'];
const ORDER_COLLECTION_CANDIDATES = ['orders', 'order'];

export async function fetchProducts() {
  const snapshot = await getDocs(collection(db, 'products'));
  return snapshot.docs
    .map(mapDoc)
    .map(normalizeProduct)
    .sort((a, b) => compareText(a.name || a.title || a.productId || a.id, b.name || b.title || b.productId || b.id));
}

export async function saveProduct(payload) {
  const id = payload.id || payload.productId || slugify(payload.name) || crypto.randomUUID();
  const imageUrls = Array.isArray(payload.imageUrls)
    ? payload.imageUrls.filter(Boolean)
    : [];

  const sizes = Array.isArray(payload.sizes)
    ? payload.sizes.filter(Boolean)
    : parseSizes(payload.sizes);

  const isActive = payload.active !== false;
  const data = {
    id,
    productId: payload.productId || id,
    name: payload.name,
    title: payload.name,
    description: payload.description || '',
    price: Number(payload.price || 0),
    stock: Number(payload.stock || 0),
    stockCount: Number(payload.stock || 0),
    rating: Number(payload.rating || 0),
    soldCount: Number(payload.soldCount || 0),
    categoryId: payload.categoryId || '',
    categoryName: payload.categoryName || '',
    active: isActive,
    status: isActive,
    mostPopular: !!payload.mostPopular,
    imageUrls,
    images: imageUrls,
    imageUrl: imageUrls[0] || '',
    sizes,
    updatedAt: serverTimestamp()
  };

  await setDoc(doc(db, 'products', id), data, { merge: true });
  return id;
}

export async function deleteProduct(productId) {
  await deleteDoc(doc(db, 'products', productId));
}

export async function fetchCategories() {
  const snapshot = await getDocs(collection(db, 'categories'));
  return snapshot.docs
    .map(mapDoc)
    .map((row) => ({
      ...row,
      id: row.id || row.categoryId || row.category || row.name,
      name: row.name || row.category || row.title || row.id || 'Category'
    }))
    .sort((a, b) => compareText(a.name, b.name));
}

export async function saveCategory(payload) {
  const id = payload.id || slugify(payload.name) || crypto.randomUUID();
  await setDoc(doc(db, 'categories', id), {
    id,
    categoryId: id,
    category: payload.name,
    name: payload.name,
    imageUrl: payload.imageUrl || '',
    updatedAt: serverTimestamp()
  }, { merge: true });

  return id;
}

export async function deleteCategory(categoryId) {
  await deleteDoc(doc(db, 'categories', categoryId));
}

export async function seedDefaultCategories() {
  const defaults = ['Tops', 'Bottoms', 'Outwears', 'Accessories', 'Footwears', 'Tailoring'];
  const existing = await fetchCategories();
  if (existing.length) return;
  for (const name of defaults) {
    await saveCategory({ name });
  }
}

export async function fetchUsers() {
  const snapshot = await getDocs(collection(db, 'users'));
  return snapshot.docs
    .map(mapDoc)
    .map(normalizeUser)
    .sort((a, b) => compareText(a.name || a.email || a.mobile || a.id, b.name || b.email || b.mobile || b.id));
}

export async function fetchOrders() {
  return fetchPaymentsAsOrders();
}

/**
 * Watches the primary `payments` collection in real time. If that collection is
 * empty or unavailable, the loader also checks common legacy order collection
 * names. The optional error callback lets the UI display Firestore rule issues
 * instead of staying blank.
 */
export function watchOrders(callback, onError = () => {}) {
  let active = true;

  const unsubscribe = onSnapshot(
    collection(db, 'payments'),
    async (paymentsSnap) => {
      try {
        const paymentRows = paymentsSnap.docs.map(mapDoc);
        const rows = paymentRows.length
          ? await enrichPayments(paymentRows)
          : await fetchAlternativeOrderCollections();
        if (active) callback(rows);
      } catch (error) {
        if (active) onError(error);
      }
    },
    async (snapshotError) => {
      try {
        // A restrictive ruleset may block `payments` while an older `orders`
        // collection is still readable. Try the fallbacks before surfacing it.
        const rows = await fetchAlternativeOrderCollections();
        if (rows.length) {
          if (active) callback(rows);
          return;
        }
        if (active) onError(snapshotError);
      } catch (fallbackError) {
        if (active) onError(snapshotError || fallbackError);
      }
    }
  );

  return () => {
    active = false;
    unsubscribe();
  };
}

export async function sendNotificationToAll(title, message) {
  const users = await fetchUsers();
  await Promise.all(users.map((user) => pushNotification(user.id, title, message)));
}

export async function sendNotificationToSelected(userIds, title, message) {
  await Promise.all(userIds.map((userId) => pushNotification(userId, title, message)));
}

/**
 * Dashboard reads are intentionally isolated. Previously a single permission
 * error (for example `payments`) rejected Promise.all and left the entire
 * dashboard blank. Now every section can render independently and the page gets
 * an `errors` array with useful diagnostics.
 */
export async function buildDashboardData() {
  const [usersResult, productsResult, categoriesResult, ordersResult] = await Promise.all([
    safeLoad('users', fetchUsers),
    safeLoad('products', fetchProducts),
    safeLoad('categories', fetchCategories),
    safeLoad('payments/orders', fetchPaymentsAsOrders)
  ]);

  const users = usersResult.data;
  const products = productsResult.data;
  const categories = categoriesResult.data;
  const orders = ordersResult.data;
  const summary = summarizeOrders(orders);

  return {
    users,
    products,
    categories,
    orders,
    ...summary,
    errors: [usersResult, productsResult, categoriesResult, ordersResult]
      .filter((result) => result.error)
      .map((result) => ({ source: result.source, message: friendlyFirebaseError(result.error), raw: result.error }))
  };
}

export function summarizeOrders(orders = []) {
  const normalizedOrders = Array.isArray(orders) ? orders : [];
  const totalRevenue = normalizedOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const completedOrders = normalizedOrders.filter((order) => isCompletedStatus(order.status)).length;

  const statusMap = new Map();
  normalizedOrders.forEach((order) => {
    const status = normalizeStatus(order.status);
    statusMap.set(status, (statusMap.get(status) || 0) + 1);
  });

  const ordersByStatus = [...statusMap.entries()].map(([status, count]) => ({ status, count }));
  if (!ordersByStatus.length) ordersByStatus.push({ status: 'completed', count: 0 });

  const dailySalesMap = new Map();
  normalizedOrders.forEach((order) => {
    const millis = toMillis(order.createdAt || order.createdAtClient);
    if (!millis) return;
    const date = new Date(millis);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    dailySalesMap.set(key, (dailySalesMap.get(key) || 0) + Number(order.total || 0));
  });

  // Always return seven labels so ApexCharts has a stable visible canvas even
  // when Firestore currently contains no sales.
  const dailySales = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let offset = 6; offset >= 0; offset -= 1) {
    const day = new Date(today);
    day.setDate(today.getDate() - offset);
    const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
    dailySales.push({ date: key, total: dailySalesMap.get(key) || 0 });
  }

  return { totalRevenue, completedOrders, ordersByStatus, dailySales };
}

async function fetchPaymentsAsOrders() {
  const errors = [];

  for (const collectionName of PAYMENT_COLLECTION_CANDIDATES) {
    try {
      const snapshot = await getDocs(collection(db, collectionName));
      if (snapshot.empty) continue;
      return enrichPayments(snapshot.docs.map((row) => ({ ...mapDoc(row), _sourceCollection: collectionName })));
    } catch (error) {
      errors.push(error);
    }
  }

  // Backward-compatible fallback for earlier builds that stored complete order
  // documents instead of one payment document per product.
  for (const collectionName of ORDER_COLLECTION_CANDIDATES) {
    try {
      const snapshot = await getDocs(collection(db, collectionName));
      if (snapshot.empty) continue;
      return normalizeLegacyOrders(snapshot.docs.map((row) => ({ ...mapDoc(row), _sourceCollection: collectionName })));
    } catch (error) {
      errors.push(error);
    }
  }

  if (errors.length) {
    // If the expected payments collection was blocked by Firestore rules, do
    // not silently pretend there are zero payments just because an alternate
    // collection name happened to be readable-but-empty.
    throw errors[0];
  }
  return [];
}

async function fetchAlternativeOrderCollections() {
  for (const collectionName of ['payment', ...ORDER_COLLECTION_CANDIDATES]) {
    try {
      const snapshot = await getDocs(collection(db, collectionName));
      if (snapshot.empty) continue;
      const rows = snapshot.docs.map((row) => ({ ...mapDoc(row), _sourceCollection: collectionName }));
      return collectionName === 'payment' ? enrichPayments(rows) : normalizeLegacyOrders(rows);
    } catch (_error) {
      // Try the next candidate. The primary listener error is surfaced by the
      // caller if no fallback is readable.
    }
  }
  return [];
}

async function enrichPayments(payments) {
  const userIds = uniqueIds(payments.map((item) => item.userId || item.uid || item.customerId));
  const productIds = uniqueIds(payments.map((item) => item.productId || item.itemId));

  const [userEntries, productEntries] = await Promise.all([
    Promise.all(userIds.map(async (id) => [id, await getDocData('users', id)])),
    Promise.all(productIds.map(async (id) => [id, await getDocData('products', id)]))
  ]);

  const userMap = new Map(userEntries.map(([id, row]) => [id, row ? normalizeUser(row) : null]));
  const productMap = new Map(productEntries.map(([id, row]) => [id, row ? normalizeProduct(row) : null]));

  return payments
    .map((payment) => {
      const userId = payment.userId || payment.uid || payment.customerId || '';
      const productId = payment.productId || payment.itemId || '';
      return normalizePayment(payment, userMap.get(userId), productMap.get(productId));
    })
    .sort((a, b) => toMillis(b.createdAt || b.createdAtClient) - toMillis(a.createdAt || a.createdAtClient));
}

function normalizeLegacyOrders(rows) {
  return rows.map((row) => {
    const rawItems = Array.isArray(row.items) ? row.items : [];
    const total = firstNumber(row.total, row.totalAmount, row.grandTotal, row.amount, row.price, 0);
    const createdAt = resolveCreatedAt(row);
    const customerName = row.customerName || row.userName || row.name || row.customer?.name || 'Customer';
    const customerEmail = row.customerEmail || row.userEmail || row.email || row.customer?.email || '';
    const firstItem = rawItems[0] || {};
    return {
      ...row,
      orderId: row.orderId || row.paymentCode || row.transactionId || row.id,
      status: normalizeStatus(row.status || row.paymentStatus || 'completed'),
      total,
      itemCount: rawItems.length || Number(row.itemCount || 1),
      paymentMethod: row.paymentMethod || row.method || 'Payment recorded',
      createdAt,
      createdAtClient: createdAt,
      user: {
        ...(row.user || row.customer || {}),
        id: row.userId || row.uid || row.customerId || '',
        name: customerName,
        email: customerEmail
      },
      items: rawItems.length ? rawItems : [{
        id: row.productId || firstItem.id || '',
        productId: row.productId || firstItem.productId || firstItem.id || '',
        name: row.productName || firstItem.name || firstItem.title || 'Product',
        title: row.productName || firstItem.title || firstItem.name || 'Product',
        price: firstNumber(firstItem.price, row.price, total),
        imageUrl: firstItem.imageUrl || ''
      }],
      productName: row.productName || firstItem.name || firstItem.title || 'Product'
    };
  }).sort((a, b) => toMillis(b.createdAt || b.createdAtClient) - toMillis(a.createdAt || a.createdAtClient));
}

async function getDocData(collectionName, id) {
  if (!id) return null;
  try {
    const snapshot = await getDoc(doc(db, collectionName, id));
    return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
  } catch (_error) {
    return null;
  }
}

function normalizePayment(payment, user, product) {
  const resolvedUserName = payment.userName
    || payment.customerName
    || user?.name
    || user?.fullName
    || user?.username
    || user?.email
    || 'Customer';
  const resolvedProductName = payment.productName
    || payment.itemName
    || product?.name
    || product?.title
    || product?.productId
    || payment.productId
    || 'Product';
  const resolvedPrice = firstNumber(
    payment.price,
    payment.total,
    payment.amount,
    payment.totalAmount,
    payment.grandTotal,
    product?.price,
    product?.salePrice,
    product?.amount,
    0
  );
  const createdAt = resolveCreatedAt(payment);
  const userId = payment.userId || payment.uid || payment.customerId || user?.id || user?.uid || '';
  const productId = payment.productId || payment.itemId || product?.id || product?.productId || '';

  return {
    ...payment,
    orderId: payment.paymentCode || payment.transactionId || payment.orderId || payment.id,
    status: normalizeStatus(payment.status || payment.paymentStatus || 'completed'),
    total: resolvedPrice,
    itemCount: Number(payment.itemCount || 1),
    paymentMethod: payment.paymentMethod || payment.method || 'PayHere payment',
    createdAt,
    createdAtClient: createdAt,
    user: {
      id: userId,
      ...user,
      name: resolvedUserName,
      email: user?.email || payment.userEmail || payment.email || ''
    },
    items: [
      {
        id: productId,
        productId,
        name: resolvedProductName,
        title: resolvedProductName,
        price: resolvedPrice,
        imageUrl: product?.imageUrl || product?.imageUrls?.[0] || product?.images?.[0] || ''
      }
    ],
    productName: resolvedProductName,
    product: product || null
  };
}

function normalizeUser(user) {
  return {
    ...user,
    id: user.id || user.uid || '',
    uid: user.uid || user.id || '',
    name: user.name || user.fullName || user.username || '',
    email: user.email || '',
    mobile: user.mobile || user.phone || user.phoneNumber || '',
    phone: user.phone || user.mobile || user.phoneNumber || '',
    profileImageUrl: user.profileImageUrl || user.profilePictureUrl || user.getProfileImage || user.getProfileImageUrl || '',
    address: user.address || '',
    joinedAt: user.createdAt || user.createdAtClient || user.joinedDate || user.latestNotificationAtClient || null,
    hasUnreadNotifications: !!user.hasUnreadNotifications
  };
}

function normalizeProduct(product) {
  const imageUrls = normalizeImageUrls(product);
  const isActive = typeof product.active === 'boolean'
    ? product.active
    : typeof product.status === 'boolean'
      ? product.status
      : String(product.status || '').toLowerCase() !== 'inactive';

  return {
    ...product,
    id: product.id || product.productId || '',
    productId: product.productId || product.id || '',
    name: product.name || product.title || '',
    title: product.title || product.name || '',
    description: product.description || '',
    price: firstNumber(product.price, product.amount, product.salePrice, 0),
    stock: Number(product.stock ?? product.stockCount ?? 0),
    stockCount: Number(product.stockCount ?? product.stock ?? 0),
    categoryId: product.categoryId || '',
    categoryName: product.categoryName || product.category || '',
    imageUrls,
    images: imageUrls,
    imageUrl: imageUrls[0] || '',
    active: isActive,
    status: isActive,
    mostPopular: !!product.mostPopular
  };
}

function normalizeImageUrls(product) {
  const candidates = [];

  if (Array.isArray(product.imageUrls)) candidates.push(...product.imageUrls);
  if (Array.isArray(product.images)) candidates.push(...product.images);
  if (product.imageUrl) candidates.push(product.imageUrl);

  return [...new Set(candidates.map((value) => String(value || '').trim()).filter(Boolean))];
}

function firstNumber(...values) {
  for (const value of values) {
    const num = Number(value);
    if (!Number.isNaN(num) && Number.isFinite(num) && num >= 0) {
      return num;
    }
  }
  return 0;
}

function resolveCreatedAt(row) {
  const direct = row.createdAt || row.timestamp || row.paidAt || row.updatedAt || row.createdAtClient;
  if (direct) return direct;
  return createDateTime(row.date || row.paymentDate, row.time || row.paymentTime);
}

function createDateTime(dateValue, timeValue) {
  if (dateValue && timeValue) {
    const combined = new Date(`${dateValue}T${timeValue}`);
    if (!Number.isNaN(combined.getTime())) return combined;
  }
  if (dateValue) {
    const date = dateValue?.toDate ? dateValue.toDate() : new Date(dateValue);
    if (!Number.isNaN(date.getTime())) return date;
  }
  return new Date();
}

function normalizeStatus(status) {
  const normalized = String(status || 'completed').trim().toLowerCase();
  if (['success', 'successful', 'paid', 'approved', 'complete', 'completed'].includes(normalized)) return 'completed';
  if (['pending', 'processing', 'placed'].includes(normalized)) return normalized === 'processing' ? 'pending' : normalized;
  if (['failed', 'declined', 'cancelled', 'canceled'].includes(normalized)) return normalized === 'canceled' ? 'cancelled' : normalized;
  return normalized || 'completed';
}

function isCompletedStatus(status) {
  return normalizeStatus(status) === 'completed';
}

function uniqueIds(values) {
  return [...new Set(values.filter(Boolean))];
}

function parseSizes(value) {
  if (!value) return [];
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function mapDoc(snapshot) {
  return { id: snapshot.id, ...snapshot.data() };
}

function toMillis(value) {
  if (!value) return 0;
  if (typeof value === 'number') return value;
  if (value?.toMillis) return value.toMillis();
  if (value?.toDate) return value.toDate().getTime();
  if (value instanceof Date) return value.getTime();
  return new Date(value).getTime() || 0;
}

function compareText(a, b) {
  return String(a || '').localeCompare(String(b || ''), undefined, { sensitivity: 'base' });
}

async function safeLoad(source, loader) {
  try {
    return { source, data: await loader(), error: null };
  } catch (error) {
    console.error(`[Jupiter Admin] Failed to load ${source}:`, error);
    return { source, data: [], error };
  }
}

function friendlyFirebaseError(error) {
  const code = String(error?.code || '');
  const message = String(error?.message || error || 'Unknown Firebase error');
  if (code.includes('permission-denied') || /permission/i.test(message)) {
    return 'Permission denied by Firestore rules. Deploy/paste the included firestore.rules for the admin account.';
  }
  if (code.includes('unavailable') || /network|offline/i.test(message)) {
    return 'Firebase is temporarily unavailable or the browser is offline.';
  }
  return message;
}

async function pushNotification(userId, title, message) {
  await addDoc(collection(db, 'users', userId, 'notifications'), {
    title,
    message,
    type: 'admin',
    read: false,
    createdAt: serverTimestamp(),
    createdAtClient: new Date()
  });

  await setDoc(doc(db, 'users', userId), {
    latestNotificationTitle: title,
    latestNotificationMessage: message,
    latestNotificationType: 'admin',
    latestNotificationAtClient: new Date(),
    hasUnreadNotifications: true
  }, { merge: true });
}
