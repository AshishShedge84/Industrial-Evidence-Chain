import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { AssistantEmotion } from '@type-defs/assistant';
import { useAssistant } from '@hooks/useAssistant';
import {
  getAssistantIdentity,
  getDisplayedMemoji,
  resolveAssistantState,
  DEFAULT_ASSISTANT_IDENTITY,
} from '@services/assistant/assistantIdentity';

interface AssistantMemojiProps {
  emotion: AssistantEmotion;
  className?: string;
  isHovered?: boolean;
  role?: string;
}

export function AssistantMemoji({
  emotion,
  className = '',
  isHovered = false,
  role,
}: AssistantMemojiProps) {
  const { messages, isOpen, identity: contextIdentity } = useAssistant();
  const [hasError, setHasError] = useState(false);

  // Centralized identity: prefer explicitly passed role if provided, otherwise context identity
  const currentIdentity = role
    ? getAssistantIdentity(role)
    : contextIdentity || DEFAULT_ASSISTANT_IDENTITY;

  // Resolve runtime animation/interaction state
  const state = resolveAssistantState(emotion, {
    isHovered,
    isOpen,
    messageCount: messages.length,
  });

  // Resolve displayed Memoji via centralized pipeline
  const displayedSrc = getDisplayedMemoji(currentIdentity, state);
  const imageSrc = hasError ? DEFAULT_ASSISTANT_IDENTITY.avatar : displayedSrc;

  // Preload expression pack for this role to avoid flicker during transitions
  useEffect(() => {
    if (currentIdentity?.expressions) {
      Object.values(currentIdentity.expressions).forEach((url) => {
        if (url) {
          const img = new Image();
          img.src = encodeURI(url);
        }
      });
    }
  }, [currentIdentity.role]);

  // Reset error fallback whenever identity or state changes
  useEffect(() => {
    setHasError(false);
  }, [currentIdentity.role, state]);

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <AnimatePresence mode="wait">
        <motion.img
          key={`${currentIdentity.role}-${state}-${imageSrc}`}
          src={imageSrc}
          alt={`${currentIdentity.displayName} (${state})`}
          onError={() => setHasError(true)}
          className="absolute w-full h-full object-contain"
          initial={{ opacity: 0, scale: 0.96, y: 4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -4 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        />
      </AnimatePresence>
    </div>
  );
}
