export type AssistantEmotion = 'idle' | 'thinking' | 'success' | 'error';

export type AssistantExpression =
  | 'initial'
  | 'hover'
  | 'idle'
  | 'thinking'
  | 'success'
  | 'error';

export type AssistantState = AssistantExpression | 'idle_chat';

export interface RoleExpressionPack {
  initial: string;
  hover: string;
  idle: string;
  thinking: string;
  success: string;
  error: string;
}

export interface AssistantIdentity {
  role: string;
  displayName: string;
  avatar: string;
  secondaryAvatar?: string;
  expressions: RoleExpressionPack;
}

export type ChatRole = 'user' | 'assistant' | 'system';

export interface ChatAction {
  label: string;
  action: string;
  payload?: any;
}

export interface ChatMessage {
  id: string;
  role: ChatRole;
  text: string;
  timestamp: string;
  actions?: ChatAction[];
  emotion?: AssistantEmotion;
  isComposer?: boolean;
  composerPayload?: {
    recipientId?: string;
    message?: string;
  };
}

export type AssistantIntent = 
  | 'asset_lookup'
  | 'asset_help'
  | 'evidence_help'
  | 'verification_lookup'
  | 'verification_help'
  | 'audit_lookup'
  | 'user_lookup'
  | 'role_help'
  | 'profile_help'
  | 'settings_help'
  | 'notification_send'
  | 'notification_lookup'
  | 'navigation'
  | 'general_greeting'
  | 'unknown';

export interface AssistantContext {
  userId: string;
  role: string;
  name: string;
  currentPath: string;
  lastResponse?: string;
}
