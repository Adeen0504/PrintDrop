const express  = require('express');
const passport = require('passport');
const os       = require('os');
const router   = express.Router();

// Detect local IP (same logic as index.js)
function getLocalIP() {
  for (const iface of Object.values(os.networkInterfaces())) {
    for (const net of iface) {
      if (net.family === 'IPv4' && !net.internal) return net.address;
    }
  }
  return 'localhost';
}

// ── Step 1: Send user to Google login ─────────────────────
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

// ── Step 2: Google redirects back here ────────────────────
router.get('/google/callback',
  passport.authenticate('google', {
    failureRedirect: 'http://localhost:5173/login?error=auth_failed'
  }),
  (req, res) => {
    // Detect if request came from mobile (IP) or laptop (localhost)
    const host      = req.headers.host || ''
    const isLocalhost = host.startsWith('localhost')
    const baseURL   = isLocalhost
      ? 'http://localhost:5173'
      : `http://${getLocalIP()}:5173`

    // Owner → dashboard, everyone else → upload page
    if (req.user.isOwner) {
      res.redirect(`${baseURL}/owner`)
    } else {
      res.redirect(`${baseURL}/upload`)
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
