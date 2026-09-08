import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@hooks/useAuth';
import { assistantService } from '@services/assistant/assistantService';
import { getAssistantIdentity } from '@services/assistant/assistantIdentity';
import type { ChatMessage, AssistantEmotion, ChatAction, AssistantIdentity } from '@type-defs/assistant';

interface AssistantContextType {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  toggleAssistant: () => void;
  messages: ChatMessage[];
  emotion: AssistantEmotion;
  isThinking: boolean;
  suggestions: string[];
  identity: AssistantIdentity;
  sendMessage: (text: string) => void;
  handleAction: (action: ChatAction) => void;
  addMessage: (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
}

const AssistantContext = createContext<AssistantContextType | undefined>(undefined);

export function AssistantProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [emotion, setEmotion] = useState<AssistantEmotion>('idle');
  const [isThinking, setIsThinking] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  // Centralized identity derived from authenticated role
  const identity = useMemo(() => getAssistantIdentity(user?.role), [user?.role]);

  // Clean reset on role switch to ensure no stale messages or emotion
  useEffect(() => {
    setMessages([]);
    setEmotion('idle');
  }, [user?.id, user?.role]);

  const updateSuggestions = useCallback((lastResponseText?: string) => {
    if (user) {
      setSuggestions(assistantService.getSuggestions({
        userId: user.id,
        role: user.role,
        name: user.firstName,
        currentPath: location.pathname,
        lastResponse: lastResponseText
      }));
    }
  }, [user, location.pathname]);

  useEffect(() => {
    updateSuggestions();
  }, [updateSuggestions]);

  const toggleAssistant = useCallback(() => {
    setIsOpen(prev => {
      if (prev) {
        setEmotion('idle'); // Reset on close
      }
      return !prev;
    });
  }, []);

  const addMessage = useCallback((msg: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const newMessage: ChatMessage = {
      ...msg,
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, newMessage]);
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    if (!user || !text.trim() || isThinking) return;

    addMessage({ role: 'user', text });
    setIsThinking(true);
    setEmotion('thinking');

    try {
      // 1. Get raw response from engine
      const response = await assistantService.processMessage(text, {
        userId: user.id,
        role: user.role,
        name: user.firstName,
        currentPath: location.pathname
      });

      // 2. Minimum visual delay for choreography (3 seconds)
      await new Promise(r => setTimeout(r, 3000));

      // 3. Update emotion
      setEmotion(response.emotion);
      
      // 4. Update suggestions dynamically based on response
      updateSuggestions(response.text);

      // 5. Present response
      if (response.actions?.length === 1 && ['CANCEL_COMPOSER', 'CLEAR_COMPOSER'].includes(response.actions[0].action)) {
        handleAction(response.actions[0]);
      } else {
        addMessage({
          role: 'assistant',
          text: response.text,
          actions: response.actions,
          emotion: response.emotion,
          isComposer: response.isComposer,
          composerPayload: response.composerPayload
        });
      }
      
      setTimeout(() => {
        setEmotion(prev => (prev === 'error' ? 'error' : 'idle'));
      }, 3000);

    } catch (error) {
      await new Promise(r => setTimeout(r, 3000));
      setEmotion('error');
      addMessage({
        role: 'assistant',
        text: 'Something went wrong while processing your request.',
        emotion: 'error'
      });
    } finally {
      setIsThinking(false);
    }
  }, [user, location.pathname, addMessage, updateSuggestions, isThinking]);

  const handleAction = useCallback((action: ChatAction) => {
    if (action.action === 'SEND_NOTIFICATION' && action.payload) {
      import('@services/notification/notificationService').then(({ notificationService }) => {
        if (user) {
          notificationService.sendNotification({
            recipientId: action.payload.recipientId,
            senderId: user.id,
            senderName: `${user.firstName} ${user.lastName}`,
            title: 'New Message',
            message: action.payload.message,
            type: 'message'
          });
          
          addMessage({ role: 'system', text: 'Message sent successfully.', emotion: 'success' });
          setEmotion('success');
          setTimeout(() => setEmotion('idle'), 3000);
        }
      });
    } else if (action.action === 'OPEN_COMPOSER') {
      addMessage({ 
        role: 'assistant', 
        text: '', 
        emotion: 'idle',
        isComposer: true,
        composerPayload: action.payload
      });
    } else if (action.action === 'CANCEL_COMPOSER') {
      setMessages(prev => {
        const lastComposerIdx = prev.map(m => m.isComposer).lastIndexOf(true);
        if (lastComposerIdx >= 0) {
          const newArr = [...prev];
          newArr.splice(lastComposerIdx, 1);
          return newArr;
        }
        return prev;
      });
      addMessage({ role: 'system', text: 'Composer cancelled.', emotion: 'idle' });
    } else if (action.action === 'CLEAR_COMPOSER') {
      setMessages(prev => {
        const lastComposerIdx = prev.map(m => m.isComposer).lastIndexOf(true);
        if (lastComposerIdx >= 0) {
          const newArr = [...prev];
          // Modify ID to force React to remount MessageComposer and reset internal state
          newArr[lastComposerIdx] = { 
             ...newArr[lastComposerIdx], 
             id: `msg_${Date.now()}_clear`,
             composerPayload: {} 
          };
          return newArr;
        }
        return prev;
      });
      addMessage({ role: 'system', text: 'Composer cleared.', emotion: 'idle' });
    } else if (action.action === 'CANCEL') {
      addMessage({ role: 'system', text: 'Action cancelled.', emotion: 'idle' });
    }
  }, [addMessage, user]);

  return (
    <AssistantContext.Provider value={{
      isOpen, setIsOpen, toggleAssistant, messages, emotion, isThinking,
      suggestions, sendMessage, handleAction, addMessage, identity
    }}>
      {children}
    </AssistantContext.Provider>
  );
}

export function useAssistantContext() {
  const context = useContext(AssistantContext);
  if (!context) {
    throw new Error('useAssistantContext must be used within an AssistantProvider');
  }
  return context;
}
