const express  = require('express');
const path     = require('path');
const fs       = require('fs');
const crypto   = require('crypto');
const db       = require('../db/database');

const router = express.Router();

// ── Auth guards ────────────────────────────────────────────
function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  next();
}
function requireOwner(req, res, next) {
  if (!req.user)        return res.status(401).json({ error: 'Not authenticated' });
  if (!req.user.isOwner) return res.status(403).json({ error: 'Owner access only' });
  next();
}

// ── Decryption helper ──────────────────────────────────────
function decryptFile(encryptedPath) {
  const key       = crypto.scryptSync(process.env.ENCRYPTION_KEY || 'dev-key', 'pd-salt', 32);
  const encrypted = fs.readFileSync(encryptedPath);
  const iv        = encrypted.slice(0, 16);
  const content   = encrypted.slice(16);
  const decipher  = crypto.createDecipheriv('aes-256-cbc', key, iv);
  return Buffer.concat([decipher.update(content), decipher.final()]);
}

// ── GET /api/queue/pending — owner sees FIFO queue ─────────
router.get('/pending', requireOwner, async (req, res) => {
  try {
    const jobs = await db.jobs
      .find({ status: { $in: ['pending', 'printing'] } })
      .sort({ uploadedAt: 1 });   // FIFO: oldest first

    res.json(jobs.map(j => ({
      jobId:        j.jobId,
      userName:     j.userName,
      userUniqueId: j.userUniqueId,
      originalName: j.originalName,
      fileType:     j.fileType,
      fileSize:     j.fileSize,
      printOptions: j.printOptions,
      status:       j.status,
      uploadedAt:   j.uploadedAt
    })));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch queue' });
  }
});

// ── GET /api/queue/completed — last 20 completed jobs ──────
router.get('/completed', requireOwner, async (req, res) => {
  try {
    const jobs = await db.jobs
      .find({ status: 'done' })
      .sort({ completedAt: -1 })
      .limit(20);
    res.json(jobs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch completed jobs' });
  }
});

// ── GET /api/queue/stats — counts for dashboard header ─────
router.get('/stats', requireOwner, async (req, res) => {
  try {
    const [pending, printing, done] = await Promise.all([
      db.jobs.count({ status: 'pending' }),
      db.jobs.count({ status: 'printing' }),
      db.jobs.count({ status: 'done' })
    ]);
    res.json({ pending, printing, done });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ── GET /api/queue/download/:jobId — decrypt and send file ─
router.get('/download/:jobId', requireOwner, async (req, res) => {
  try {
    const job = await db.jobs.findOne({ jobId: req.params.jobId });
    if (!job) return res.status(404).json({ error: 'Job not found' });

    const encPath = path.join(__dirname, '../uploads', job.encryptedFilename);
    if (!fs.existsSync(encPath)) {
      return res.status(404).json({ error: 'File no longer available' });
    }

    // Mark as printing when owner downloads
    await db.jobs.update({ jobId: job.jobId }, { $set: { status: 'printing' } });

    const mimeMap = {
      pdf:  'application/pdf',
      jpg:  'image/jpeg',
      png:  'image/png',
      doc:  'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    };

    const decrypted = decryptFile(encPath);
    res.setHeader('Content-Type', mimeMap[job.fileType] || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${job.originalName}"`);
    res.send(decrypted);

  } catch (err) {
    console.error('Download error:', err.message);
    res.status(500).json({ error: 'Download failed' });
  }
});

// ── PATCH /api/queue/complete/:jobId — mark as printed ─────
router.patch('/complete/:jobId', requireOwner, async (req, res) => {
  try {
    const job = await db.jobs.findOne({ jobId: req.params.jobId });
    if (!job) return res.status(404).json({ error: 'Job not found' });

    await db.jobs.update(
      { jobId: req.params.jobId },
      { $set: { status: 'done', completedAt: new Date().toISOString() } }
    );

    // Schedule encrypted file deletion: random time between 8 and 24 hours
    const deleteAfterMs = (8 + Math.random() * 16) * 60 * 60 * 1000;
    setTimeout(() => {
      const filePath = path.join(__dirname, '../uploads', job.encryptedFilename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`🗑️  Deleted file for job ${job.jobId}`);
      }
    }, deleteAfterMs);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to complete job' });
  }
});

module.exports = router;
