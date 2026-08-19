const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'portal.db');

let db = null;
let dbReady = null;

function initDb() {
  if (dbReady) return dbReady;

  dbReady = new Promise(async (resolve, reject) => {
    try {
      const SQL = await initSqlJs();

      // Load existing DB file if exists
      if (fs.existsSync(DB_PATH)) {
        const fileBuffer = fs.readFileSync(DB_PATH);
        db = new SQL.Database(fileBuffer);
      } else {
        db = new SQL.Database();
      }

      // Enable WAL-like performance with pragma
      db.run('PRAGMA journal_mode = WAL;');
      db.run('PRAGMA foreign_keys = ON;');

      // Create tables
      db.run(`
        CREATE TABLE IF NOT EXISTS clients (
          clientId TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          pan TEXT,
          email TEXT,
          phone TEXT,
          city TEXT,
          segment TEXT,
          status TEXT DEFAULT 'ACTIVE',
          joinDate TEXT,
          dematAccountNo TEXT,
          updatedAt TEXT DEFAULT (datetime('now'))
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS trades (
          tradeId TEXT PRIMARY KEY,
          clientId TEXT NOT NULL,
          symbol TEXT,
          exchange TEXT,
          segment TEXT,
          tradeType TEXT,
          quantity INTEGER,
          price REAL,
          totalValue REAL,
          brokerage REAL,
          tradeDate TEXT,
          tradeTime TEXT,
          settlementDate TEXT,
          status TEXT DEFAULT 'EXECUTED',
          updatedAt TEXT DEFAULT (datetime('now'))
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS employees (
          employeeId TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT,
          designation TEXT,
          department TEXT,
          role TEXT DEFAULT 'EMPLOYEE',
          joiningDate TEXT,
          status TEXT DEFAULT 'ACTIVE',
          updatedAt TEXT DEFAULT (datetime('now'))
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS mappings (
          mappingId TEXT PRIMARY KEY,
          employeeId TEXT NOT NULL,
          clientId TEXT NOT NULL,
          assignedDate TEXT,
          updatedAt TEXT DEFAULT (datetime('now'))
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS sync_status (
          id INTEGER PRIMARY KEY,
          entity TEXT NOT NULL,
          status TEXT DEFAULT 'idle',
          lastSyncAt TEXT,
          lastSuccessAt TEXT,
          pagesFetched INTEGER DEFAULT 0,
          totalPages INTEGER DEFAULT 0,
          error TEXT,
          updatedAt TEXT DEFAULT (datetime('now'))
        )
      `);

      // Create indexes
      db.run('CREATE INDEX IF NOT EXISTS idx_trades_clientId ON trades(clientId)');
      db.run('CREATE INDEX IF NOT EXISTS idx_trades_tradeDate ON trades(tradeDate)');
      db.run('CREATE INDEX IF NOT EXISTS idx_trades_clientDate ON trades(clientId, tradeDate)');
      db.run('CREATE INDEX IF NOT EXISTS idx_mappings_employeeId ON mappings(employeeId)');
      db.run('CREATE INDEX IF NOT EXISTS idx_mappings_clientId ON mappings(clientId)');

      // Seed sync_status rows
      const existing = db.exec("SELECT COUNT(*) as c FROM sync_status");
      const count = existing[0]?.values[0]?.[0] || 0;
      if (count === 0) {
        db.run("INSERT INTO sync_status (id, entity, status) VALUES (1, 'clients', 'idle')");
        db.run("INSERT INTO sync_status (id, entity, status) VALUES (2, 'trades', 'idle')");
      }

      saveDb();
      resolve(db);
    } catch (err) {
      reject(err);
    }
  });

  return dbReady;
}

function getDb() {
  if (!db) throw new Error('Database not initialized. Call initDb() first.');
  return db;
}

function saveDb() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

// Helper: run a query and return array of objects with column names
function queryAll(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

// Helper: run a query and return first row as object
function queryOne(sql, params = []) {
  const results = queryAll(sql, params);
  return results[0] || null;
}

// Helper: run a statement (INSERT, UPDATE, DELETE)
function runSql(sql, params = []) {
  db.run(sql, params);
  saveDb(); // persist to disk
}

module.exports = { initDb, getDb, saveDb, queryAll, queryOne, runSql };
