import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sqlPath = path.resolve(__dirname, '../../database/iec_db_authoritative_backup.sql');
const sqlContent = fs.readFileSync(sqlPath, 'utf8');

function parseCopyBlocks(content) {
  const blocks = {};
  const copyRegex = /COPY\s+public\.([a-zA-Z0-9_"]+)\s*\(([^)]+)\)\s+FROM\s+stdin;([\s\S]*?)\\\./g;
  
  let match;
  while ((match = copyRegex.exec(content)) !== null) {
    const rawTableName = match[1].replace(/"/g, '');
    const columns = match[2].split(',').map(c => c.trim().replace(/"/g, ''));
    const rowsRaw = match[3].trim().split('\n');
    
    const rows = [];
    for (const line of rowsRaw) {
      if (!line.trim() || line.trim() === '\\.') continue;
      const parts = line.split('\t');
      const row = {};
      columns.forEach((col, idx) => {
        let val = parts[idx];
        if (val === '\\N' || val === undefined) {
          val = null;
        }
        row[col] = val;
      });
      rows.push(row);
    }
    blocks[rawTableName] = rows;
  }
  return blocks;
}

const data = parseCopyBlocks(sqlContent);
const rawUsers = data.users || [];
const rawRoles = data.roles || [];
const rawUserRoles = data.user_roles || [];
const rawAssets = data.assets || [];
const rawEvidence = data.evidence_records || [];
const rawMedia = data.evidence_media || [];
const rawProofs = data.blockchain_proofs || [];
const rawAuditLogs = data.audit_logs || [];

const roleMap = {};
rawRoles.forEach(r => { roleMap[r.role_id] = r.name; });

const userRoleMap = {};
rawUserRoles.forEach(ur => { userRoleMap[ur.user_id] = roleMap[ur.role_id] || 'Technician'; });

const users = rawUsers.map(u => {
  const role = userRoleMap[u.user_id] || 'Technician';
  const nameParts = (u.full_name || u.username || 'User').split(' ');
  const firstName = nameParts[0] || 'User';
  const lastName = nameParts.slice(1).join(' ') || '';
  return {
    id: u.user_id,
    email: u.email,
    username: u.username,
    fullName: u.full_name,
    firstName,
    lastName,
    role,
    status: u.is_active === 't' ? 'active' : 'suspended',
    createdAt: u.created_at || '2026-09-09T07:21:37.536Z',
    updatedAt: u.updated_at || u.created_at || '2026-09-09T07:21:37.536Z',
  };
});

const assets = rawAssets.map(a => {
  let locationRaw = a.location;
  try { if (typeof locationRaw === 'string') locationRaw = JSON.parse(locationRaw); } catch { locationRaw = { site: locationRaw || 'Facility' }; }
  
  const location = {
    site: locationRaw?.site || locationRaw?.Site || 'Main Facility',
    building: locationRaw?.building || locationRaw?.Building || undefined,
    floor: locationRaw?.floor || locationRaw?.Floor || undefined,
    room: locationRaw?.room || locationRaw?.Room || undefined,
  };

  let specifications = a.specifications;
  try { if (typeof specifications === 'string') specifications = JSON.parse(specifications); } catch { specifications = {}; }
  return {
    id: a.asset_id,
    assetTag: a.asset_code,
    name: a.name,
    description: a.description || '',
    category: a.category || 'Machinery',
    status: a.status || 'Active',
    location,
    specifications: specifications || {},
    qrCode: a.asset_code,
    createdBy: a.created_by_user_id,
    assignedTo: a.assigned_to_user_id || undefined,
    createdAt: a.created_at || '2026-09-09T07:34:15.130Z',
    updatedAt: a.updated_at || a.created_at || '2026-09-09T07:34:15.130Z',
  };
});

const mediaByEvidence = {};
rawMedia.forEach(m => {
  if (!mediaByEvidence[m.evidence_id]) mediaByEvidence[m.evidence_id] = [];
  mediaByEvidence[m.evidence_id].push({
    id: m.media_id,
    type: (m.file_type || '').toLowerCase().includes('video') ? 'video' : 'photo',
    url: m.storage_url,
    size: Number(m.file_size_bytes) || 0,
    mimeType: m.file_type === 'Video' ? 'video/webm' : 'image/jpeg',
    checksum: m.file_hash,
    capturedAt: m.uploaded_at || '2026-09-09T17:04:22.770Z',
    uploadedAt: m.uploaded_at || '2026-09-09T17:04:22.770Z',
  });
});

const proofByEvidence = {};
const proofs = [];

rawProofs.forEach(p => {
  const proofObj = {
    transactionId: p.transaction_id,
    blockNumber: 104250,
    blockHash: `0x${p.evidence_hash}`,
    merkleRoot: `0x${p.evidence_hash}`,
    merkleProof: [`0x${p.evidence_hash}`],
    timestamp: p.anchored_at || p.created_at || '2026-09-09T17:04:22.855Z',
    network: 'Hyperledger Fabric (IEC Industrial Channel)',
  };
  proofs.push(proofObj);
  proofByEvidence[p.evidence_id] = proofObj;
});

const assetMap = {};
assets.forEach(a => { assetMap[a.id] = a; });

const evidence = rawEvidence.map(e => {
  const asset = assetMap[e.asset_id];
  const media = mediaByEvidence[e.evidence_id] || [];
  const proof = proofByEvidence[e.evidence_id] || undefined;
  let timestamp = e.timestamp;
  if (timestamp === '-infinity' || !timestamp) timestamp = e.created_at || '2026-09-09T15:03:00.472Z';
  const lat = e.latitude && e.latitude !== '\\N' ? Number(e.latitude) : 19.076;
  const lng = e.longitude && e.longitude !== '\\N' ? Number(e.longitude) : 72.8777;

  return {
    evidenceId: e.evidence_id,
    assetId: e.asset_id,
    userId: e.user_id,
    activityType: e.activity_type || 'Maintenance',
    timestamp,
    location: { latitude: lat, longitude: lng, timestamp },
    description: e.description || '',
    mediaReferences: media,
    status: e.anchor_status === 'Anchored' ? 'Anchored' : 'Submitted',
    blockchainProof: proof,
    evidenceHash: e.evidence_hash || undefined,
    assetName: asset?.name || 'Industrial Asset',
    assetCode: asset?.assetTag || 'ASSET',
    createdAt: e.created_at || '2026-09-09T15:03:00.472Z',
    updatedAt: e.created_at || '2026-09-09T15:03:00.472Z',
    anchoredAt: proof ? proof.timestamp : undefined,
  };
});

const auditLogs = rawAuditLogs.slice(0, 50).map(l => {
  let details = l.details;
  try { if (typeof details === 'string') details = JSON.parse(details); } catch { details = { raw: details }; }
  return {
    id: l.audit_log_id,
    userId: l.user_id,
    action: l.action,
    entityType: l.entity_type,
    entityId: l.entity_id,
    details: details || {},
    ipAddress: l.ip_address || '127.0.0.1',
    createdAt: l.created_at || '2026-09-09T07:21:37.536Z',
  };
});

const outPath = path.resolve(__dirname, '../src/data/authoritativeSeed.ts');
const fileContent = `// Authoritative IEC Database Seed Data
// Automatically extracted and normalized from database/iec_db_authoritative_backup.sql

import type { User } from '@type-defs/auth';
import type { Asset } from '@type-defs/asset';
import type { Evidence, BlockchainProof } from '@type-defs/evidence';
import type { Notification } from '@type-defs/notification';

export const SEEDED_USERS: User[] = ${JSON.stringify(users, null, 2)};

export const SEEDED_ASSETS: Asset[] = ${JSON.stringify(assets, null, 2)};

export const SEEDED_EVIDENCE: Evidence[] = ${JSON.stringify(evidence, null, 2)};

export const SEEDED_PROOFS: BlockchainProof[] = ${JSON.stringify(proofs, null, 2)};

export const SEEDED_AUDIT_LOGS = ${JSON.stringify(auditLogs, null, 2)};

export const SEEDED_NOTIFICATIONS: Notification[] = [
  {
    id: 'NOT-INIT-001',
    recipientId: 'all',
    senderId: 'system',
    senderName: 'IEC Ledger Engine',
    title: 'Cloud Node Online',
    message: 'Vercel Deployment connected to Firebase Firestore and Hyperledger Fabric anchor stream.',
    type: 'success',
    read: false,
    createdAt: '2026-09-11T13:42:00.000Z',
  },
  {
    id: 'NOT-INIT-002',
    recipientId: '30ed513f-8fc1-4ca1-aa3c-6d8675642f80',
    senderId: 'system',
    senderName: 'Security Monitor',
    title: 'Authoritative Data Synchronized',
    message: '16 evidence records and 4 critical assets synchronized from authoritative SQL backup.',
    type: 'info',
    read: false,
    createdAt: '2026-09-11T13:42:00.000Z',
  }
];
`;

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, fileContent, 'utf8');
console.log(`Successfully generated authoritative seed at: ${outPath}`);
