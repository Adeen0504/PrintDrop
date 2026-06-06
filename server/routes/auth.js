const express  = require('express');
const passport = require('passport');
const router   = express.Router();

// APP_URL is your Render domain e.g. https://printdrop.onrender.com
// Falls back to localhost for local dev
const APP_URL = process.env.APP_URL || 'http://localhost:5000';

// ── Step 1: Send user to Google login ─────────────────────
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

// ── Step 2: Google redirects back here ────────────────────
router.get('/google/callback',
  passport.authenticate('google', {
    failureRedirect: `${APP_URL}/login?error=auth_failed`
  }),
  (req, res) => {
    // Owner → dashboard, everyone else → upload page
    if (req.user.isOwner) {
      res.redirect(`${APP_URL}/owner`);
    } else {
      res.redirect(`${APP_URL}/upload`);
    }
  }
);

// ── Get current logged-in user ────────────────────────────
router.get('/me', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  res.json({
    name:     req.user.name,
    email:    req.user.email,
    avatar:   req.user.avatar,
    uniqueId: req.user.uniqueId,
    isOwner:  req.user.isOwner
  });
});

// ── Logout ────────────────────────────────────────────────
router.post('/logout', (req, res) => {
  req.logout(err => {
    if (err) return res.status(500).json({ error: 'Logout failed' });
    req.session.destroy();
    res.json({ success: true });
  });
});

module.exports = router;
