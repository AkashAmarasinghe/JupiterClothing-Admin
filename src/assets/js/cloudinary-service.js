import { CLOUDINARY_API_BASE } from './firebase-config.js';

export async function uploadImages(files, folder = 'products') {
  if (!files?.length) return [];

  const formData = new FormData();
  for (const file of files) {
    formData.append('images', file);
  }
  formData.append('folder', folder);

  const response = await fetch(`${CLOUDINARY_API_BASE}/api/upload`, {
    method: 'POST',
    body: formData
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    throw new Error('Cloudinary upload failed. Invalid server response.');
  }

  if (!response.ok) {
    throw new Error(data?.error || 'Cloudinary upload failed.');
  }

  return Array.isArray(data?.files) ? data.files : [];
}
