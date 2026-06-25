/**
 * TVS Machine Details API — Supabase Edition
 * -------------------------------------------
 * Data:  Supabase Postgres  (machines table)
 * Files: Supabase Storage   (bucket: excel-uploads)
 *
 * Required env vars (set in Render → Environment):
 *   SUPABASE_URL        e.g. https://xxxx.supabase.co
 *   SUPABASE_SERVICE_KEY  (use the service_role key, NOT the anon key)
 *   PORT                (optional, defaults to 3000)
 *
 * Routes:
 *   GET  /                          → Dashboard (all machines + dual QR codes)
 *   GET  /machine/:id               → Machine detail page (scan target)
 *   GET  /api/machines              → JSON list of all machines
 *   GET  /api/machines/:id          → JSON detail of one machine
 *   PUT  /api/machines/:id          → Update machine data
 *   POST /api/machines/:id/upload   → Upload history Excel file
 *   GET  /history/:id               → Download the Excel file for a machine
 *   GET  /all-history               → Download master all-history Excel
 *   POST /api/upload-all-history    → Upload master all-history Excel
 *
 * Run:  node server.js
 */

const http = require('http');
const url  = require('url');

const PORT           = process.env.PORT || 3000;
const SUPABASE_URL   = process.env.SUPABASE_URL;
const SUPABASE_KEY   = process.env.SUPABASE_SERVICE_KEY;
const BUCKET         = 'excel-uploads';
const ALL_HISTORY_PATH = 'all_history/_ALL_HISTORY.xlsx';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌  Missing SUPABASE_URL or SUPABASE_SERVICE_KEY env vars');
  process.exit(1);
}

// ─── Supabase helpers (raw fetch, no SDK needed) ─────────────────────────────

const sbHeaders = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation',
};

/** Run a Postgrest query against Supabase */
async function pgQuery(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: sbHeaders,
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase DB error ${res.status}: ${text}`);
  }
  return res.json();
}

/** Upload a Buffer to Supabase Storage */
async function storageUpload(storagePath, buffer, mimeType) {
  // Try upsert (update if exists, insert if not)
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${storagePath}`, {
    method: 'PUT',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': mimeType,
      'x-upsert': 'true',
    },
    body: buffer,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase Storage upload error ${res.status}: ${text}`);
  }
  return res.json();
}

/** Download a file from Supabase Storage, returns Buffer or null */
async function storageDownload(storagePath) {
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${storagePath}`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
    },
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase Storage download error ${res.status}: ${text}`);
  }
  const arrayBuf = await res.arrayBuffer();
  return Buffer.from(arrayBuf);
}

/** Check if a file exists in Supabase Storage using direct HEAD request */
async function storageExists(storagePath) {
  try {
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${storagePath}`, {
      method: 'HEAD',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
      },
    });
    return res.ok;
  } catch (e) {
    return false;
  }
}

// ─── Load all machines (with nested parts) from Supabase ─────────────────────

async function loadMachines() {
  // Fetch machines
  const machines = await pgQuery('machines?select=*&order=name.asc');

  // Fetch all parts in one query
  const parts = await pgQuery('parts?select=*');

  // Group parts by machine_id
  const partsMap = {};
  for (const p of parts) {
    if (!partsMap[p.machine_id]) partsMap[p.machine_id] = { running: [], alternate: [] };
    if (p.part_type === 'running') {
      partsMap[p.machine_id].running.push({
        partNumber: p.part_number,
        partName: p.part_name,
        alsoRunsOn: p.also_runs_on || '',
      });
    } else {
      partsMap[p.machine_id].alternate.push({
        partNumber: p.part_number,
        partName: p.part_name,
        preferredMachine: p.preferred_machine || '',
      });
    }
  }

  // Shape into the same structure the HTML templates expect
  return machines.map(m => ({
    id: m.id,
    name: m.name,
    make: m.make,
    origin: m.origin,
    tonnage: m.tonnage,
    type: m.type,
    location: m.location,
    mfgYear: m.mfg_year,
    shotWeight: m.shot_weight,
    shutHeight: m.shut_height,
    commonDedicated: m.common_dedicated || null,
    lifePending: m.life_pending || null,
    partsRunning:   (partsMap[m.id] || {}).running   || [],
    partsAlternate: (partsMap[m.id] || {}).alternate || [],
  }));
}

/** Update scalar machine fields (no parts) */
async function updateMachine(id, body) {
  const patch = {};
  if (body.name)            patch.name             = body.name;
  if (body.make)            patch.make             = body.make;
  if (body.origin)          patch.origin           = body.origin;
  if (body.tonnage)         patch.tonnage          = body.tonnage;
  if (body.type)            patch.type             = body.type;
  if (body.location)        patch.location         = body.location;
  if (body.mfgYear)         patch.mfg_year         = body.mfgYear;
  if (body.shotWeight)      patch.shot_weight      = body.shotWeight;
  if (body.shutHeight)      patch.shut_height      = body.shutHeight;
  if (body.commonDedicated) patch.common_dedicated = body.commonDedicated;
  if (body.lifePending)     patch.life_pending     = body.lifePending;

  return pgQuery(`machines?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

function excelStoragePath(id) {
  return `machines/${id}.xlsx`;
}

// ─── HTTP helpers ─────────────────────────────────────────────────────────────

function send(res, statusCode, contentType, body) {
  res.writeHead(statusCode, { 'Content-Type': contentType });
  res.end(body);
}
function sendJSON(res, statusCode, obj) {
  send(res, statusCode, 'application/json', JSON.stringify(obj, null, 2));
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try { resolve(JSON.parse(body)); }
      catch (e) { reject(e); }
    });
  });
}
function readRawBody(req) {
  return new Promise(resolve => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

/**
 * Minimal multipart parser — handles a single file field named "excel"
 */
function parseMultipart(body, boundary) {
  const boundaryBuf = Buffer.from('--' + boundary);
  let start = 0;
  const parts = [];
  while (start < body.length) {
    const bIdx = body.indexOf(boundaryBuf, start);
    if (bIdx === -1) break;
    const headerStart = bIdx + boundaryBuf.length + 2;
    if (headerStart >= body.length) break;
    const headerEnd = body.indexOf(Buffer.from('\r\n\r\n'), headerStart);
    if (headerEnd === -1) break;
    const headers = body.slice(headerStart, headerEnd).toString();
    const dataStart = headerEnd + 4;
    const nextBoundary = body.indexOf(boundaryBuf, dataStart);
    const dataEnd = nextBoundary === -1 ? body.length : nextBoundary - 2;
    if (headers.includes('filename=')) {
      const fnMatch = headers.match(/filename="([^"]+)"/);
      parts.push({ filename: fnMatch ? fnMatch[1] : 'upload.xlsx', data: body.slice(dataStart, dataEnd) });
    }
    start = nextBoundary === -1 ? body.length : nextBoundary;
  }
  return parts[0] || null;
}

// ─── CSS ──────────────────────────────────────────────────────────────────────

const CSS = `
  :root {
    --blue:#1a56db; --blue-dark:#1e3a8a; --dark:#111827; --mid:#374151;
    --light:#6b7280; --bg:#f9fafb; --white:#ffffff; --green:#059669;
    --green-light:#d1fae5; --green-dark:#065f46;
    --amber:#d97706; --amber-light:#fef3c7; --amber-dark:#92400e;
    --teal:#0d9488; --teal-light:#ccfbf1; --teal-dark:#134e4a;
    --border:#e5e7eb;
  }
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
         background:var(--bg); color:var(--dark); }
  .header { background:var(--blue); color:white; padding:16px 24px;
            display:flex; align-items:center; gap:12px; }
  .header h1 { font-size:1.25rem; font-weight:700; }
  .header span { font-size:0.85rem; opacity:0.8; }
  .container { max-width:1100px; margin:0 auto; padding:24px 16px; }
  .badge { display:inline-block; padding:3px 10px; border-radius:99px;
           font-size:0.75rem; font-weight:600; letter-spacing:.03em; }
  .badge-blue   { background:#dbeafe; color:#1e40af; }
  .badge-green  { background:var(--green-light); color:var(--green-dark); }
  .badge-amber  { background:var(--amber-light); color:var(--amber-dark); }
  .badge-teal   { background:var(--teal-light);  color:var(--teal-dark); }
`;

// ─── Dashboard HTML ───────────────────────────────────────────────────────────

function dashboardHTML(machines, excelStatus, allHistoryExists, baseUrl) {
  const cards = machines.map(m => {
    const hasXL    = !!excelStatus[m.id];
    const qrDetail = `${baseUrl}/machine/${m.id}`;
    const qrExcel  = `${baseUrl}/history/${m.id}`;

    const excelQRSection = hasXL
      ? `<div style="text-align:center;padding:8px 0 0;">
           <div style="font-size:0.7rem;font-weight:700;color:var(--teal-dark);
                       text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px;">
             📊 History Excel
           </div>
           <img src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&color=0d9488&data=${encodeURIComponent(qrExcel)}"
                alt="Excel QR" width="120" height="120"
                style="border:4px solid var(--teal-light);border-radius:8px;display:block;margin:0 auto 6px;" />
           <div style="font-size:0.65rem;color:var(--teal-dark);">Scan → Download Excel</div>
         </div>`
      : `<div style="background:var(--teal-light);border-radius:8px;padding:10px;
                     text-align:center;font-size:0.75rem;color:var(--teal-dark);
                     border:1px dashed var(--teal);">
           📊 No Excel uploaded yet<br>
           <span style="font-size:0.65rem;opacity:0.7;">Upload from machine detail page</span>
         </div>`;

    return `
    <div style="background:white;border:1px solid var(--border);border-radius:12px;
                padding:20px;display:flex;flex-direction:column;gap:12px;">
      <div>
        <div style="font-weight:700;font-size:1rem;">${m.name}</div>
        <div style="font-size:0.8rem;color:var(--light);margin-top:2px">
          ${m.make} · ${m.origin} · ${m.tonnage} · ${m.type}
        </div>
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;">
        <span class="badge badge-blue">${m.location}</span>
        <span class="badge badge-green">${m.partsRunning.length} running</span>
        ${m.partsAlternate.length > 0 ? `<span class="badge badge-amber">${m.partsAlternate.length} alternate</span>` : ''}
        ${hasXL ? `<span class="badge badge-teal">Excel ✓</span>` : ''}
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;align-items:start;">
        <div style="text-align:center;">
          <div style="font-size:0.7rem;font-weight:700;color:var(--blue-dark);
                      text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px;">
            🔵 Machine Details
          </div>
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(qrDetail)}"
               alt="QR ${m.name}" width="120" height="120"
               style="border:4px solid #dbeafe;border-radius:8px;display:block;margin:0 auto 6px;" />
          <div style="font-size:0.65rem;color:var(--blue-dark);">Scan → View Details</div>
        </div>
        <div>${excelQRSection}</div>
      </div>
      <a href="/machine/${m.id}"
         style="display:block;text-align:center;background:var(--blue);color:white;
                padding:8px;border-radius:8px;text-decoration:none;
                font-size:0.85rem;font-weight:600;">
        View Details & Upload Excel →
      </a>
    </div>`;
  }).join('');

  const uploadedCount = Object.values(excelStatus).filter(Boolean).length;

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>TVS — Machine QR Dashboard</title>
<style>${CSS}
.grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(300px,1fr)); gap:20px; }
</style></head>
<body>
<div class="header">
  <div>
    <h1>TVS — Machine QR Dashboard</h1>
    <span>Two QR codes per machine: Details + History Excel</span>
  </div>
</div>
<div class="container">

  <!-- Global All-History Panel -->
  <div style="background:white;border:2px solid #7c3aed;border-radius:14px;
              overflow:hidden;margin-bottom:28px;box-shadow:0 2px 12px rgba(124,58,237,.1);">
    <div style="background:#7c3aed;color:white;padding:14px 20px;
                display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">
      <div>
        <div style="font-weight:800;font-size:1rem;">📋 All History Cards — Master Excel</div>
        <div style="font-size:0.78rem;opacity:0.85;margin-top:2px;">
          Single file containing all machine history cards.
        </div>
      </div>
      ${allHistoryExists
        ? `<a href="/all-history" download
             style="background:white;color:#7c3aed;padding:8px 18px;border-radius:8px;
                    text-decoration:none;font-weight:700;font-size:0.85rem;">
             ⬇️ Download
           </a>` : ''}
    </div>
    <div style="padding:20px;display:grid;grid-template-columns:1fr auto;gap:24px;align-items:center;">
      <div>
        <div style="font-size:0.82rem;font-weight:700;color:#4c1d95;margin-bottom:10px;">
          ${allHistoryExists ? '🔄 Replace Master Excel File' : '📤 Upload Master Excel File'}
        </div>
        ${allHistoryExists
          ? `<div style="background:#ede9fe;border-radius:8px;padding:9px 14px;font-size:0.78rem;
                         color:#4c1d95;margin-bottom:10px;">
               ✅ Master history file is uploaded and ready to share via QR.
             </div>` : ''}
        <div id="allDropzone"
             style="border:2px dashed ${allHistoryExists ? '#7c3aed' : '#c4b5fd'};
                    border-radius:10px;padding:22px 20px;text-align:center;cursor:pointer;
                    background:${allHistoryExists ? '#ede9fe' : '#faf5ff'};transition:all .2s;"
             onclick="document.getElementById('allFileInput').click()"
             ondragover="event.preventDefault();this.style.borderColor='#7c3aed'"
             ondragleave="this.style.borderColor='${allHistoryExists ? '#7c3aed' : '#c4b5fd'}'"
             ondrop="handleAllDrop(event)">
          <div style="font-size:1.8rem;margin-bottom:6px;">📂</div>
          <div style="font-size:0.82rem;font-weight:600;color:#4c1d95;">
            Click or drag & drop the master history Excel
          </div>
          <div style="font-size:0.72rem;color:#7c3aed;margin-top:4px;">.xlsx / .xls files only</div>
        </div>
        <input type="file" id="allFileInput" accept=".xlsx,.xls"
               style="display:none" onchange="uploadAllHistory(this.files[0])">
        <div id="allUploadStatus" style="margin-top:10px;font-size:0.82rem;display:none;
                                          padding:10px 14px;border-radius:8px;"></div>
        <button onclick="document.getElementById('allFileInput').click()"
                style="margin-top:10px;width:100%;background:#7c3aed;color:white;border:none;
                       padding:10px;border-radius:8px;font-weight:700;font-size:0.85rem;cursor:pointer;">
          ${allHistoryExists ? '🔄 Replace Master Excel' : '📤 Choose & Upload'}
        </button>
      </div>
      <div style="text-align:center;min-width:160px;">
        ${allHistoryExists
          ? `<div style="font-size:0.72rem;font-weight:700;color:#4c1d95;
                         text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px;">
               Scan to Download All History
             </div>
             <div style="display:inline-block;background:white;border-radius:12px;padding:10px;
                         box-shadow:0 2px 12px rgba(124,58,237,.2);border:2px solid #7c3aed;">
               <img src="https://api.qrserver.com/v1/create-qr-code/?size=160x160&color=7c3aed&bgcolor=ffffff&data=${encodeURIComponent(baseUrl + '/all-history')}"
                    alt="All History QR" width="160" height="160"
                    style="display:block;border-radius:6px;" />
             </div>`
          : `<div style="background:#f5f3ff;border-radius:12px;padding:28px 20px;
                         border:2px dashed #c4b5fd;text-align:center;">
               <div style="font-size:2.5rem;opacity:.35;">📋</div>
               <div style="font-size:0.78rem;font-weight:600;color:#7c3aed;margin-top:8px;">
                 QR appears here after upload
               </div>
             </div>`}
      </div>
    </div>
  </div>

  <!-- Stats -->
  <div style="background:white;border:2px solid #0369a1;border-radius:14px;
              padding:20px 24px;margin-bottom:28px;
              display:flex;align-items:center;justify-content:space-between;
              flex-wrap:wrap;gap:16px;">
    <div style="display:flex;align-items:center;gap:16px;">
      <div style="background:#e0f2fe;border-radius:12px;padding:14px 18px;text-align:center;">
        <div style="font-size:2rem;font-weight:900;color:#0369a1;line-height:1;">${machines.length}</div>
        <div style="font-size:0.7rem;font-weight:700;color:#0369a1;text-transform:uppercase;letter-spacing:.05em;margin-top:2px;">Total Machines</div>
      </div>
      <div style="background:#f0fdf4;border-radius:12px;padding:14px 18px;text-align:center;">
        <div style="font-size:2rem;font-weight:900;color:#15803d;line-height:1;">${uploadedCount}</div>
        <div style="font-size:0.7rem;font-weight:700;color:#15803d;text-transform:uppercase;letter-spacing:.05em;margin-top:2px;">History Cards Uploaded</div>
      </div>
      <div style="background:#fef9c3;border-radius:12px;padding:14px 18px;text-align:center;">
        <div style="font-size:2rem;font-weight:900;color:#a16207;line-height:1;">${machines.length - uploadedCount}</div>
        <div style="font-size:0.7rem;font-weight:700;color:#a16207;text-transform:uppercase;letter-spacing:.05em;margin-top:2px;">Cards Pending</div>
      </div>
    </div>
  </div>

  <p style="color:var(--light);margin-bottom:20px;font-size:0.9rem;">
    ${machines.length} machines · Blue QR = machine details · Teal QR = history Excel · Purple QR = all history
  </p>
  <div class="grid">${cards}</div>
</div>

<script>
function handleAllDrop(e) {
  e.preventDefault();
  const file = e.dataTransfer.files[0];
  if (file) uploadAllHistory(file);
}
function uploadAllHistory(file) {
  if (!file) return;
  if (!file.name.match(/\.xlsx?$/i)) {
    showAllStatus('❌ Please select an .xlsx or .xls file', 'error'); return;
  }
  showAllStatus('⏳ Uploading...', 'info');
  const fd = new FormData();
  fd.append('excel', file);
  fetch('/api/upload-all-history', { method: 'POST', body: fd })
    .then(r => r.json())
    .then(d => {
      if (d.success) {
        showAllStatus('✅ Uploaded! Refreshing...', 'success');
        setTimeout(() => location.reload(), 1200);
      } else {
        showAllStatus('❌ Upload failed: ' + (d.error || 'Unknown'), 'error');
      }
    })
    .catch(() => showAllStatus('❌ Upload failed. Check server.', 'error'));
}
function showAllStatus(msg, type) {
  const el = document.getElementById('allUploadStatus');
  el.style.display = 'block';
  el.textContent = msg;
  el.style.background = type === 'success' ? '#ede9fe' : type === 'error' ? '#fee2e2' : '#dbeafe';
  el.style.color       = type === 'success' ? '#4c1d95' : type === 'error' ? '#991b1b' : '#1e40af';
}
</script>
</body></html>`;
}

// ─── Machine Detail HTML ──────────────────────────────────────────────────────

function machineHTML(m, hasXL, baseUrl) {
  const qrDetail = `${baseUrl}/machine/${m.id}`;
  const qrExcel  = `${baseUrl}/history/${m.id}`;

  const specRows = [
    ['Machine Name', m.name],
    ['Make / Origin', `${m.make} — ${m.origin}`],
    ['Tonnage', m.tonnage],
    ['Machine Type', m.type],
    ['Location', m.location],
    ['Mfg. Year', m.mfgYear],
    ['Shot Weight', m.shotWeight],
    ['Shut Height', m.shutHeight],
    ...(m.commonDedicated ? [['Common / Dedicated', m.commonDedicated]] : []),
    ...(m.lifePending     ? [['Life Pending',        m.lifePending]]     : []),
  ].map(([k, v]) => `
    <tr>
      <td style="padding:10px 14px;font-weight:600;color:var(--mid);background:#f3f4f6;
                 border-bottom:1px solid var(--border);white-space:nowrap;">${k}</td>
      <td style="padding:10px 14px;border-bottom:1px solid var(--border);">${v}</td>
    </tr>`).join('');

  function partRows(parts, altMode) {
    if (!parts.length) return `<tr><td colspan="3" style="padding:12px;color:var(--light);
      text-align:center;font-style:italic;">None assigned</td></tr>`;
    return parts.map(p => {
      const extra = altMode
        ? (p.preferredMachine ? `<span class="badge badge-amber">${p.preferredMachine}</span>` : '—')
        : (p.alsoRunsOn       ? `<span class="badge badge-blue">${p.alsoRunsOn}</span>`         : '—');
      return `<tr>
        <td style="padding:9px 14px;border-bottom:1px solid var(--border);
                   font-family:monospace;font-size:0.85rem;">${p.partNumber}</td>
        <td style="padding:9px 14px;border-bottom:1px solid var(--border);">${p.partName}</td>
        <td style="padding:9px 14px;border-bottom:1px solid var(--border);">${extra}</td>
      </tr>`;
    }).join('');
  }

  const th = (t1, t2, t3) =>
    `<thead><tr style="background:#1a56db;color:white;">
       <th style="padding:10px 14px;text-align:left;font-size:0.8rem;">${t1}</th>
       <th style="padding:10px 14px;text-align:left;font-size:0.8rem;">${t2}</th>
       <th style="padding:10px 14px;text-align:left;font-size:0.8rem;">${t3}</th>
     </tr></thead>`;

  const excelPanel = `
  <section style="background:white;border:2px solid var(--teal);border-radius:12px;
                  overflow:hidden;margin-bottom:24px;">
    <h2 style="padding:14px 18px;font-size:0.9rem;font-weight:700;letter-spacing:.04em;
               text-transform:uppercase;background:var(--teal);color:white;">
      📊 History Excel File
    </h2>
    <div style="padding:20px;">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;align-items:start;">
        <div>
          <h3 style="font-size:0.85rem;font-weight:700;color:var(--mid);margin-bottom:12px;">
            ${hasXL ? '🔄 Replace Excel File' : '📤 Upload Excel File'}
          </h3>
          ${hasXL ? `<div style="background:var(--teal-light);border-radius:8px;padding:10px 14px;
                                 font-size:0.8rem;color:var(--teal-dark);margin-bottom:12px;">
            ✅ Excel file is uploaded. Scan QR to share download access.
          </div>` : ''}
          <div id="dropzone"
               style="border:2px dashed ${hasXL ? 'var(--teal)' : '#d1d5db'};border-radius:10px;
                      padding:28px 20px;text-align:center;cursor:pointer;
                      background:${hasXL ? 'var(--teal-light)' : '#fafafa'};transition:all .2s;"
               onclick="document.getElementById('fileInput').click()"
               ondragover="event.preventDefault();this.style.borderColor='var(--teal)'"
               ondragleave="this.style.borderColor='#d1d5db'"
               ondrop="handleDrop(event)">
            <div style="font-size:2rem;margin-bottom:8px;">📂</div>
            <div style="font-size:0.85rem;font-weight:600;color:var(--mid);">
              Click or drag & drop Excel file
            </div>
            <div style="font-size:0.75rem;color:var(--light);margin-top:4px;">.xlsx, .xls files only</div>
          </div>
          <input type="file" id="fileInput" accept=".xlsx,.xls"
                 style="display:none" onchange="uploadFile(this.files[0])">
          <div id="uploadStatus" style="margin-top:12px;font-size:0.82rem;display:none;
                                        padding:10px 14px;border-radius:8px;"></div>
          <button onclick="document.getElementById('fileInput').click()"
                  style="margin-top:12px;width:100%;background:var(--teal);color:white;
                         border:none;padding:10px;border-radius:8px;font-weight:700;
                         font-size:0.85rem;cursor:pointer;">
            ${hasXL ? '🔄 Replace Excel File' : '📤 Choose & Upload'}
          </button>
          ${hasXL ? `
          <a href="/history/${m.id}" download
             style="display:block;margin-top:8px;text-align:center;background:var(--green);
                    color:white;padding:10px;border-radius:8px;text-decoration:none;
                    font-weight:700;font-size:0.85rem;">
            ⬇️ Download Current Excel
          </a>` : ''}
        </div>
        <div style="text-align:center;">
          ${hasXL ? `
          <div style="font-size:0.8rem;font-weight:700;color:var(--teal-dark);
                      margin-bottom:10px;text-transform:uppercase;letter-spacing:.05em;">
            Scan to Download Excel
          </div>
          <div style="display:inline-block;background:white;border-radius:12px;
                      padding:12px;box-shadow:0 2px 12px rgba(13,148,136,.15);
                      border:2px solid var(--teal);">
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&color=0d9488&bgcolor=ffffff&data=${encodeURIComponent(qrExcel)}"
                 alt="Excel QR" width="180" height="180"
                 style="display:block;border-radius:6px;" />
          </div>
          <div style="margin-top:10px;font-size:0.7rem;color:var(--light);word-break:break-all;">${qrExcel}</div>
          ` : `
          <div style="background:#f3f4f6;border-radius:12px;padding:28px 20px;
                      text-align:center;border:2px dashed #e5e7eb;">
            <div style="font-size:2.5rem;margin-bottom:8px;opacity:0.4;">📊</div>
            <div style="font-size:0.85rem;font-weight:600;color:var(--light);">
              QR will appear here after upload
            </div>
          </div>`}
        </div>
      </div>
    </div>
  </section>`;

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${m.name} — TVS Machine Details</title>
<style>${CSS}
table { width:100%; border-collapse:collapse; border:1px solid var(--border);
        border-radius:8px; overflow:hidden; box-shadow:0 1px 4px rgba(0,0,0,0.06); }
section { background:white; border:1px solid var(--border); border-radius:12px;
          overflow:hidden; margin-bottom:24px; }
section h2 { padding:14px 18px; font-size:0.9rem; font-weight:700;
             letter-spacing:.04em; text-transform:uppercase; }
a.back { display:inline-flex;align-items:center;gap:6px;color:var(--blue);
         text-decoration:none;font-size:0.9rem;margin-bottom:20px; }
.dual-qr { display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px; }
.qr-card { background:white;border-radius:12px;padding:18px;text-align:center;
           border:2px solid; box-shadow:0 2px 8px rgba(0,0,0,.06); }
.qr-card.blue { border-color:var(--blue); }
.qr-card.teal { border-color:var(--teal); }
.qr-card .qr-label { font-size:0.75rem;font-weight:700;text-transform:uppercase;
                      letter-spacing:.05em;margin-bottom:10px; }
.qr-card.blue .qr-label { color:var(--blue-dark); }
.qr-card.teal .qr-label { color:var(--teal-dark); }
@media(max-width:600px){
  .dual-qr { grid-template-columns:1fr; }
}
</style></head>
<body>
<div class="header">
  <div>
    <h1>${m.name}</h1>
    <span>${m.make} · ${m.origin} · ${m.tonnage} · ${m.type} · ${m.location}</span>
  </div>
</div>
<div class="container">
  <a class="back" href="/">← All Machines</a>

  <div class="dual-qr">
    <div class="qr-card blue">
      <div class="qr-label">🔵 Machine Details QR</div>
      <img src="https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(qrDetail)}"
           alt="Details QR" width="160" height="160"
           style="border:5px solid #dbeafe;border-radius:8px;" />
      <div style="font-size:0.7rem;color:var(--light);margin-top:8px;word-break:break-all;">${qrDetail}</div>
    </div>
    <div class="qr-card teal">
      <div class="qr-label">📊 History Excel QR</div>
      ${hasXL
        ? `<img src="https://api.qrserver.com/v1/create-qr-code/?size=160x160&color=0d9488&data=${encodeURIComponent(qrExcel)}"
               alt="Excel QR" width="160" height="160"
               style="border:5px solid var(--teal-light);border-radius:8px;" />
           <div style="font-size:0.7rem;color:var(--light);margin-top:8px;word-break:break-all;">${qrExcel}</div>`
        : `<div style="width:160px;height:160px;background:#f3f4f6;border-radius:8px;
                       display:flex;flex-direction:column;align-items:center;justify-content:center;
                       margin:0 auto;border:2px dashed #e5e7eb;">
             <div style="font-size:2rem;opacity:.4;">📊</div>
             <div style="font-size:0.7rem;color:var(--light);margin-top:6px;text-align:center;padding:0 10px;">
               Upload Excel below to activate
             </div>
           </div>`}
    </div>
  </div>

  <section>
    <h2 style="background:#1e3a8a;color:white;">⚙️ Machine Specifications</h2>
    <table><tbody>${specRows}</tbody></table>
  </section>

  ${excelPanel}

  <section>
    <h2 style="background:var(--green);color:white;">✅ Parts Currently Running (${m.partsRunning.length})</h2>
    <table>
      ${th('Part Number', 'Part Name', 'Also Runs On')}
      <tbody>${partRows(m.partsRunning, false)}</tbody>
    </table>
  </section>

  <section>
    <h2 style="background:var(--amber);color:white;">🔄 Parts Able to Run — Alternate (${m.partsAlternate.length})</h2>
    <table>
      ${th('Part Number', 'Part Name', 'Preferred Machine')}
      <tbody>${partRows(m.partsAlternate, true)}</tbody>
    </table>
  </section>

  <p style="font-size:0.75rem;color:var(--light);text-align:center;margin-top:8px">
    Machine ID: <code>${m.id}</code> · Last loaded: ${new Date().toLocaleString('en-IN')}
  </p>
</div>

<script>
function handleDrop(e) {
  e.preventDefault();
  const file = e.dataTransfer.files[0];
  if (file) uploadFile(file);
}
function uploadFile(file) {
  if (!file) return;
  if (!file.name.match(/\.xlsx?$/i)) {
    showStatus('❌ Please select an .xlsx or .xls file', 'error'); return;
  }
  showStatus('⏳ Uploading...', 'info');
  const fd = new FormData();
  fd.append('excel', file);
  fetch('/api/machines/${m.id}/upload', { method: 'POST', body: fd })
    .then(r => r.json())
    .then(d => {
      if (d.success) {
        showStatus('✅ Uploaded successfully! Refreshing...', 'success');
        setTimeout(() => location.reload(), 1200);
      } else {
        showStatus('❌ Upload failed: ' + (d.error || 'Unknown error'), 'error');
      }
    })
    .catch(() => showStatus('❌ Upload failed. Check server connection.', 'error'));
}
function showStatus(msg, type) {
  const el = document.getElementById('uploadStatus');
  el.style.display = 'block';
  el.textContent = msg;
  el.style.background = type === 'success' ? '#d1fae5' : type === 'error' ? '#fee2e2' : '#dbeafe';
  el.style.color       = type === 'success' ? '#065f46' : type === 'error' ? '#991b1b' : '#1e40af';
}
const dz = document.getElementById('dropzone');
if (dz) {
  dz.addEventListener('dragover', e => { e.preventDefault(); dz.style.background='#ccfbf1'; });
  dz.addEventListener('dragleave', () => { dz.style.background='${hasXL ? "#ccfbf1" : "#fafafa"}'; });
}
</script>
</body></html>`;
}

// ─── Router ───────────────────────────────────────────────────────────────────

const server = http.createServer(async (req, res) => {
  const parsed   = url.parse(req.url, true);
  const pathname = parsed.pathname.replace(/\/$/, '') || '/';
  const method   = req.method.toUpperCase();

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (method === 'OPTIONS') { send(res, 204, 'text/plain', ''); return; }

  const proto   = req.headers['x-forwarded-proto'] || 'http';
  const baseUrl = `${proto}://${req.headers.host}`;

  try {

    // ── Dashboard ──────────────────────────────────────────────────────────
    if (method === 'GET' && pathname === '/') {
      const machines = await loadMachines();
      // Check which machines have Excel files
      const excelStatus = {};
      await Promise.all(machines.map(async m => {
        excelStatus[m.id] = await storageExists(excelStoragePath(m.id));
      }));
      const allHistoryExists = await storageExists(ALL_HISTORY_PATH);
      send(res, 200, 'text/html', dashboardHTML(machines, excelStatus, allHistoryExists, baseUrl));
      return;
    }

    // ── Machine detail page ────────────────────────────────────────────────
    const machinePageMatch = pathname.match(/^\/machine\/(.+)$/);
    if (method === 'GET' && machinePageMatch) {
      const id       = machinePageMatch[1];
      const machines = await loadMachines();
      const m        = machines.find(x => x.id === id);
      if (!m) { send(res, 404, 'text/html', '<h2>Machine not found</h2>'); return; }
      const hasXL = await storageExists(excelStoragePath(id));
      send(res, 200, 'text/html', machineHTML(m, hasXL, baseUrl));
      return;
    }

    // ── History Excel download ─────────────────────────────────────────────
    const historyMatch = pathname.match(/^\/history\/(.+)$/);
    if (method === 'GET' && historyMatch) {
      const id   = historyMatch[1];
      const data = await storageDownload(excelStoragePath(id));
      if (!data) { send(res, 404, 'text/plain', 'No Excel file uploaded for this machine yet.'); return; }
      const safeId = id.replace(/[^a-z0-9\-]/gi, '_');
      res.writeHead(200, {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${safeId}_history.xlsx"`,
        'Content-Length': data.length,
      });
      res.end(data);
      return;
    }

    // ── All-history Excel download ─────────────────────────────────────────
    if (method === 'GET' && pathname === '/all-history') {
      const data = await storageDownload(ALL_HISTORY_PATH);
      if (!data) { send(res, 404, 'text/plain', 'No master history Excel uploaded yet.'); return; }
      res.writeHead(200, {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="All_History_Cards.xlsx"',
        'Content-Length': data.length,
      });
      res.end(data);
      return;
    }

    // ── Upload master all-history Excel ────────────────────────────────────
    if (method === 'POST' && pathname === '/api/upload-all-history') {
      const ct     = req.headers['content-type'] || '';
      const bMatch = ct.match(/boundary=([^\s;]+)/);
      if (!bMatch) { sendJSON(res, 400, { error: 'No multipart boundary found' }); return; }
      const rawBody = await readRawBody(req);
      const part    = parseMultipart(rawBody, bMatch[1]);
      if (!part || !part.data.length) { sendJSON(res, 400, { error: 'No file received' }); return; }
      await storageUpload(ALL_HISTORY_PATH, part.data,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      sendJSON(res, 200, { success: true, filename: part.filename, size: part.data.length });
      return;
    }

    // ── API: all machines ──────────────────────────────────────────────────
    if (method === 'GET' && pathname === '/api/machines') {
      const machines = await loadMachines();
      sendJSON(res, 200, machines.map(m => ({
        id: m.id, name: m.name, make: m.make, tonnage: m.tonnage,
        type: m.type, location: m.location,
      })));
      return;
    }

    // ── API: single machine GET / PUT ──────────────────────────────────────
    const apiMatch = pathname.match(/^\/api\/machines\/([^/]+)$/);
    if (apiMatch) {
      const id       = apiMatch[1];
      const machines = await loadMachines();
      const m        = machines.find(x => x.id === id);
      if (!m) { sendJSON(res, 404, { error: 'Machine not found' }); return; }

      if (method === 'GET') { sendJSON(res, 200, m); return; }

      if (method === 'PUT') {
        try {
          const body = await readBody(req);
          await updateMachine(id, body);
          sendJSON(res, 200, { success: true });
        } catch (e) {
          sendJSON(res, 400, { error: 'Update failed: ' + e.message });
        }
        return;
      }
    }

    // ── API: upload Excel for a machine ───────────────────────────────────
    const uploadMatch = pathname.match(/^\/api\/machines\/([^/]+)\/upload$/);
    if (method === 'POST' && uploadMatch) {
      const id       = uploadMatch[1];
      const machines = await loadMachines();
      const m        = machines.find(x => x.id === id);
      if (!m) { sendJSON(res, 404, { error: 'Machine not found' }); return; }

      const ct     = req.headers['content-type'] || '';
      const bMatch = ct.match(/boundary=([^\s;]+)/);
      if (!bMatch) { sendJSON(res, 400, { error: 'No multipart boundary found' }); return; }

      const rawBody = await readRawBody(req);
      const part    = parseMultipart(rawBody, bMatch[1]);
      if (!part || !part.data.length) { sendJSON(res, 400, { error: 'No file received' }); return; }

      await storageUpload(excelStoragePath(id), part.data,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      sendJSON(res, 200, { success: true, filename: part.filename, size: part.data.length });
      return;
    }

    sendJSON(res, 404, { error: 'Route not found' });

  } catch (err) {
    console.error('❌ Server error:', err);
    sendJSON(res, 500, { error: 'Internal server error', detail: err.message });
  }
});

server.listen(PORT, () => {
  console.log(`\n✅  TVS Machine QR Server (Supabase) running at  http://localhost:${PORT}`);
  console.log(`\n   Project:  ${SUPABASE_URL}`);
  console.log(`   Storage bucket: ${BUCKET}`);
  console.log(`\n   Dashboard   →  http://localhost:${PORT}/`);
  console.log(`   Machine     →  http://localhost:${PORT}/machine/FANUC-IMM`);
  console.log(`   JSON API    →  http://localhost:${PORT}/api/machines\n`);
});
