const Datastore = require('nedb-promises');
const path      = require('path');
const fs        = require('fs');

// database.js lives at server/db/database.js
// ../data  →  server/data  ✓
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

// Two collections: users and print jobs
const db = {
  users: Datastore.create({
    filename: path.join(dataDir, 'users.db'),
    autoload: true
  }),
  jobs: Datastore.create({
    filename: path.join(dataDir, 'jobs.db'),
    autoload: true
  })
};

module.exports = db;
