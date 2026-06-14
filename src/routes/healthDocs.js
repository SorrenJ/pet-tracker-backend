const express = require('express');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { pool } = require('../config/database');
const auth = require('../middleware/auth');

const router = express.Router();

// PLACEHOLDER: Swap this local disk storage for a cloud provider (S3, GCS, Cloudinary, etc.)
// When you do, replace `storage` with multer-s3 or memoryStorage + SDK upload,
// and replace `fileUrl` construction with the cloud object URL.
const uploadDir = path.join(__dirname, '..', '..', 'uploads', 'health-docs');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`),
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(Object.assign(new Error('Only images and PDFs are allowed'), { status: 415 }));
  },
});

const VALID_CATEGORIES = ['vet_record', 'prescription', 'billing', 'other'];

async function ownsPet(petId, userId) {
  const { rows } = await pool.query(
    'SELECT id FROM pets WHERE id = $1 AND user_id = $2',
    [petId, userId]
  );
  return rows[0];
}

function fileUrl(req, filePath) {
  if (!filePath) return null;
  // PLACEHOLDER: return cloud storage URL here instead
  return `${req.protocol}://${req.get('host')}/uploads/health-docs/${path.basename(filePath)}`;
}

function formatDoc(row, req) {
  return {
    id: row.id,
    petId: row.pet_id,
    category: row.category,
    name: row.name,
    date: row.date,
    fileUrl: fileUrl(req, row.file_path),
    fileType: row.file_type,
    fileName: row.file_name,
    notes: row.notes,
    amount: row.amount,
    createdAt: row.created_at,
  };
}

// GET /api/health-docs?petId=
router.get('/', auth, async (req, res, next) => {
  try {
    const { petId } = req.query;
    if (!petId) return res.status(400).json({ error: 'petId query param required' });
    if (!await ownsPet(petId, req.user.id)) return res.status(404).json({ error: 'Pet not found' });

    const { rows } = await pool.query(
      'SELECT * FROM health_documents WHERE pet_id = $1 ORDER BY date DESC',
      [petId]
    );
    res.json(rows.map(r => formatDoc(r, req)));
  } catch (err) { next(err); }
});

// POST /api/health-docs  (multipart/form-data; file field = "file")
router.post('/', auth, upload.single('file'), async (req, res, next) => {
  try {
    const { petId, category, name, date, notes, amount } = req.body;
    if (!petId || !category || !name || !date) {
      return res.status(400).json({ error: 'petId, category, name, and date are required' });
    }
    if (!VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({ error: `category must be one of: ${VALID_CATEGORIES.join(', ')}` });
    }
    if (!await ownsPet(petId, req.user.id)) return res.status(404).json({ error: 'Pet not found' });

    const { rows } = await pool.query(
      'INSERT INTO health_documents (id, pet_id, user_id, category, name, date, file_path, file_type, file_name, notes, amount, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *',
      [
        uuidv4(), petId, req.user.id, category, name, date,
        req.file ? req.file.path : null,
        req.file ? req.file.mimetype : null,
        req.file ? req.file.originalname : null,
        notes || null,
        amount != null ? parseFloat(amount) : null,
        new Date().toISOString(),
      ]
    );

    res.status(201).json(formatDoc(rows[0], req));
  } catch (err) { next(err); }
});

// PUT /api/health-docs/:id  (multipart/form-data; file field = "file", optional)
router.put('/:id', auth, upload.single('file'), async (req, res, next) => {
  try {
    const existing = await pool.query(
      'SELECT * FROM health_documents WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    const row = existing.rows[0];
    if (!row) return res.status(404).json({ error: 'Document not found' });

    const { category, name, date, notes, amount } = req.body;

    if (category && !VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({ error: `category must be one of: ${VALID_CATEGORIES.join(', ')}` });
    }

    let filePath = row.file_path;
    let fileType = row.file_type;
    let fileName = row.file_name;

    if (req.file) {
      // Delete old local file (PLACEHOLDER: delete from cloud storage instead)
      if (row.file_path && fs.existsSync(row.file_path)) {
        fs.unlinkSync(row.file_path);
      }
      filePath = req.file.path;
      fileType = req.file.mimetype;
      fileName = req.file.originalname;
    }

    const { rows } = await pool.query(
      'UPDATE health_documents SET category = $1, name = $2, date = $3, file_path = $4, file_type = $5, file_name = $6, notes = $7, amount = $8 WHERE id = $9 RETURNING *',
      [
        category ?? row.category,
        name ?? row.name,
        date ?? row.date,
        filePath, fileType, fileName,
        notes !== undefined ? notes : row.notes,
        amount !== undefined ? parseFloat(amount) : row.amount,
        row.id,
      ]
    );

    res.json(formatDoc(rows[0], req));
  } catch (err) { next(err); }
});

// DELETE /api/health-docs/:id
router.delete('/:id', auth, async (req, res, next) => {
  try {
    const existing = await pool.query(
      'SELECT * FROM health_documents WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    const row = existing.rows[0];
    if (!row) return res.status(404).json({ error: 'Document not found' });

    // Delete local file (PLACEHOLDER: delete from cloud storage instead)
    if (row.file_path && fs.existsSync(row.file_path)) {
      fs.unlinkSync(row.file_path);
    }

    await pool.query('DELETE FROM health_documents WHERE id = $1', [row.id]);
    res.status(204).end();
  } catch (err) { next(err); }
});

module.exports = router;
