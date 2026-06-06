require('dotenv').config();
const express    = require('express');
const session    = require('express-session');
const passport   = require('passport');
const cors       = require('cors');
const path       = require('path');
const fs         = require('fs');

// ── Warn if critical env vars are missing ──────────────────
if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  console.error('\n❌  ERROR: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set in .env\n');
  process.exit(1);
}
if (!process.env.OWNER_EMAIL) {
  console.error('\n❌  ERROR: OWNER_EMAIL must be set in .env\n');
  process.exit(1);
}

// Load passport strategy
require('./middleware/passport');

// Load routes
const authRoutes   = require('./routes/auth');
const uploadRoutes = require('./routes/upload');
const queueRoutes  = require('./routes/queue');

const app     = express();
app.set('trust proxy', 1);
const PORT    = process.env.PORT || 5000;
// The live Render URL — set this in your Render env vars
const APP_URL = process.env.APP_URL || 'http://localhost:5000';

// ── Make sure uploads and data folders exist ───────────────
['uploads', 'data'].forEach(dir => {
  const p = path.join(__dirname, dir);
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
});

// ── CORS ───────────────────────────────────────────────────
// In production frontend and backend are on the same origin,
// so CORS is only needed for local dev (localhost:5173)
app.use(cors({
  origin: ['http://localhost:5173', APP_URL],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Session ────────────────────────────────────────────────
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: APP_URL.startsWith('https'),  // true on Render (HTTPS), false locally
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000
  }
}));

app.use(passport.initialize());
app.use(passport.session());

// ── API Routes ─────────────────────────────────────────────
app.use('/auth',       authRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/queue',  queueRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date() });
});

// ── Serve built React frontend ─────────────────────────────
// After running `npm run build` in client/, the dist/ folder
// is copied to server/public/ — Express serves it as static files
const clientBuild = path.join(__dirname, 'public');
if (fs.existsSync(clientBuild)) {
  app.use(express.static(clientBuild));
  // Any route not matched above returns index.html (React Router handles it)
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientBuild, 'index.html'));
  });
}

// ── Start ──────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🖨️  PrintDrop running at ${APP_URL}  (port ${PORT})\n`);
});
