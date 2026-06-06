const express  = require('express');
const multer   = require('multer');
const path     = require('path');
const fs       = require('fs');
const crypto   = require('crypto');
const { v4: uuidv4 } = require('uuid');
const db       = require('../db/database');

const router = express.Router();

// ── Config ─────────────────────────────────────────────────
const ALLOWED_MIME = {
  'application/pdf': 'pdf',
  'image/jpeg':      'jpg',
  'image/png':       'png',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx'
};
const MAX_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

// ── Multer: save to uploads/ with temp name ────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads')),
  filename:    (req, file, cb) => cb(null, `temp_${uuidv4()}`)
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE_BYTES },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME[file.mimetype]) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Allowed: PDF, JPG, PNG, DOC, DOCX'));
    }
  }
});

// ── Encryption helper ──────────────────────────────────────
// AES-256-CBC: industry standard symmetric encryption
function encryptAndSave(inputPath, outputPath) {
  const key    = crypto.scryptSync(process.env.ENCRYPTION_KEY || 'dev-key', 'pd-salt', 32);
  const iv     = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);

  const data      = fs.readFileSync(inputPath);
  const encrypted = Buffer.concat([iv, cipher.update(data), cipher.final()]);

  fs.writeFileSync(outputPath, encrypted);
  fs.unlinkSync(inputPath); // remove unencrypted original immediately
}

// ── Auth guard ─────────────────────────────────────────────
function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Please sign in first' });
  next();
}

// ── POST /api/upload ───────────────────────────────────────
router.post('/', requireAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const { copies = 1, color = 'bw', orientation = 'portrait', sides = 'single' } = req.body;

    // Clamp copies between 1 and 50
    const numCopies = Math.min(Math.max(parseInt(copies) || 1, 1), 50);

    // Encrypt file and store as <jobId>.enc
    const jobId             = uuidv4();
    const encryptedFilename = `${jobId}.enc`;
    const encryptedPath     = path.join(__dirname, '../uploads', encryptedFilename);

    encryptAndSave(req.file.path, encryptedPath);

    // Save job metadata to DB
    const job = {
      jobId,
      userId:           req.user.googleId,
      userName:         req.user.name,
      userUniqueId:     req.user.uniqueId,
      originalName:     req.file.originalname,
      fileType:         ALLOWED_MIME[req.file.mimetype],
      encryptedFilename,
      fileSize:         req.file.size,
      printOptions:     { copies: numCopies, color, orientation, sides },
      status:           'pending',   // pending → printing → done
      uploadedAt:       new Date().toISOString(),
      completedAt:      null
    };

    await db.jobs.insert(job);

    // Tell user their queue position — fetch and sort in JS (nedb-promises safe)
    const allPending = await db.jobs.find({ status: 'pending' });
    const pending    = allPending.sort((a, b) => new Date(a.uploadedAt) - new Date(b.uploadedAt));
    const position   = pending.findIndex(j => j.jobId === jobId) + 1;

    res.json({ success: true, jobId, position, message: 'Document added to queue.' });

  } catch (err) {
    // Clean up temp file if something went wrong
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    console.error('Upload error:', err.message);
    res.status(500).json({ error: err.message || 'Upload failed' });
  }
});

// ── GET /api/upload/status/:jobId — user checks their job ─
router.get('/status/:jobId', requireAuth, async (req, res) => {
  try {
    const job = await db.jobs.findOne({
      jobId:  req.params.jobId,
      userId: req.user.googleId   // users can only see their own jobs
    });
    if (!job) return res.status(404).json({ error: 'Job not found' });

    // Sort in JS (nedb-promises safe)
    const allPending = await db.jobs.find({ status: 'pending' });
    const pending    = allPending.sort((a, b) => new Date(a.uploadedAt) - new Date(b.uploadedAt));
    const position   = job.status === 'pending'
      ? pending.findIndex(j => j.jobId === job.jobId) + 1
      : null;

    res.json({
      jobId:        job.jobId,
      status:       job.status,
      originalName: job.originalName,
      uploadedAt:   job.uploadedAt,
      completedAt:  job.completedAt,
      position
    });
  } catch (err) {
    console.error('Status error:', err.message);
    res.status(500).json({ error: 'Failed to get status' });
  }
});

// ── GET /api/upload/my-jobs — all jobs for logged-in user ─
router.get('/my-jobs', requireAuth, async (req, res) => {
  try {
    // Fetch then sort in JS (nedb-promises safe)
    const allJobs = await db.jobs.find({ userId: req.user.googleId });
    const jobs    = allJobs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));

    res.json(jobs.map(j => ({
      jobId:        j.jobId,
      originalName: j.originalName,
      status:       j.status,
      printOptions: j.printOptions,
      uploadedAt:   j.uploadedAt,
      completedAt:  j.completedAt
    })));
  } catch (err) {
    console.error('My-jobs error:', err.message);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

module.exports = router;
