import { useState } from 'react';
import type { User, UserRole, AvatarType } from '@type-defs/auth';
import { getUserAvatar, getSenderAvatar, type ResolvedAvatar } from '@utils/avatarResolver';

export type UserAvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

interface UserAvatarProps {
  user?: Partial<User> | null;
  senderId?: string;
  senderName?: string;
  roleFallback?: UserRole;
  avatarUrl?: string;
  avatarType?: AvatarType;
  selectedMemoji?: string;
  size?: UserAvatarSize;
  className?: string;
  showBorder?: boolean;
}

const sizeClasses: Record<UserAvatarSize, { container: string; text: string; memojiScale: string }> = {
  xs: {
    container: 'w-6 h-6',
    text: 'text-[9px]',
    memojiScale: 'scale-[1.8] translate-y-[1px]',
  },
  sm: {
    container: 'w-8 h-8',
    text: 'text-xs',
    memojiScale: 'scale-[1.8] translate-y-[1.5px]',
  },
  md: {
    container: 'w-10 h-10',
    text: 'text-sm',
    memojiScale: 'scale-[1.8] translate-y-[2px]',
  },
  lg: {
    container: 'w-12 h-12',
    text: 'text-base',
    memojiScale: 'scale-[1.85] translate-y-[2.5px]',
  },
  xl: {
    container: 'w-20 h-20',
    text: 'text-2xl',
    memojiScale: 'scale-[1.85] translate-y-[4px]',
  },
  '2xl': {
    container: 'w-28 h-28',
    text: 'text-3xl',
    memojiScale: 'scale-[1.85] translate-y-[5px]',
  },
};

export function UserAvatar({
  user,
  senderId,
  senderName,
  roleFallback,
  avatarUrl,
  avatarType,
  selectedMemoji,
  size = 'md',
  className = '',
  showBorder = true,
}: UserAvatarProps) {
  const [hasImageError, setHasImageError] = useState(false);

  // Determine avatar resolution
  let resolved: ResolvedAvatar;
  if (senderId || senderName) {
    resolved = getSenderAvatar(senderId, senderName);
  } else {
    // Merge explicit overrides if provided
    const mergedUser: Partial<User> | undefined = user
      ? {
          ...user,
          avatarUrl: avatarUrl !== undefined ? avatarUrl : user.avatarUrl,
          avatarType: avatarType !== undefined ? avatarType : user.avatarType,
          selectedMemoji: selectedMemoji !== undefined ? selectedMemoji : user.selectedMemoji,
        }
      : undefined;
    resolved = getUserAvatar(mergedUser, roleFallback);
  }

  const { container, text, memojiScale } = sizeClasses[size];
  const borderStyle = showBorder ? 'border border-black/10 dark:border-white/10 shadow-sm' : '';

  return (
    <div
      className={`relative rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 dark:from-white/10 dark:to-white/5 ${container} ${borderStyle} ${className}`}
      title={resolved.alt}
    >
      {resolved.url && !hasImageError ? (
        resolved.isMemoji ? (
          <div className="w-full h-full flex items-center justify-center overflow-hidden">
            <img
              src={resolved.url}
              alt={resolved.alt}
              onError={() => setHasImageError(true)}
              className={`w-full h-full object-contain ${memojiScale} transition-transform`}
            />
          </div>
        ) : (
          <img
            src={resolved.url}
            alt={resolved.alt}
            onError={() => setHasImageError(true)}
            className="w-full h-full object-cover"
          />
        )
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-semibold">
          <span className={text}>{resolved.initials}</span>
        </div>
      )}
    </div>
  );
}
