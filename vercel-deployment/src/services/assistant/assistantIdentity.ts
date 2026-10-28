import type { UserRole, User } from '@type-defs/auth';
import type {
  AssistantEmotion,
  AssistantExpression,
  AssistantState,
  AssistantIdentity,
  RoleExpressionPack,
} from '@type-defs/assistant';

/**
 * Authoritative IEC role-to-Memoji 6-expression packs.
 * Static assets served from project directory /memojis/roles/{Role}/
 * Exact source filenames from /Users/ashishmac/Downloads/Memoji preserved.
 *
 * Separation of Concerns:
 * 1. USER ROLE: Authenticated user identity (Technician, Manager, Auditor, Admin).
 * 2. ASSISTANT EXPRESSION STATE: Runtime animation state (initial, hover, idle, thinking, success, error).
 * 3. ASSISTANT CONTENT: Chat messages, suggestions, and responses.
 */
export const ROLE_ASSISTANT_IDENTITIES: Record<UserRole, AssistantIdentity> = {
  Technician: {
    role: 'Technician',
    displayName: 'Technician Support',
    avatar: '/memojis/roles/Technician/Hello.png',
    secondaryAvatar: '/memojis/Technician 2.png',
    expressions: {
      initial: '/memojis/roles/Technician/Hello.png',
      hover: '/memojis/roles/Technician/Hover.png',
      idle: '/memojis/roles/Technician/Idle.png',
      thinking: '/memojis/roles/Technician/Thinking.png',
      success: '/memojis/roles/Technician/Work done.png',
      error: '/memojis/roles/Technician/Something wrong.png',
    },
  },
  Manager: {
    role: 'Manager',
    displayName: 'Manager Support',
    avatar: '/memojis/roles/Manager/Hello.png',
    expressions: {
      initial: '/memojis/roles/Manager/Hello.png',
      hover: '/memojis/roles/Manager/Hover.png',
      idle: '/memojis/roles/Manager/Idle.png',
      thinking: '/memojis/roles/Manager/Thinking.png',
      success: '/memojis/roles/Manager/Work done.png',
      // Note: Exact filename in source folder is "Something is wrong.png"
      error: '/memojis/roles/Manager/Something is wrong.png',
    },
  },
  Auditor: {
    role: 'Auditor',
    displayName: 'Auditor Support',
    avatar: '/memojis/roles/Auditor/Hello.png',
    expressions: {
      initial: '/memojis/roles/Auditor/Hello.png',
      hover: '/memojis/roles/Auditor/Hover.png',
      idle: '/memojis/roles/Auditor/Idle.png',
      thinking: '/memojis/roles/Auditor/Thinking.png',
      success: '/memojis/roles/Auditor/Work done.png',
      error: '/memojis/roles/Auditor/Something wrong.png',
    },
  },
  Admin: {
    role: 'Admin',
    displayName: 'Admin Support',
    avatar: '/memojis/roles/Admin/Hello.png',
    expressions: {
      initial: '/memojis/roles/Admin/Hello.png',
      hover: '/memojis/roles/Admin/Hover.png',
      idle: '/memojis/roles/Admin/Idle.png',
      thinking: '/memojis/roles/Admin/Thinking.png',
      success: '/memojis/roles/Admin/Work done.png',
      error: '/memojis/roles/Admin/Something wrong.png',
    },
  },
};

/**
 * Safe fallback identity when role is missing, unauthenticated, or unknown.
 * Uses the project's original default assistant Memoji character.
 */
export const DEFAULT_EXPRESSION_PACK: RoleExpressionPack = {
  initial: '/memojis/roles/Technician/Hello.png',
  hover: '/memojis/roles/Technician/Hover.png',
  idle: '/memojis/roles/Technician/Idle.png',
  thinking: '/memojis/roles/Technician/Thinking.png',
  success: '/memojis/roles/Technician/Work done.png',
  error: '/memojis/roles/Technician/Something wrong.png',
};

export const DEFAULT_ASSISTANT_IDENTITY: AssistantIdentity = {
  role: 'Technician',
  displayName: 'Technician Support',
  avatar: '/memojis/roles/Technician/Hello.png',
  secondaryAvatar: '/memojis/Technician 2.png',
  expressions: DEFAULT_EXPRESSION_PACK,
};

/**
 * Resolves the assistant identity for a given user object or role string with graceful fallback.
 * Case-insensitive role resolution ensures exact matching across all user roles.
 */
export function getAssistantIdentity(userOrRole?: User | UserRole | string | null): AssistantIdentity {
  if (!userOrRole) {
    return DEFAULT_ASSISTANT_IDENTITY;
  }

  const rawRole = typeof userOrRole === 'object' ? userOrRole.role : userOrRole;
  if (!rawRole || typeof rawRole !== 'string') {
    return DEFAULT_ASSISTANT_IDENTITY;
  }

  const normalizedRole = (rawRole.charAt(0).toUpperCase() + rawRole.slice(1).toLowerCase()) as UserRole;
  return ROLE_ASSISTANT_IDENTITIES[normalizedRole] || ROLE_ASSISTANT_IDENTITIES[rawRole as UserRole] || DEFAULT_ASSISTANT_IDENTITY;
}

/**
 * Maps runtime assistant emotion + UI context to the canonical 6 AssistantExpressions:
 * 1. initial (Hello)
 * 2. hover (Hover)
 * 3. idle (Idle)
 * 4. error (Something wrong)
 * 5. thinking (Thinking)
 * 6. success (Work done)
 */
export function resolveAssistantState(
  emotion: AssistantEmotion,
  options?: { isHovered?: boolean; isOpen?: boolean; messageCount?: number }
): AssistantExpression {
  // 1. Active runtime emotions take precedence during processing / result delivery
  if (emotion === 'thinking') {
    return 'thinking';
  }
  if (emotion === 'success') {
    return 'success';
  }
  if (emotion === 'error') {
    return 'error';
  }
  if ((emotion as string) === 'hover' || options?.isHovered) {
    return 'hover';
  }
  if ((emotion as string) === 'initial') {
    return 'initial';
  }

  // 2. Interactive hover state (launcher or header avatar)
  if (options?.isHovered) {
    return 'hover';
  }

  // 3. Initial greeting state: launcher unopened or assistant open with 0 messages
  if (!options?.isOpen || (options?.messageCount ?? 0) === 0) {
    return 'initial';
  }

  // 4. Idle state: active conversation is ongoing and assistant is idle
  return 'idle';
}

/**
 * Centralized resolver:
 * Role / Identity + Assistant State -> Role-specific Memoji Asset URL
 */
export function getAssistantMemoji(
  identityOrRole: AssistantIdentity | UserRole | string | null | undefined,
  state: AssistantState
): string {
  const identity =
    typeof identityOrRole === 'object' && identityOrRole !== null && 'expressions' in identityOrRole
      ? identityOrRole
      : getAssistantIdentity(identityOrRole);

  const normalizedState: AssistantExpression = state === 'idle_chat' ? 'idle' : state;

  const rawUrl = (
    identity.expressions[normalizedState] ||
    identity.expressions.initial ||
    DEFAULT_EXPRESSION_PACK[normalizedState] ||
    DEFAULT_ASSISTANT_IDENTITY.avatar
  );

  return encodeURI(rawUrl);
}

/**
 * Backward compatibility alias for getAssistantMemoji
 */
export const getDisplayedMemoji = getAssistantMemoji;
