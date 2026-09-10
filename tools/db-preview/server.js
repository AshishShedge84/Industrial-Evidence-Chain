/**
 * IEC Development Database Preview Server
 * ========================================
 * DEVELOPMENT ONLY — DO NOT DEPLOY TO PRODUCTION
 * Binds to 127.0.0.1:3002 only.
 * READ ONLY — No INSERT, UPDATE, DELETE, or SQL console.
 * Sensitive columns are redacted: password_hash, tokens, secrets.
 * No connection to main IEC frontend (port 3000).
 *
 * DB credentials are read from environment variables — never hardcoded.
 * Required env var: DB_PASSWORD
 * Optional: DB_HOST (default localhost), DB_PORT (default 5433),
 *           DB_NAME (default iec_db), DB_USER (default postgres)
 */
'use strict';

const http = require('http');
const { Pool } = require('pg');
const { URL } = require('url');

// ── Config ────────────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.DB_PREVIEW_PORT || '3002', 10);
const HOST = '127.0.0.1'; // localhost only — never 0.0.0.0

// Credentials read exclusively from environment variables — never stored in source
const DB_PASSWORD = process.env.DB_PASSWORD;
if (!DB_PASSWORD) {
  console.error('');
  console.error('  [IEC DB Preview] ERROR: DB_PASSWORD environment variable is not set.');
  console.error('  Start this server via start.sh / start.bat which prompts for the password,');
  console.error('  or set DB_PASSWORD manually before running:');
  console.error('  export DB_PASSWORD=<your_postgres_password> && node tools/db-preview/server.js');
  console.error('');
  process.exit(1);
}

const DB_CONFIG = {
  host:     process.env.DB_HOST || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5433', 10),
  database: process.env.DB_NAME || 'iec_db',
  user:     process.env.DB_USER || 'postgres',
  password: DB_PASSWORD, // from env only
  max: 5,
  idleTimeoutMillis: 30000,
};

// Columns that must never be revealed in the browser
const REDACTED_COLUMNS = new Set([
  'password_hash',
  'token_hash',
  'token',
  'secret',
  'private_key',
  'api_key',
  'refresh_token',
  'access_token',
]);

// ── Database Pool ─────────────────────────────────────────────────────────────
const pool = new Pool(DB_CONFIG);

pool.on('error', (err) => {
  console.error('[DB] Idle client error:', err.message);
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function redactRow(row) {
  const out = {};
  for (const [col, val] of Object.entries(row)) {
    out[col] = REDACTED_COLUMNS.has(col.toLowerCase()) ? '[REDACTED]' : val;
  }
  return out;
}

function json(res, statusCode, data) {
  const body = JSON.stringify(data);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'X-Robots-Tag': 'noindex, nofollow',
  });
  res.end(body);
}

function html(res, content) {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(content);
}

function isValidTableName(name) {
  // Only allow safe alphanumeric+underscore identifiers to prevent injection
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);
}

// ── API Handlers ──────────────────────────────────────────────────────────────

async function handleStatus(res) {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT current_database(), version()');
    client.release();
    json(res, 200, {
      status: 'connected',
      database: result.rows[0].current_database,
      host: DB_CONFIG.host,
      port: DB_CONFIG.port,
      version: result.rows[0].version.split(' ')[0] + ' ' + result.rows[0].version.split(' ')[1],
    });
  } catch (err) {
    json(res, 500, { status: 'error', error: err.message });
  }
}

async function handleTables(res) {
  try {
    const client = await pool.connect();

    // Get all user tables with row counts
    const tablesResult = await client.query(`
      SELECT
        t.table_name,
        (SELECT reltuples::bigint FROM pg_class WHERE relname = t.table_name) AS row_count,
        obj_description(c.oid) AS description
      FROM information_schema.tables t
      JOIN pg_class c ON c.relname = t.table_name
      WHERE t.table_schema = 'public'
        AND t.table_type = 'BASE TABLE'
      ORDER BY t.table_name
    `);

    // Get accurate row counts in parallel for small tables
    const tables = await Promise.all(tablesResult.rows.map(async (row) => {
      try {
        if (!isValidTableName(row.table_name)) return row;
        const countRes = await client.query(`SELECT COUNT(*) as c FROM "${row.table_name}"`);
        return { ...row, row_count: parseInt(countRes.rows[0].c, 10) };
      } catch {
        return { ...row, row_count: null };
      }
    }));

    client.release();
    json(res, 200, { tables });
  } catch (err) {
    json(res, 500, { error: err.message });
  }
}

async function handleTableData(res, tableName, query) {
  if (!isValidTableName(tableName)) {
    return json(res, 400, { error: 'Invalid table name.' });
  }

  const page   = Math.max(1, parseInt(query.get('page')  ?? '1',    10));
  const limit  = Math.min(100, parseInt(query.get('limit') ?? '50', 10));
  const search = query.get('search') ?? '';
  const offset = (page - 1) * limit;

  try {
    const client = await pool.connect();

    // Get columns for this table
    const colRes = await client.query(
      `SELECT column_name, data_type
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = $1
       ORDER BY ordinal_position`,
      [tableName]
    );

    const columns = colRes.rows.map(r => r.column_name);
    const types   = colRes.rows.reduce((acc, r) => {
      acc[r.column_name] = r.data_type;
      return acc;
    }, {});

    // Build search condition across text-type columns (skip redacted)
    let whereClause = '';
    const params = [];
    if (search.trim().length > 0) {
      const textCols = colRes.rows
        .filter(c =>
          !REDACTED_COLUMNS.has(c.column_name.toLowerCase()) &&
          (c.data_type.includes('text') || c.data_type.includes('char') || c.data_type === 'uuid')
        )
        .map(c => c.column_name);

      if (textCols.length > 0) {
        const conditions = textCols.map((col, i) => {
          params.push(`%${search}%`);
          return `"${col}"::text ILIKE $${i + 1}`;
        });
        whereClause = `WHERE ${conditions.join(' OR ')}`;
      }
    }

    // Count
    const countRes = await client.query(
      `SELECT COUNT(*) as c FROM "${tableName}" ${whereClause}`,
      params
    );
    const total = parseInt(countRes.rows[0].c, 10);

    // Data (paginated)
    params.push(limit, offset);
    const dataRes = await client.query(
      `SELECT * FROM "${tableName}" ${whereClause} LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    client.release();

    const rows = dataRes.rows.map(redactRow);

    json(res, 200, {
      tableName,
      columns,
      types,
      rows,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    json(res, 500, { error: err.message });
  }
}

// ── HTML Dashboard ─────────────────────────────────────────────────────────────

function serveDashboard(res) {
  const page = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>IEC DB Preview — Dev Console</title>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet"/>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --bg: #0a0a0f;
      --bg2: #12121a;
      --panel: rgba(255,255,255,0.04);
      --border: rgba(255,255,255,0.08);
      --accent: #6366f1;
      --accent2: #8b5cf6;
      --green: #10b981;
      --red: #ef4444;
      --yellow: #f59e0b;
      --text: #e2e8f0;
      --text2: #94a3b8;
      --text3: #64748b;
      --mono: 'JetBrains Mono', monospace;
      --sans: 'Inter', -apple-system, sans-serif;
    }
    html, body { height: 100%; background: var(--bg); color: var(--text); font-family: var(--sans); font-size: 14px; }
    body { display: flex; flex-direction: column; }

    /* ── Header ── */
    .header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 0 24px; height: 56px; flex-shrink: 0;
      background: var(--bg2); border-bottom: 1px solid var(--border);
      position: sticky; top: 0; z-index: 100;
    }
    .header-brand { display: flex; align-items: center; gap: 10px; }
    .header-logo {
      width: 30px; height: 30px; border-radius: 8px;
      background: linear-gradient(135deg, var(--accent), var(--accent2));
      display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: 13px; color: white; letter-spacing: -0.5px;
    }
    .header-title { font-weight: 600; font-size: 15px; }
    .header-badge {
      font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: 100px;
      background: rgba(239,68,68,0.15); color: #f87171; border: 1px solid rgba(239,68,68,0.3);
      text-transform: uppercase; letter-spacing: 0.05em;
    }
    .header-actions { display: flex; align-items: center; gap: 10px; }
    .status-pill {
      display: flex; align-items: center; gap: 6px; padding: 5px 12px;
      border-radius: 100px; background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.25);
      font-size: 12px; color: var(--green); font-weight: 500;
    }
    .status-pill.error { background: rgba(239,68,68,0.1); border-color: rgba(239,68,68,0.25); color: var(--red); }
    .status-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; animation: pulse 2s infinite; }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }

    /* ── Layout ── */
    .layout { display: flex; flex: 1; overflow: hidden; }

    /* ── Sidebar ── */
    .sidebar {
      width: 220px; flex-shrink: 0; background: var(--bg2); border-right: 1px solid var(--border);
      display: flex; flex-direction: column; overflow: hidden;
    }
    .sidebar-header {
      padding: 16px; border-bottom: 1px solid var(--border);
      display: flex; align-items: center; justify-content: space-between;
    }
    .sidebar-label { font-size: 11px; font-weight: 600; color: var(--text3); text-transform: uppercase; letter-spacing: 0.08em; }
    .table-count { font-size: 11px; color: var(--text3); }
    .table-list { flex: 1; overflow-y: auto; padding: 8px; }
    .table-list::-webkit-scrollbar { width: 4px; }
    .table-list::-webkit-scrollbar-track { background: transparent; }
    .table-list::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }
    .table-item {
      display: flex; align-items: center; justify-content: space-between;
      padding: 7px 10px; border-radius: 8px; cursor: pointer;
      transition: background 0.15s, color 0.15s; margin-bottom: 2px;
      font-size: 13px; color: var(--text2);
    }
    .table-item:hover { background: rgba(255,255,255,0.06); color: var(--text); }
    .table-item.active { background: rgba(99,102,241,0.15); color: #a5b4fc; font-weight: 500; }
    .table-item-name { font-family: var(--mono); font-size: 12px; }
    .table-item-count { font-size: 11px; color: var(--text3); background: rgba(255,255,255,0.06); padding: 1px 6px; border-radius: 100px; }

    /* ── Main content ── */
    .main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }

    /* ── Toolbar ── */
    .toolbar {
      padding: 12px 20px; border-bottom: 1px solid var(--border);
      display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
    }
    .toolbar-title { font-size: 15px; font-weight: 600; font-family: var(--mono); color: var(--text); }
    .toolbar-meta { font-size: 12px; color: var(--text3); margin-left: auto; }
    .search-box {
      flex: 1; max-width: 260px; padding: 7px 12px; border-radius: 8px;
      background: rgba(255,255,255,0.05); border: 1px solid var(--border);
      color: var(--text); font-size: 13px; font-family: var(--sans); outline: none;
      transition: border-color 0.15s;
    }
    .search-box:focus { border-color: rgba(99,102,241,0.5); }
    .search-box::placeholder { color: var(--text3); }
    .btn {
      padding: 7px 14px; border-radius: 8px; border: 1px solid var(--border);
      background: rgba(255,255,255,0.06); color: var(--text); font-size: 13px; font-weight: 500;
      cursor: pointer; transition: background 0.15s, border-color 0.15s; white-space: nowrap;
      display: flex; align-items: center; gap: 6px;
    }
    .btn:hover { background: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.15); }
    .btn.primary { background: rgba(99,102,241,0.2); border-color: rgba(99,102,241,0.4); color: #a5b4fc; }
    .btn.primary:hover { background: rgba(99,102,241,0.3); }
    .spin { animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* ── Table ── */
    .table-container { flex: 1; overflow: auto; padding: 0; }
    .table-container::-webkit-scrollbar { width: 6px; height: 6px; }
    .table-container::-webkit-scrollbar-track { background: transparent; }
    .table-container::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }

    table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
    thead { position: sticky; top: 0; z-index: 10; }
    th {
      background: var(--bg2); padding: 10px 14px; text-align: left;
      font-weight: 600; font-size: 11px; color: var(--text3); text-transform: uppercase;
      letter-spacing: 0.06em; border-bottom: 1px solid var(--border); white-space: nowrap;
      font-family: var(--mono);
    }
    td {
      padding: 9px 14px; border-bottom: 1px solid rgba(255,255,255,0.04);
      font-family: var(--mono); color: var(--text2); white-space: nowrap; max-width: 280px;
      overflow: hidden; text-overflow: ellipsis;
    }
    tr:hover td { background: rgba(255,255,255,0.03); }
    .redacted { color: var(--text3); font-style: italic; }
    .null-val { color: var(--text3); font-style: italic; }
    .bool-true { color: var(--green); }
    .bool-false { color: var(--red); }
    .uuid { color: #7dd3fc; font-size: 11px; }
    .ts { color: #fbbf24; font-size: 11px; }

    /* ── Pagination ── */
    .pagination {
      display: flex; align-items: center; gap: 8px;
      padding: 12px 20px; border-top: 1px solid var(--border);
      flex-shrink: 0;
    }
    .page-info { font-size: 12px; color: var(--text3); margin-right: auto; }

    /* ── States ── */
    .state-box {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      flex: 1; gap: 12px; color: var(--text3); padding: 60px;
    }
    .state-icon { font-size: 40px; }
    .state-title { font-size: 16px; font-weight: 600; color: var(--text2); }
    .state-msg { font-size: 13px; text-align: center; max-width: 300px; }
    .state-box.error .state-title { color: #f87171; }

    /* ── DB Info panel ── */
    .db-info {
      display: flex; gap: 20px; padding: 12px 20px;
      border-bottom: 1px solid var(--border); flex-shrink: 0;
      background: rgba(255,255,255,0.01);
    }
    .db-info-item { display: flex; flex-direction: column; gap: 2px; }
    .db-info-label { font-size: 10px; font-weight: 600; color: var(--text3); text-transform: uppercase; letter-spacing: 0.07em; }
    .db-info-value { font-size: 13px; font-family: var(--mono); color: var(--text); }

    @media (max-width: 640px) {
      .sidebar { width: 160px; }
      .db-info { flex-wrap: wrap; gap: 12px; }
      .header-title { display: none; }
    }
  </style>
</head>
<body>

<!-- Header -->
<header class="header">
  <div class="header-brand">
    <div class="header-logo">IEC</div>
    <span class="header-title">Database Preview</span>
    <span class="header-badge">Dev Only</span>
  </div>
  <div class="header-actions">
    <div class="status-pill" id="status-pill">
      <span class="status-dot"></span>
      <span id="status-text">Connecting…</span>
    </div>
  </div>
</header>

<!-- DB Info -->
<div class="db-info">
  <div class="db-info-item">
    <span class="db-info-label">DATABASE</span>
    <span class="db-info-value" id="info-db">iec_db</span>
  </div>
  <div class="db-info-item">
    <span class="db-info-label">HOST</span>
    <span class="db-info-value" id="info-host">localhost</span>
  </div>
  <div class="db-info-item">
    <span class="db-info-label">PORT</span>
    <span class="db-info-value" id="info-port">5433</span>
  </div>
  <div class="db-info-item">
    <span class="db-info-label">STATUS</span>
    <span class="db-info-value" id="info-status">—</span>
  </div>
</div>

<!-- Main layout -->
<div class="layout">
  <!-- Sidebar -->
  <aside class="sidebar">
    <div class="sidebar-header">
      <span class="sidebar-label">Tables</span>
      <span class="table-count" id="table-count">—</span>
    </div>
    <div class="table-list" id="table-list">
      <div class="state-box" style="padding:30px">
        <span class="state-icon">🔄</span>
        <span class="state-msg">Loading tables…</span>
      </div>
    </div>
  </aside>

  <!-- Main -->
  <main class="main">
    <div class="toolbar" id="toolbar" style="display:none">
      <span class="toolbar-title" id="table-name-title">—</span>
      <input class="search-box" id="search-input" type="text" placeholder="Search rows…"/>
      <button class="btn primary" id="refresh-btn">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M23 4v6h-6M1 20v-6h6"/>
          <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
        </svg>
        Refresh
      </button>
      <span class="toolbar-meta" id="toolbar-meta"></span>
    </div>

    <div class="table-container" id="table-view">
      <div class="state-box">
        <span class="state-icon">🗄️</span>
        <span class="state-title">IEC Database Preview</span>
        <span class="state-msg">Select a table from the sidebar to inspect its data.</span>
      </div>
    </div>

    <div class="pagination" id="pagination" style="display:none">
      <span class="page-info" id="page-info"></span>
      <button class="btn" id="prev-btn">← Prev</button>
      <button class="btn" id="next-btn">Next →</button>
    </div>
  </main>
</div>

<script>
  let currentTable = null;
  let currentPage  = 1;
  let totalPages   = 1;
  let searchTimeout = null;

  // ── Status ──────────────────────────────────────────────────────────────────
  async function loadStatus() {
    try {
      const r = await fetch('/api/status');
      const d = await r.json();
      if (d.status === 'connected') {
        document.getElementById('status-pill').className = 'status-pill';
        document.getElementById('status-text').textContent = 'Connected';
        document.getElementById('info-db').textContent = d.database || 'iec_db';
        document.getElementById('info-host').textContent = d.host || 'localhost';
        document.getElementById('info-port').textContent = d.port || '5433';
        document.getElementById('info-status').textContent = 'Connected ✓';
        document.getElementById('info-status').style.color = 'var(--green)';
      } else {
        setError(d.error || 'Connection failed');
      }
    } catch (e) {
      setError(e.message);
    }
  }

  function setError(msg) {
    document.getElementById('status-pill').className = 'status-pill error';
    document.getElementById('status-text').textContent = 'Error';
    document.getElementById('info-status').textContent = '✗ ' + msg;
    document.getElementById('info-status').style.color = 'var(--red)';
  }

  // ── Tables ──────────────────────────────────────────────────────────────────
  async function loadTables() {
    try {
      const r = await fetch('/api/tables');
      const d = await r.json();
      const tables = d.tables || [];
      document.getElementById('table-count').textContent = tables.length;

      const list = document.getElementById('table-list');
      if (!tables.length) {
        list.innerHTML = '<div class="state-box" style="padding:20px"><span class="state-msg">No tables found</span></div>';
        return;
      }

      list.innerHTML = tables.map(t => \`
        <div class="table-item" data-table="\${t.table_name}" onclick="selectTable('\${t.table_name}')">
          <span class="table-item-name">\${t.table_name}</span>
          <span class="table-item-count">\${t.row_count != null ? t.row_count : '?'}</span>
        </div>
      \`).join('');
    } catch (e) {
      document.getElementById('table-list').innerHTML = \`
        <div class="state-box error" style="padding:20px">
          <span class="state-msg">Failed to load tables: \${e.message}</span>
        </div>
      \`;
    }
  }

  // ── Table Data ───────────────────────────────────────────────────────────────
  function selectTable(name, page = 1) {
    currentTable = name;
    currentPage  = page;

    // Update sidebar active state
    document.querySelectorAll('.table-item').forEach(el => {
      el.classList.toggle('active', el.dataset.table === name);
    });

    document.getElementById('table-name-title').textContent = name;
    document.getElementById('toolbar').style.display = 'flex';
    document.getElementById('search-input').value = '';
    loadTableData(name, page, '');
  }

  async function loadTableData(name, page, search) {
    const view = document.getElementById('table-view');
    view.innerHTML = '<div class="state-box"><span class="state-icon spin">⟳</span><span class="state-msg">Loading…</span></div>';
    document.getElementById('pagination').style.display = 'none';

    try {
      const params = new URLSearchParams({ page, limit: 50 });
      if (search) params.set('search', search);
      const r = await fetch(\`/api/tables/\${encodeURIComponent(name)}?\${params}\`);
      const d = await r.json();

      if (d.error) {
        view.innerHTML = \`<div class="state-box error"><span class="state-icon">⚠️</span><span class="state-title">Error</span><span class="state-msg">\${d.error}</span></div>\`;
        return;
      }

      if (!d.rows.length) {
        view.innerHTML = '<div class="state-box"><span class="state-icon">🪹</span><span class="state-title">Empty Table</span><span class="state-msg">No rows found.</span></div>';
        document.getElementById('toolbar-meta').textContent = '0 rows';
        return;
      }

      totalPages = d.pages;
      currentPage = d.page;

      // Render table
      const thead = \`<thead><tr>\${d.columns.map(c => \`<th>\${c}</th>\`).join('')}</tr></thead>\`;
      const tbody = '<tbody>' + d.rows.map(row =>
        '<tr>' + d.columns.map(col => {
          const val = row[col];
          if (val === '[REDACTED]') return \`<td><span class="redacted">[REDACTED]</span></td>\`;
          if (val === null || val === undefined) return \`<td><span class="null-val">null</span></td>\`;
          if (typeof val === 'boolean') return \`<td class="\${val ? 'bool-true' : 'bool-false'}">\${val}</td>\`;
          const s = String(val);
          // UUID detection
          if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)) {
            return \`<td class="uuid">\${s}</td>\`;
          }
          // Timestamp detection
          if (/^\\d{4}-\\d{2}-\\d{2}T/.test(s) || /^\\d{4}-\\d{2}-\\d{2} \\d{2}:/.test(s)) {
            const dt = new Date(s);
            return \`<td class="ts">\${isNaN(dt) ? s : dt.toLocaleString()}</td>\`;
          }
          return \`<td title="\${s.replace(/"/g,'&quot;')}">\${s.length > 80 ? s.slice(0,80) + '…' : s}</td>\`;
        }).join('')
        + '</tr>'
      ).join('') + '</tbody>';

      view.innerHTML = \`<table>\${thead}\${tbody}</table>\`;

      // Pagination
      document.getElementById('toolbar-meta').textContent = \`\${d.total.toLocaleString()} rows\`;
      document.getElementById('page-info').textContent = \`Page \${d.page} / \${d.pages} · \${d.total.toLocaleString()} rows\`;

      if (d.pages > 1) {
        document.getElementById('pagination').style.display = 'flex';
        document.getElementById('prev-btn').disabled = d.page <= 1;
        document.getElementById('next-btn').disabled = d.page >= d.pages;
      }
    } catch (e) {
      view.innerHTML = \`<div class="state-box error"><span class="state-icon">⚠️</span><span class="state-title">Error</span><span class="state-msg">\${e.message}</span></div>\`;
    }
  }

  // ── Events ──────────────────────────────────────────────────────────────────
  document.getElementById('refresh-btn').addEventListener('click', async () => {
    const btn = document.getElementById('refresh-btn');
    btn.querySelector('svg').classList.add('spin');
    await loadTables();
    if (currentTable) await loadTableData(currentTable, currentPage, document.getElementById('search-input').value.trim());
    btn.querySelector('svg').classList.remove('spin');
  });

  document.getElementById('search-input').addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      if (currentTable) {
        currentPage = 1;
        loadTableData(currentTable, 1, e.target.value.trim());
      }
    }, 350);
  });

  document.getElementById('prev-btn').addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      loadTableData(currentTable, currentPage, document.getElementById('search-input').value.trim());
    }
  });

  document.getElementById('next-btn').addEventListener('click', () => {
    if (currentPage < totalPages) {
      currentPage++;
      loadTableData(currentTable, currentPage, document.getElementById('search-input').value.trim());
    }
  });

  // ── Init ────────────────────────────────────────────────────────────────────
  (async () => {
    await loadStatus();
    await loadTables();
  })();
</script>
</body>
</html>`;
  html(res, page);
}

// ── Request Router ────────────────────────────────────────────────────────────

const server = http.createServer(async (req, res) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    return res.end();
  }

  // Only allow GET
  if (req.method !== 'GET') {
    return json(res, 405, { error: 'Method not allowed. This is a read-only interface.' });
  }

  const url = new URL(req.url, `http://${HOST}:${PORT}`);
  const path = url.pathname.replace(/\/+$/, '') || '/';

  if (path === '/' || path === '/index.html') {
    return serveDashboard(res);
  }

  if (path === '/api/status') {
    return handleStatus(res);
  }

  if (path === '/api/tables') {
    return handleTables(res);
  }

  const tableMatch = path.match(/^\/api\/tables\/([^/]+)$/);
  if (tableMatch) {
    return handleTableData(res, tableMatch[1], url.searchParams);
  }

  json(res, 404, { error: 'Not found.' });
});

server.listen(PORT, HOST, () => {
  console.log('');
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║   IEC Development Database Preview                    ║');
  console.log('╠═══════════════════════════════════════════════════════╣');
  console.log(`║   URL  : http://${HOST}:${PORT}                     ║`);
  console.log(`║   DB   : ${DB_CONFIG.database} @ ${DB_CONFIG.host}:${DB_CONFIG.port}               ║`);
  console.log('║   Mode : READ ONLY — localhost only                   ║');
  console.log('║   DEVELOPMENT TOOL — NOT linked to main frontend      ║');
  console.log('╚═══════════════════════════════════════════════════════╝');
  console.log('');
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[ERROR] Port ${PORT} is already in use. Stop other processes first.`);
  } else {
    console.error('[ERROR]', err.message);
  }
  process.exit(1);
});
