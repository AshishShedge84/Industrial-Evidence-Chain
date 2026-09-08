import { db } from '@mocks/db';
import type { ChatMessage, AssistantContext, ChatAction, AssistantEmotion } from '@type-defs/assistant';
import { notificationService } from '../notification/notificationService';

export interface ChatResponse {
  text: string;
  actions?: ChatAction[];
  emotion: AssistantEmotion;
  isComposer?: boolean;
  composerPayload?: { recipientId?: string; message?: string; };
}

interface SessionState {
  lastEntityId?: string;
  pendingMessage?: {
    recipientId: string;
    recipientName: string;
    messageText: string;
  };
}

// In-memory session state (resets on refresh)
const sessionState: Record<string, SessionState> = {};

export const assistantService = {
  async processMessage(message: string, context: AssistantContext): Promise<ChatResponse> {
    const text = message.toLowerCase();
    const userId = context.userId;
    
    // Initialize session if missing
    if (!sessionState[userId]) {
      sessionState[userId] = {};
    }
    const session = sessionState[userId];

    // 1. PENDING WORKFLOWS (e.g. sending a message)
    if (session.pendingMessage) {
      if (text === 'cancel' || text.includes('nevermind') || text.includes('stop')) {
        session.pendingMessage = undefined;
        return {
          text: "",
          emotion: 'idle',
          actions: [{ label: '', action: 'CANCEL_COMPOSER' }]
        };
      }
      if (text === 'clear' || text.includes('start over')) {
        return {
          text: "",
          emotion: 'idle',
          actions: [{ label: '', action: 'CLEAR_COMPOSER' }]
        };
      }
      if (text === 'send' || text.includes('yes send it')) {
        return {
          text: "Please use the Send button on the composer to confirm.",
          emotion: 'idle'
        };
      }
    }

    // 2. IDENTIFY ENTITIES
    const evMatch = message.match(/(EV-\d{3})/i);
    const assetMatch = message.match(/([A-Z]+-\d{3})/i);
    
    let targetEntity = evMatch ? evMatch[1].toUpperCase() : (assetMatch ? assetMatch[1].toUpperCase() : undefined);
    
    // Context resolution ("it", "kab hua tha", "this evidence")
    if (!targetEntity && session.lastEntityId && (text.includes('it') || text.includes('this') || text.includes('that') || text.includes('kab'))) {
      targetEntity = session.lastEntityId;
    }
    
    if (targetEntity) {
      session.lastEntityId = targetEntity; // Update context
    }

    const isMessageIntent = text.includes('tell ') || text.includes('message ') || text.includes('notify ') || text.includes('send notification') || text.includes('contact ') || text.includes('inform ') || text === 'message' || text === 'send a message' || text === 'send message' || text === 'send' || text === 'message someone' || text === 'contact someone' || text === 'inform someone' || text === 'i want to send a message' || text === 'i need to contact someone' || text.includes('send an update') || text.includes('send a message to') || text.includes('communicate this') || text.includes('send this to');

    // Make sure it doesn't match queries like "What is a message?"
    const isQueryAboutMessages = text.includes('what is') || text.includes('what are') || text.includes('show me') || text.includes('what does') || text.includes('explain') || text.includes('why did');

    if (isMessageIntent && !isQueryAboutMessages) {
      
      const users = db.getUsers();
      const targetUser = users.find(u => text.includes(u.firstName.toLowerCase()) || text.includes(u.lastName.toLowerCase()));
      
      if (targetUser && context.role === 'Technician' && targetUser.role === 'Admin') {
        return {
          text: `You don't have permission to message ${targetUser.firstName} directly.`,
          emotion: 'error'
        };
      }
      
      let msgContent = "";
      if (targetUser) {
        // Extract message content robustly
        const keywords = ['saying', 'that', 'to', 'send notification to', 'send notification', 'tell', 'message', 'notify', 'contact', 'inform'];
        // We do a simple extraction after the name if possible
        const fullName = `${targetUser.firstName} ${targetUser.lastName}`.toLowerCase();
        let startIndex = text.indexOf(fullName);
        let nameLen = fullName.length;
        if (startIndex === -1) {
          startIndex = text.indexOf(targetUser.firstName.toLowerCase());
          nameLen = targetUser.firstName.length;
        }
        
        if (startIndex !== -1) {
           let remainingText = text.slice(startIndex + nameLen).trim();
           if (remainingText.startsWith('saying ')) remainingText = remainingText.slice(7).trim();
           if (remainingText.startsWith('that ')) remainingText = remainingText.slice(5).trim();
           if (remainingText.startsWith('to ')) remainingText = remainingText.slice(3).trim();
           
           remainingText = remainingText.replace(/^["'](.*)["']$/, '$1').trim();
           if (remainingText.length > 0) {
              msgContent = remainingText.charAt(0).toUpperCase() + remainingText.slice(1);
           }
        }
      }

      session.pendingMessage = {
        recipientId: targetUser?.id || '',
        recipientName: targetUser?.firstName || '',
        messageText: msgContent
      };

      return {
        text: "", // No intermediate message
        emotion: 'idle',
        isComposer: true,
        composerPayload: {
          recipientId: targetUser?.id || '',
          message: msgContent
        }
      };
    }

    // 4. INTENT: VERIFICATION LOOKUP
    if ((text.includes('verified') || text.includes('verification')) && targetEntity && targetEntity.startsWith('EV-')) {
      const ev = db.getEvidence().find(e => e.evidenceId === targetEntity);
      if (!ev) {
        return { text: `I couldn't find evidence record ${targetEntity} in the available verification records.`, emotion: 'error' };
      }
      const vResult = db.getVerificationResults().find(v => v.evidenceId === targetEntity);
      if (vResult) {
        if (vResult.isValid) {
          return {
            text: `Yes. ${targetEntity} is marked Verified. The latest verification record shows it passed the integrity check.`,
            actions: [
              { label: `Open ${targetEntity}`, action: 'NAVIGATE', payload: `/evidence/${targetEntity}` },
              { label: 'Show verification proof', action: 'NAVIGATE', payload: `/verify/${targetEntity}` }
            ],
            emotion: 'success'
          };
        } else {
          return {
            text: `${targetEntity} failed verification due to an integrity mismatch.`,
            actions: [
              { label: 'Explain integrity mismatch', action: 'NAVIGATE', payload: `/verify/${targetEntity}` }
            ],
            emotion: 'error'
          };
        }
      } else {
        return {
          text: `That evidence is currently ${ev.status}. The capture and submission steps are complete, but the blockchain anchor hasn't been completed yet.`,
          actions: [
            { label: 'View evidence', action: 'NAVIGATE', payload: `/evidence/${targetEntity}` },
            { label: 'Explain anchoring', action: 'NAVIGATE', payload: `/verify` }
          ],
          emotion: 'idle'
        };
      }
    }

    // 5. INTENT: PENDING/STATUS REASON
    if (text.includes('why') && (text.includes('pending') || text.includes('status')) && targetEntity && targetEntity.startsWith('EV-')) {
      const ev = db.getEvidence().find(e => e.evidenceId === targetEntity);
      if (ev?.status === 'Submitted') {
        return {
          text: `That evidence is currently Submitted (Pending Anchor). The capture and submission steps are complete, but the blockchain anchor hasn't been completed yet.`,
          actions: [
            { label: 'View evidence', action: 'NAVIGATE', payload: `/evidence/${targetEntity}` },
            { label: 'Explain anchoring', action: 'NAVIGATE', payload: `/verify` }
          ],
          emotion: 'success'
        };
      }
    }

    // 6. INTENT: DATE/WHEN CONTEXT
    if ((text.includes('when') || text.includes('kab')) && targetEntity && targetEntity.startsWith('EV-')) {
      const vResult = db.getVerificationResults().find(v => v.evidenceId === targetEntity);
      if (vResult) {
        const date = new Date(vResult.verifiedAt).toLocaleString();
        return {
          text: `It was verified on ${date}.`,
          actions: [{ label: 'Show verification proof', action: 'NAVIGATE', payload: `/verify/${targetEntity}` }],
          emotion: 'success'
        };
      }
    }

    // 7. INTENT: ASSET LOOKUP
    if (targetEntity && !targetEntity.startsWith('EV-')) {
      const asset = db.getAssets().find(a => a.id === targetEntity);
      if (asset) {
        return {
          text: `Asset ${targetEntity} is ${asset.status.toLowerCase()}.`,
          actions: [
            { label: 'View asset', action: 'NAVIGATE', payload: `/assets/${targetEntity}` },
            { label: 'Show asset history', action: 'NAVIGATE', payload: `/assets/${targetEntity}` },
            { label: 'Capture evidence', action: 'NAVIGATE', payload: `/evidence/capture` }
          ],
          emotion: 'success'
        };
      } else {
        return { text: `I couldn't find asset ${targetEntity} in the available records.`, emotion: 'error' };
      }
    }

    // 8. INTENT: USER/ROLE MANAGEMENT
    if (text.includes('approve') || text.includes('pending user')) {
      if (context.role !== 'Admin') {
        return {
          text: "You don't have permission to approve accounts or view pending users.",
          emotion: 'error'
        };
      }
      const pending = db.getUsers().filter(u => u.status === 'pending');
      return {
        text: `There are ${pending.length} users pending approval.`,
        actions: [{ label: 'Show pending users', action: 'NAVIGATE', payload: '/admin/users' }],
        emotion: 'success'
      };
    }

    // 9. INTENT: SUGGESTION RESPONSES & INFERRED DERIVED QUESTIONS
    if (text === 'help me' || text.includes('list of operation') || text.includes('what can you do')) {
      return { 
        text: "Here are all the operations I can assist you with:\n\n• Look up an Asset's history\n• Check Evidence verification status\n• Explain Anchoring or Integrity Mismatches\n• View recent Audit Logs\n• Filter or search System Events\n• Manage User Roles or Pending Accounts\n• Send Notifications to your team\n• Show Assigned Work or Team Activity\n\nWhat would you like to do?",
        emotion: 'idle'
      };
    }

    if (text.includes('what can i do') || text.includes('options')) {
      if (context.currentPath === '/assets') {
        return { text: "Here you can view all registered assets, check their status, and see their complete history.", emotion: 'idle' };
      }
      if (context.currentPath.startsWith('/verify')) {
        return { text: "This is the verification dashboard. You can cross-check evidence against its blockchain anchor to ensure it hasn't been tampered with.", emotion: 'idle' };
      }
      if (context.currentPath === '/audit') {
        return { text: "The audit log tracks every action taken in the system. You can filter by date, user, or action type.", emotion: 'idle' };
      }
      if (context.currentPath === '/admin/users') {
        return { text: "As an Admin, you can approve pending accounts, manage user roles, and monitor system access.", emotion: 'idle' };
      }
      return { text: "I can help you navigate the system, look up assets, verify evidence, or send messages to your team. Just ask!", emotion: 'idle' };
    }

    if (text.includes('anchoring') || text.includes('this event') || text.includes('integrity mismatch') || text.includes('tampered')) {
      return { text: "Anchoring is how we cryptographically tie digital evidence to an immutable ledger. If the hash doesn't match perfectly, it triggers an integrity mismatch, meaning the file may have been altered.", emotion: 'idle' };
    }
    
    if (text.includes('capture evidence') || text.includes('how do i capture') || text.includes('add evidence')) {
      return { text: "To capture evidence, go to an Asset's page and click 'Capture Evidence'. You'll need to upload the file, add notes, and submit it for anchoring.", emotion: 'idle', actions: [{ label: 'Go to Assets', action: 'NAVIGATE', payload: '/assets' }] };
    }
    
    if (text.includes('assigned work') || text.includes('team activity') || text.includes('my tasks')) {
      return { text: "I'm pulling up your latest assigned tasks and team activity.", emotion: 'success', actions: [{ label: 'View Dashboard', action: 'NAVIGATE', payload: '/' }] };
    }
    
    if (text.includes('recent verification') || text.includes('recent checks') || text.includes('check another') || text.includes('verify evidence') || text.includes('verification proof')) {
      return { text: "You can view all recent verification checks and their status on the Verification dashboard.", emotion: 'success', actions: [{ label: 'Go to Verification', action: 'NAVIGATE', payload: '/verify' }] };
    }
    
    if (text.includes('find an asset') || text.includes('register an asset') || text.includes('view asset') || text.includes('asset history')) {
      return { text: "All asset management tasks can be handled from the Assets directory.", emotion: 'success', actions: [{ label: 'Open Assets', action: 'NAVIGATE', payload: '/assets' }] };
    }

    if (text.includes('audit activity') || text.includes('filter audit')) {
      return { text: "You can view and filter all system events in the Audit Logs.", emotion: 'success', actions: [{ label: 'Open Audit Logs', action: 'NAVIGATE', payload: '/audit' }] };
    }
    
    if (text.includes('user roles') || text.includes('approve an account') || text.includes('pending users') || text.includes('manage users')) {
      if (context.role !== 'Admin') {
        return { text: "You need Administrator privileges to perform this action.", emotion: 'error' };
      }
      return { text: "You can manage users, approve accounts, and change roles in the Admin settings.", emotion: 'success', actions: [{ label: 'User Management', action: 'NAVIGATE', payload: '/admin/users' }] };
    }
    

    if (text.includes('view notifications') || text.includes('my alerts')) {
      return { text: "You can view your notifications by clicking the bell icon in the top navigation bar.", emotion: 'success' };
    }

    // 10. UNKNOWN QUERY FALLBACK
    return {
      text: "I didn't quite catch that. If you're stuck or unsure what to ask, you can ask for 'Help me' to see a list of operations and questions I can answer.",
      emotion: 'error'
    };
  },

  getSuggestions(context: AssistantContext): string[] {
    const { role, currentPath, lastResponse } = context;
    let suggestions: string[] = [];

    // Follow-up suggestions based on context from the last response
    if (lastResponse) {
      if (lastResponse.includes('Here are all the operations I can assist you with')) {
        suggestions.push(
          "Find an asset", 
          "Verify evidence", 
          "Send another message", 
          "Show assigned work",
          "Filter audit logs",
          "Manage user roles",
          "Explain anchoring"
        );
      }
      else if (lastResponse.includes('didn\'t quite catch that')) {
        suggestions.push("Help me", "What can I do here?");
      }
      else if (lastResponse.includes('Message sent') || lastResponse.includes('tell me who')) {
        suggestions.push("View notifications", "Open team activity");
      }
      else if (lastResponse.includes('Verified') || lastResponse.includes('Verification dashboard')) {
        suggestions.push("Show verification proof", "Check another record");
      }
      else if (lastResponse.includes('Asset') || lastResponse.includes('Assets directory')) {
        suggestions.push("View asset", "Show asset history", "Capture evidence");
      }
      else if (lastResponse.includes('Pending Anchor') || lastResponse.includes('Anchoring is')) {
        suggestions.push("Explain anchoring", "Check another evidence");
      }
      else if (lastResponse.includes('Audit Logs') || lastResponse.includes('system events')) {
        suggestions.push("Filter audit logs", "Explain this event");
      }
      else if (lastResponse.includes('manage users') || lastResponse.includes('pending accounts')) {
        suggestions.push("Show pending users", "Approve an account");
      }
    }

    // If we still don't have enough suggestions, append page-aware and role-aware defaults
    if (suggestions.length < 2) {
      if (currentPath === '/assets') {
        suggestions.push("Find an asset", "Register an asset");
      } else if (currentPath.startsWith('/verify')) {
        suggestions.push("Verify evidence", "Explain integrity mismatch");
      } else if (currentPath === '/audit') {
        suggestions.push("Show recent audit activity", "Filter audit logs");
      } else if (currentPath === '/admin/users' && role === 'Admin') {
        suggestions.push("Show pending users", "Manage user roles");
      } else {
        if (role === 'Technician') suggestions.push("How do I capture evidence?", "Show assigned work");
        else if (role === 'Manager') suggestions.push("Notify a technician", "Show team activity");
        else if (role === 'Auditor') suggestions.push("Show recent verification", "Find integrity mismatches");
        else suggestions.push("What can I do here?", "View notifications");
      }
    }
    
    // Ensure we ALWAYS return at least 2 unique suggestions
    if (suggestions.length < 2) {
      suggestions.push("What can I do here?", "Show assigned work");
    }

    // Ensure "Help me" is ALWAYS available as a suggestion after every message
    if (!suggestions.includes("Help me")) {
      suggestions.push("Help me");
    }

    // Ensure "Send Message" is ALWAYS available as a fallback action
    if (!suggestions.includes("Send Message")) {
      suggestions.push("Send Message");
    }

    return Array.from(new Set(suggestions)).slice(0, 8);
  }
};
