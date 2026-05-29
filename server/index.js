require('dotenv').config();
const express    = require('express');
const session    = require('express-session');
const passport   = require('passport');
const cors       = require('cors');
const path       = require('path');
const fs         = require('fs');
const os         = require('os');

// Load passport strategy
require('./middleware/passport');

// Load routes
const authRoutes   = require('./routes/auth');
const uploadRoutes = require('./routes/upload');
const queueRoutes  = require('./routes/queue');

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Detect local IP automatically ──────────────────────────
function getLocalIP() {
  for (const iface of Object.values(os.networkInterfaces())) {
    for (const net of iface) {
      if (net.family === 'IPv4' && !net.internal) return net.address;
    }
  }
  return 'localhost';
}
const LOCAL_IP = getLocalIP();

// ── Make sure uploads and data folders exist ───────────────
['uploads', 'data'].forEach(dir => {
  const p = path.join(__dirname, dir);
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
});

// ── Middleware ─────────────────────────────────────────────
// Allow requests from both localhost (laptop) and local IP (mobile)
app.use(cors({
  origin: [
    'http://localhost:5173',
    `http://${LOCAL_IP}:5173`
  ],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    maxAge: 24 * 60 * 60 * 1000
  }
}));

app.use(passport.initialize());
app.use(passport.session());

// ── Routes ─────────────────────────────────────────────────
app.use('/auth',        authRoutes);
app.use('/api/upload',  uploadRoutes);
app.use('/api/queue',   queueRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date() });
});

// ── Start ──────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🖨️  PrintDrop is running!\n`);
  console.log(`   💻  Laptop  (owner)  →  http://localhost:5173/owner`);
  console.log(`   📱  Mobile  (user)   →  http://${LOCAL_IP}:5173`);
  console.log(`\n   ⚠️  Both devices must be on the same WiFi\n`);
});
