import { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import { useAssistant } from '@hooks/useAssistant';

export function AssistantInput() {
  const [input, setInput] = useState('');
  const { sendMessage, isThinking } = useAssistant();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus input on mount
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isThinking) {
      sendMessage(input.trim());
      setInput('');
    }
  };

  return (
    <div className="p-4 bg-white/40 dark:bg-black/20 backdrop-blur-md rounded-b-2xl border-t border-gray-200/50 dark:border-white/10">
      <form onSubmit={handleSubmit} className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          disabled={isThinking}
          className="w-full pl-4 pr-12 py-3 bg-white/60 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-xl text-[15px] text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!input.trim() || isThinking}
          className="absolute right-2 p-2 rounded-lg text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-500/10 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
          aria-label="Send message"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
}
