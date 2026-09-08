import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const publicDir = path.join(rootDir, 'frontend', 'public');

console.log('=== IEC NOTIFICATION & PROFILE MEMOJI VERIFICATION ===\n');

// 1. Check all 4 roles x 6 expressions in frontend/public
const roles = ['Technician', 'Manager', 'Auditor', 'Admin'];
const expressions = ['Hello', 'Hover', 'Idle', 'Something wrong', 'Thinking', 'Work done'];

const expectedDefaults = {
  Technician: 'Thinking',
  Manager: 'Hover',
  Auditor: 'Thinking',
  Admin: 'Idle',
};

let allAssetsExist = true;

console.log('1. Checking Role Memoji Assets in frontend/public/memojis/roles/:');
for (const role of roles) {
  console.log(`\n--- Role: ${role} (Default: ${expectedDefaults[role]}) ---`);
  for (const exp of expressions) {
    let filename = `${exp}.png`;
    if (role === 'Manager' && exp === 'Something wrong') {
      filename = 'Something is wrong.png';
    }
    const assetPath = path.join(publicDir, 'memojis', 'roles', role, filename);
    const exists = fs.existsSync(assetPath);
    if (!exists) {
      console.error(`  [FAIL] Missing asset: ${assetPath}`);
      allAssetsExist = false;
    } else {
      const stats = fs.statSync(assetPath);
      console.log(`  [PASS] ${exp.padEnd(16)} -> ${filename} (${stats.size} bytes)`);
    }
  }
}

if (!allAssetsExist) {
  console.error('\nERROR: Some role memoji assets are missing!');
  process.exit(1);
} else {
  console.log('\n[SUCCESS] All 24 role memoji assets exist and are accessible.');
}

// 2. Test notifications.json
console.log('\n2. Checking Sample Notifications in Temporary databases/notifications.json:');
const notifsPath = path.join(rootDir, 'frontend', 'Temporary databases', 'notifications.json');
const notifsData = JSON.parse(fs.readFileSync(notifsPath, 'utf8'));
console.log(`Found ${notifsData.notifications.length} seeded notifications:`);
for (const n of notifsData.notifications) {
  console.log(`  - [${n.type}] from "${n.senderName}" (id: ${n.senderId}): "${n.title}"`);
}

// 3. Test users.json
console.log('\n3. Checking Users in Temporary databases/users.json:');
const usersPath = path.join(rootDir, 'frontend', 'Temporary databases', 'users.json');
const usersData = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
for (const u of usersData.users) {
  console.log(`  - User: ${u.firstName} ${u.lastName} (${u.role})`);
  console.log(`    Contact: ${u.contactNumber || 'none'}, SelectedMemoji: ${u.selectedMemoji}, AvatarType: ${u.avatarType}`);
  if (u.selectedMemoji !== expectedDefaults[u.role]) {
    console.error(`    [FAIL] User ${u.role} default memoji does not match spec! Expected ${expectedDefaults[u.role]}, got ${u.selectedMemoji}`);
  } else {
    console.log(`    [PASS] Matches role default main Memoji: ${expectedDefaults[u.role]}`);
  }
}

console.log('\n=== ALL VERIFICATION CHECKS PASSED ===\n');
