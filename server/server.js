import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024, files: 10 } });
const port = Number(process.env.PORT || 8787);
const defaultFolder = process.env.DEFAULT_FOLDER || 'jupiter';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true, message: 'Jupiter upload server running' });
});

app.post('/api/upload', upload.array('images', 10), async (req, res) => {
  try {
    if (!req.files?.length) {
      return res.status(400).json({ error: 'No images were uploaded.' });
    }

    const folderInput = String(req.body.folder || 'products').trim().replace(/^\/+|\/+$/g, '');
    const folder = `${defaultFolder}/${folderInput || 'products'}`;

    const files = [];
    for (const file of req.files) {
      const uploaded = await uploadBuffer(file.buffer, {
        folder,
        resource_type: 'image'
      });
      files.push(uploaded.secure_url);
    }

    res.json({ files });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Upload failed.' });
  }
});

app.listen(port, () => {
  console.log(`Upload server listening on http://localhost:${port}`);
});

function uploadBuffer(buffer, options) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });
    stream.end(buffer);
  });
}
