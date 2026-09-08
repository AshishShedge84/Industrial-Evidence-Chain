import type { User, UserRole, AvatarType } from '@type-defs/auth';
import { db } from '@mocks/db';

export type RoleMemojiExpressionKey =
  | 'Hello'
  | 'Hover'
  | 'Idle'
  | 'Something wrong'
  | 'Thinking'
  | 'Work done'
  | 'Technician 2'
  | 'Technician 1';

export const ROLE_MEMOJI_EXPRESSION_KEYS: RoleMemojiExpressionKey[] = [
  'Hello',
  'Hover',
  'Idle',
  'Something wrong',
  'Thinking',
  'Work done',
];

/**
 * Default "Main Memoji" identity for each role.
 * Represents that user/role throughout profile-related identity surfaces:
 * - Admin      -> Idle
 * - Manager    -> Hover
 * - Auditor    -> Thinking
 * - Technician -> Thinking
 */
export const ROLE_DEFAULT_MAIN_MEMOJI: Record<UserRole, RoleMemojiExpressionKey> = {
  Admin: 'Idle',
  Manager: 'Hover',
  Auditor: 'Thinking',
  Technician: 'Thinking',
};

/**
 * Static asset mapping for all 4 roles across the 6 canonical expressions.
 * Sourced from /memojis/roles/{Role}/
 */
export const ROLE_MEMOJI_EXPRESSIONS: Record<UserRole, Record<'Hello' | 'Hover' | 'Idle' | 'Something wrong' | 'Thinking' | 'Work done', string>> = {
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
    // Note: Exact filename in Manager folder is "Something is wrong.png"
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

export interface ResolvedAvatar {
  type: AvatarType;
  url: string;
  isMemoji: boolean;
  alt: string;
  role: UserRole;
  initials: string;
}

/**
 * Returns the Default Main Memoji asset URL for a given role.
 */
export function getRoleMainMemoji(role?: UserRole | string | null): string {
  const safeRole = (role && role in ROLE_DEFAULT_MAIN_MEMOJI ? role : 'Technician') as UserRole;
  const mainKey = ROLE_DEFAULT_MAIN_MEMOJI[safeRole] || 'Thinking';
  return ROLE_MEMOJI_EXPRESSIONS[safeRole][mainKey as 'Hello' | 'Hover' | 'Idle' | 'Something wrong' | 'Thinking' | 'Work done'];
}

/**
 * Returns list of available Memoji choices for the specified role.
 * Includes canonical 6 expressions, plus alternative Technician 2 model for Technicians.
 */
export function getRoleMemojiExpressions(role?: UserRole | string | null): Array<{
  key: RoleMemojiExpressionKey;
  label: string;
  url: string;
}> {
  const safeRole = (role && role in ROLE_DEFAULT_MAIN_MEMOJI ? role : 'Technician') as UserRole;
  const roleMap = ROLE_MEMOJI_EXPRESSIONS[safeRole];

  const expressions: Array<{ key: RoleMemojiExpressionKey; label: string; url: string }> = ROLE_MEMOJI_EXPRESSION_KEYS.map((key) => ({
    key,
    label: key,
    url: roleMap[key as 'Hello' | 'Hover' | 'Idle' | 'Something wrong' | 'Thinking' | 'Work done'],
  }));

  // Offer Technician 2 as an alternative avatar for Technician role
  if (safeRole === 'Technician') {
    expressions.push({
      key: 'Technician 2',
      label: 'Technician 2',
      url: '/memojis/Technician 2.png',
    });
  }

  return expressions;
}

/**
 * Centralized identity avatar resolver based on the priority:
 * 1. If user selected Profile Picture (and avatarUrl exists): show profile picture.
 * 2. If user selected Memoji (and selectedMemoji exists): show that role Memoji or alternate model.
 * 3. Fallback to role's Default Main Memoji (auto-assigning Technician 2 for future technicians).
 */
export function getUserAvatar(user?: Partial<User> | null, roleFallback?: UserRole): ResolvedAvatar {
  const role = (user?.role || roleFallback || 'Technician') as UserRole;
  const safeRole = (role in ROLE_DEFAULT_MAIN_MEMOJI ? role : 'Technician') as UserRole;
  const initials = `${user?.firstName?.[0] || 'U'}${user?.lastName?.[0] || ''}`;

  const avatarType: AvatarType = user?.avatarType || (user?.avatarUrl ? 'profile' : 'memoji');

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

  // Priority 2: Selected Memoji Expression or Alternative Model
  if (user?.selectedMemoji) {
    if (user.selectedMemoji === 'Technician 2') {
      return {
        type: 'memoji',
        url: '/memojis/Technician 2.png',
        isMemoji: true,
        alt: `Technician 2 Memoji`,
        role: safeRole,
        initials,
      };
    }
    if (user.selectedMemoji === 'Technician 1') {
      return {
        type: 'memoji',
        url: '/memojis/Technician 1.png',
        isMemoji: true,
        alt: `Technician 1 Memoji`,
        role: safeRole,
        initials,
      };
    }
    const candidateKey = user.selectedMemoji as 'Hello' | 'Hover' | 'Idle' | 'Something wrong' | 'Thinking' | 'Work done';
    if (ROLE_MEMOJI_EXPRESSIONS[safeRole]?.[candidateKey]) {
      return {
        type: 'memoji',
        url: ROLE_MEMOJI_EXPRESSIONS[safeRole][candidateKey],
        isMemoji: true,
        alt: `${safeRole} ${candidateKey} Memoji`,
        role: safeRole,
        initials,
      };
    }
  }

  // Priority 3: Fallback to role's Default Main Memoji
  // For Technician role: if user ID indicates a future technician (e.g. id !== '1'),
  // automatically assign the secondary technician avatar
  let defaultUrl: string;
  let defaultMainKey: string = ROLE_DEFAULT_MAIN_MEMOJI[safeRole] || 'Thinking';

  if (safeRole === 'Technician' && user?.id && user.id !== '1' && user.id !== 'USR-001') {
    defaultUrl = '/memojis/Technician 2.png';
    defaultMainKey = 'Technician 2';
  } else {
    const canonicalKey = defaultMainKey as 'Hello' | 'Hover' | 'Idle' | 'Something wrong' | 'Thinking' | 'Work done';
    defaultUrl = ROLE_MEMOJI_EXPRESSIONS[safeRole]?.[canonicalKey] || '/memojis/roles/Technician/Thinking.png';
  }

  return {
    type: 'memoji',
    url: defaultUrl,
    isMemoji: true,
    alt: `${safeRole} ${defaultMainKey} Memoji`,
    role: safeRole,
    initials,
  };
}

/**
 * Resolves avatar for a notification sender by senderId or senderName.
 */
export function getSenderAvatar(senderId?: string, senderName?: string): ResolvedAvatar {
  try {
    // 1. System broadcast messages resolve to Admin Idle Memoji
    if (senderId === 'system' || (senderName && (senderName.toLowerCase().includes('system') || senderName.toLowerCase().includes('iec')))) {
      return getUserAvatar({ role: 'Admin', firstName: 'IEC', lastName: 'System', selectedMemoji: 'Idle' });
    }

    if (senderId) {
      const users = db.getUsers();
      const found = users.find((u) => u.id === senderId);
      if (found) {
        return getUserAvatar(found);
      }
    }

    if (senderName) {
      const users = db.getUsers();
      const lower = senderName.toLowerCase();
      const found = users.find(
        (u) =>
          `${u.firstName} ${u.lastName}`.toLowerCase() === lower ||
          u.firstName.toLowerCase() === lower
      );
      if (found) {
        return getUserAvatar(found);
      }

      // Infer role from system roles if senderName mentions Admin/Manager/etc.
      if (lower.includes('admin')) {
        return getUserAvatar({ role: 'Admin', firstName: 'Admin', lastName: 'User' });
      }
      if (lower.includes('manager')) {
        return getUserAvatar({ role: 'Manager', firstName: 'Manager' });
      }
      if (lower.includes('auditor')) {
        return getUserAvatar({ role: 'Auditor', firstName: 'Auditor' });
      }
      if (lower.includes('tech')) {
        return getUserAvatar({ role: 'Technician', firstName: 'Technician' });
      }
    }
  } catch (e) {
    // Ignore DB errors in fallback
  }

  return getUserAvatar({ role: 'Admin', firstName: 'IEC', lastName: 'System', selectedMemoji: 'Idle' });
}
