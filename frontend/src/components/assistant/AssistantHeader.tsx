import { useState } from 'react';
import { X, Minimize2 } from 'lucide-react';
import { AssistantMemoji } from './AssistantMemoji';
import { useAuth } from '@hooks/useAuth';
import { useAssistant } from '@hooks/useAssistant';

export function AssistantHeader() {
  const { user } = useAuth();
  const { toggleAssistant, emotion } = useAssistant();
  const [isAvatarHovered, setIsAvatarHovered] = useState(false);

  return (
    <div className="flex items-center justify-between p-4 border-b border-gray-200/50 dark:border-white/10 bg-white/40 dark:bg-black/20 backdrop-blur-md rounded-t-2xl">
      <div className="flex items-center gap-3">
        <div
          className="relative w-12 h-12 bg-white/50 dark:bg-black/30 rounded-full border border-gray-200 dark:border-white/10 flex items-center justify-center overflow-hidden cursor-pointer transition-transform hover:scale-105"
          onMouseEnter={() => setIsAvatarHovered(true)}
          onMouseLeave={() => setIsAvatarHovered(false)}
        >
          <AssistantMemoji emotion={emotion} isHovered={isAvatarHovered} className="w-full h-full scale-[2] translate-y-[3px]" />
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-900 rounded-full"></div>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white leading-tight">IEC Assistant</h3>
          {user && (
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
              {user.role} Support
            </p>
          )}
        </div>
      </div>
      <button 
        onClick={toggleAssistant}
        className="p-2 hover:bg-gray-200/50 dark:hover:bg-white/10 rounded-full transition-colors text-gray-500 dark:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
        aria-label="Close Assistant"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}
