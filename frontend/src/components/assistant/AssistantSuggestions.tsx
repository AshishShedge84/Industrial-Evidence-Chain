import { useAssistant } from '@hooks/useAssistant';

export function AssistantSuggestions() {
  const { suggestions, sendMessage, isThinking, messages } = useAssistant();

  if (suggestions.length === 0 || isThinking) {
    return null;
  }

  return (
    <div className="flex overflow-x-auto gap-2 mt-4 pb-2 scrollbar-hide snap-x">
      {suggestions.map((suggestion, idx) => (
        <button
          key={idx}
          onClick={() => sendMessage(suggestion)}
          className="flex-shrink-0 snap-start px-3.5 py-2 text-[13px] font-medium text-primary-700 dark:text-primary-300 bg-white/50 dark:bg-black/30 backdrop-blur-md border border-primary-200/50 dark:border-primary-500/30 rounded-full shadow-sm hover:bg-white dark:hover:bg-primary-900/50 transition-all"
        >
          {suggestion}
        </button>
      ))}
    </div>
  );
}
