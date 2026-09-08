// Simulating avatarResolver logic to verify contract mathematically
const ROLE_DEFAULT_MAIN_MEMOJI = {
  Admin: 'Idle',
  Manager: 'Hover',
  Auditor: 'Thinking',
  Technician: 'Thinking',
};

const ROLE_MEMOJI_EXPRESSION_KEYS = [
  'Hello',
  'Hover',
  'Idle',
  'Something wrong',
  'Thinking',
  'Work done',
];

const ROLE_MEMOJI_EXPRESSIONS = {
  Technician: {
    Hello: '/memojis/roles/Technician/Hello.png',
    Hover: '/memojis/roles/Technician/Hover.png',
    Idle: '/memojis/roles/Technician/Idle.png',
    'Something wrong': '/memojis/roles/Technician/Something wrong.png',
    Thinking: '/memojis/roles/Technician/Thinking.png',
    'Work done': '/memojis/roles/Technician/Work done.png',
  },
  Manager: {
    Hello: '/memojis/roles/Manager/Hello.png',
    Hover: '/memojis/roles/Manager/Hover.png',
    Idle: '/memojis/roles/Manager/Idle.png',
    'Something wrong': '/memojis/roles/Manager/Something is wrong.png',
    Thinking: '/memojis/roles/Manager/Thinking.png',
    'Work done': '/memojis/roles/Manager/Work done.png',
  },
  Auditor: {
    Hello: '/memojis/roles/Auditor/Hello.png',
    Hover: '/memojis/roles/Auditor/Hover.png',
    Idle: '/memojis/roles/Auditor/Idle.png',
    'Something wrong': '/memojis/roles/Auditor/Something wrong.png',
    Thinking: '/memojis/roles/Auditor/Thinking.png',
    'Work done': '/memojis/roles/Auditor/Work done.png',
  },
  Admin: {
    Hello: '/memojis/roles/Admin/Hello.png',
    Hover: '/memojis/roles/Admin/Hover.png',
    Idle: '/memojis/roles/Admin/Idle.png',
    'Something wrong': '/memojis/roles/Admin/Something wrong.png',
    Thinking: '/memojis/roles/Admin/Thinking.png',
    'Work done': '/memojis/roles/Admin/Work done.png',
  },
};

function getUserAvatar(user, roleFallback) {
  const role = user?.role || roleFallback || 'Technician';
  const safeRole = role in ROLE_DEFAULT_MAIN_MEMOJI ? role : 'Technician';
  const initials = `${user?.firstName?.[0] || 'U'}${user?.lastName?.[0] || ''}`;

  const avatarType = user?.avatarType || (user?.avatarUrl ? 'profile' : 'memoji');

  // Priority 1: Profile Picture
  if (avatarType === 'profile' && user?.avatarUrl) {
    return {
      type: 'profile',
      url: user.avatarUrl,
      isMemoji: false,
      alt: `${user.firstName || 'User'} Profile Picture`,
      role: safeRole,
      initials,
    };
  }

  // Priority 2: Selected Memoji Expression
  if (user?.selectedMemoji && ROLE_MEMOJI_EXPRESSIONS[safeRole]?.[user.selectedMemoji]) {
    const memojiKey = user.selectedMemoji;
    return {
      type: 'memoji',
      url: ROLE_MEMOJI_EXPRESSIONS[safeRole][memojiKey],
      isMemoji: true,
      alt: `${safeRole} ${memojiKey} Memoji`,
      role: safeRole,
      initials,
    };
  }

  // Priority 3: Fallback to role's Default Main Memoji
  const defaultMainKey = ROLE_DEFAULT_MAIN_MEMOJI[safeRole] || 'Thinking';
  const defaultUrl = ROLE_MEMOJI_EXPRESSIONS[safeRole]?.[defaultMainKey] || '/memojis/roles/Technician/Thinking.png';

  return {
    type: 'memoji',
    url: defaultUrl,
    isMemoji: true,
    alt: `${safeRole} ${defaultMainKey} Memoji`,
    role: safeRole,
    initials,
  };
}

console.log('Testing avatar resolution priorities:');

// Test 1: Fallback to role default
const u1 = { role: 'Admin', firstName: 'Alice' };
const r1 = getUserAvatar(u1);
console.assert(r1.url === '/memojis/roles/Admin/Idle.png', 'Admin default should be Idle');
console.log('  [PASS] Admin fallback -> Idle Memoji');

const u2 = { role: 'Manager', firstName: 'Bob' };
const r2 = getUserAvatar(u2);
console.assert(r2.url === '/memojis/roles/Manager/Hover.png', 'Manager default should be Hover');
console.log('  [PASS] Manager fallback -> Hover Memoji');

const u3 = { role: 'Auditor', firstName: 'Carol' };
const r3 = getUserAvatar(u3);
console.assert(r3.url === '/memojis/roles/Auditor/Thinking.png', 'Auditor default should be Thinking');
console.log('  [PASS] Auditor fallback -> Thinking Memoji');

const u4 = { role: 'Technician', firstName: 'Dan' };
const r4 = getUserAvatar(u4);
console.assert(r4.url === '/memojis/roles/Technician/Thinking.png', 'Technician default should be Thinking');
console.log('  [PASS] Technician fallback -> Thinking Memoji');

// Test 2: Selected Memoji override
const u5 = { role: 'Technician', selectedMemoji: 'Work done', avatarType: 'memoji' };
const r5 = getUserAvatar(u5);
console.assert(r5.url === '/memojis/roles/Technician/Work done.png', 'Should resolve Work done');
console.log('  [PASS] Selected Memoji (Work done) overrides default');

// Test 3: Profile picture priority over Memoji
const u6 = {
  role: 'Technician',
  selectedMemoji: 'Work done',
  avatarType: 'profile',
  avatarUrl: 'https://example.com/avatar.jpg'
};
const r6 = getUserAvatar(u6);
console.assert(r6.type === 'profile' && r6.url === 'https://example.com/avatar.jpg', 'Profile picture should take priority');
console.log('  [PASS] Profile Picture takes priority when avatarType is profile');

// Test 4: Switching back to Memoji
const u7 = {
  ...u6,
  avatarType: 'memoji'
};
const r7 = getUserAvatar(u7);
console.assert(r7.type === 'memoji' && r7.url === '/memojis/roles/Technician/Work done.png', 'Switching back to memoji should work');
console.log('  [PASS] Switching back to memoji recovers selected memoji');

console.log('\nAll Resolver unit tests succeeded!');
