// server.js – TREDT Union File Management System Backend

const express = require('express');
const multer = require('multer');
const nodemailer = require('nodemailer');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// SQLite Setup
const dbPath = process.env.SQLITE_DB_PATH || path.join(__dirname, 'db.sqlite3');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening DB:', err);
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

// Multer Setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const type = req.body.type === 'private' ? 'uploads/private' : 'uploads/public';
    cb(null, type);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}_${file.originalname}`);
  }
});
const upload = multer({ storage });

// Email Setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.ADMIN_EMAIL,
    pass: process.env.ADMIN_PASS
  }
});

// API: Upload File
app.post('/api/upload', upload.single('file'), (req, res) => {
  const { title, description, tags, type } = req.body;
  const filename = req.file.filename;

  db.run(`INSERT INTO files (title, description, filename, tags, type) VALUES (?, ?, ?, ?, ?)`,
    [title, description, filename, tags, type],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'File uploaded', fileId: this.lastID });
    });
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

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: 'Request sent successfully' });
  });
});

// API: Download File
app.get('/api/files/download/:id', (req, res) => {
  const id = req.params.id;
  db.get(`SELECT * FROM files WHERE id = ?`, [id], (err, row) => {
    if (err || !row) return res.status(404).json({ error: 'File not found' });

    const filepath = path.join(__dirname, 'uploads', row.type, row.filename);
    res.download(filepath);
  });
});


// Start Server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
app.get('/', (req, res) => {
  res.send('✅ TREDT Union File Management Backend is Live');
});
