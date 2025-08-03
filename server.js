// server.js – TREDT Union File Management System Backend (Supabase Version)

const express = require('express');
const multer = require('multer');
const nodemailer = require('nodemailer');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Supabase Setup
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const BUCKET = 'tredt-files';

// Middleware
app.use(cors());
app.use(express.json());

// SQLite Setup
const dbPath = process.env.SQLITE_DB_PATH || path.join(__dirname, 'db.sqlite3');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error opening DB:', err);
  } else {
    console.log('✅ Database opened at:', dbPath);
  }
});

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    filename TEXT NOT NULL,
    tags TEXT,
    type TEXT CHECK(type IN ('public', 'private')),
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
});

// Multer Setup (temp storage)
const upload = multer({ dest: 'temp/' });

// Email Setup
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // upgrade later with STARTTLS
  auth: {
    user: process.env.ADMIN_EMAIL,
    pass: process.env.ADMIN_PASS
  }
});

// API: Upload File to Supabase Bucket
app.post('/api/upload', upload.single('file'), async (req, res) => {
  const { title, description, tags, type } = req.body;
  const clientSecret = req.headers['x-upload-secret'];

  if (clientSecret !== process.env.UPLOAD_SECRET) {
    return res.status(403).json({ error: 'Unauthorized uploader' });
  }

  const file = req.file;
  const buffer = fs.readFileSync(file.path);
  const pathInBucket = `${type}/${Date.now()}_${file.originalname}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(pathInBucket, buffer, {
      contentType: file.mimetype
    });

  fs.unlinkSync(file.path);

  if (error) return res.status(500).json({ error: error.message });

  const publicUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${pathInBucket}`;

  db.run(
    `INSERT INTO files (title, description, filename, tags, type) VALUES (?, ?, ?, ?, ?)`,
    [title, description, publicUrl, tags, type],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'File uploaded', fileId: this.lastID });
    }
  );
});

// API: Get Public Files
app.get('/api/files/public', (req, res) => {
  db.all(`SELECT * FROM files WHERE type='public' ORDER BY uploaded_at DESC`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// API: Search Files
app.get('/api/files/search', (req, res) => {
  const q = `%${req.query.q || ''}%`;
  db.all(`SELECT * FROM files WHERE title LIKE ? OR tags LIKE ?`, [q, q], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// API: Request Private File
app.post('/api/files/request', (req, res) => {
  const { filename, requester, reason } = req.body;

  const mailOptions = {
    from: process.env.ADMIN_EMAIL,
    to: process.env.ADMIN_EMAIL,
    subject: 'TREDT Private File Request',
    text: `User ${requester} requested access to private file: ${filename}\nReason: ${reason}`
  };

  transporter.sendMail(mailOptions, (error) => {
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: 'Request sent successfully' });
  });
});

// API: Download File (redirect to Supabase public URL)
app.get('/api/files/download/:id', (req, res) => {
  const id = req.params.id;
  db.get(`SELECT * FROM files WHERE id = ?`, [id], (err, row) => {
    if (err || !row) return res.status(404).json({ error: 'File not found' });
    res.redirect(row.filename);
  });
});

// Home
app.get('/', (req, res) => {
  res.send('✅ TREDT Union File Management Backend is Live');
});

// Start
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

// API: Delete File by ID
app.delete('/api/files/:id', async (req, res) => {
  const fileId = req.params.id;

  db.get(`SELECT * FROM files WHERE id = ?`, [fileId], async (err, row) => {
    if (err || !row) return res.status(404).json({ error: 'File not found' });

    // Delete from Supabase
    const supabasePath = row.filename.split('/storage/v1/object/public/tredt-files/')[1];
    const { error: delError } = await supabase.storage.from('tredt-files').remove([supabasePath]);

    if (delError) return res.status(500).json({ error: delError.message });

    // Remove from DB
    db.run(`DELETE FROM files WHERE id = ?`, [fileId], function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'File deleted successfully' });
    });
  });
});
