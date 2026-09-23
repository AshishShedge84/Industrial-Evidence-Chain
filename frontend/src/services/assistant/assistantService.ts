import type { User } from '@type-defs/auth';
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
      
      const users: User[] = [];
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

    // 4. REAL BACKEND ENTITY LOOKUP FOR EVIDENCE
    if (targetEntity && (targetEntity.startsWith('EV-') || targetEntity.length >= 8)) {
      try {
        const { apiClient } = await import('@services/api/apiClient');
        const res = await apiClient.get<any>(`/evidence/${targetEntity}`);
        if (res.success && res.data) {
          const ev = res.data;
          const statusDesc = ev.status === 'Verified'
            ? 'Verified (Cryptographic Integrity Confirmed)'
            : ev.status === 'Submitted'
            ? 'Submitted (Waiting for Manager Verification)'
            : ev.status;

          return {
            text: `Evidence record ${ev.evidenceNumber || targetEntity} (${ev.assetName || 'Asset'}) is currently ${statusDesc}.`,
            actions: [
              { label: `View ${ev.evidenceNumber || 'Evidence'}`, action: 'NAVIGATE', payload: `/evidence/${ev.id || targetEntity}` },
              ...(context.role === 'Manager' || context.role === 'Auditor'
                ? [{ label: 'Open Verification Portal', action: 'NAVIGATE', payload: `/verify/${ev.id || targetEntity}` }]
                : [])
            ],
            emotion: ev.status === 'Verified' ? 'success' : 'idle'
          };
        }
      } catch {
        // Continue to intent matching
      }
    }

    // 4b. REAL BACKEND ENTITY LOOKUP FOR ASSETS
    if (targetEntity && !targetEntity.startsWith('EV-')) {
      try {
        const { apiClient } = await import('@services/api/apiClient');
        const res = await apiClient.get<any>(`/assets/${targetEntity}`);
        if (res.success && res.data) {
          const asset = res.data;
          return {
            text: `Asset "${asset.name}" (${asset.modelNumber || asset.assetTag || targetEntity}) is currently ${asset.status || 'Active'} located at ${asset.location || 'Facility'}.`,
            actions: [
              { label: `View Asset Details`, action: 'NAVIGATE', payload: `/assets/${asset.id || targetEntity}` },
              ...(context.role === 'Technician'
                ? [{ label: 'Capture Evidence', action: 'NAVIGATE', payload: `/evidence/capture` }]
                : [])
            ],
            emotion: 'success'
          };
        }
      } catch {
        // Continue to intent matching
      }
    }

    // 5. INTENT: ROLE-SPECIFIC HELP & CAPABILITIES
    if (text === 'help me' || text.includes('what can you do') || text.includes('help') || text === 'hi' || text === 'hello') {
      if (context.role === 'Technician') {
        return {
          text: `Hello ${context.name || 'Technician'}! I'm your field operations assistant. Here is what I can help you with:\n\n• Evidence Capture: Step-by-step guidance on capturing photos and geolocation\n• Assets: Check machine specs, location, and equipment status\n• Field Operations: View assigned maintenance tasks and line activities\n• Evidence Status: Check whether your submitted evidence is pending or sealed\n\nHow can I help you today?`,
          emotion: 'idle',
          actions: [
            { label: 'Capture Evidence', action: 'NAVIGATE', payload: '/evidence/capture' },
            { label: 'View Assets', action: 'NAVIGATE', payload: '/assets' },
            { label: 'My Submissions', action: 'NAVIGATE', payload: '/dashboard' }
          ]
        };
      }
      if (context.role === 'Manager') {
        return {
          text: `Hello Manager ${context.name || ''}! I'm your operational supervisor assistant. Here is what I can help you with:\n\n• Verification Workflow: Review technician submissions and initiate integrity checks\n• Pending Verification Requests: Track evidence awaiting managerial review\n• Operational Monitoring: Supervise line activities and asset health\n• Evidence Review: Inspect hash comparison results and sealing confirmations\n\nWhat would you like to review?`,
          emotion: 'idle',
          actions: [
            { label: 'Review Pending Evidence', action: 'NAVIGATE', payload: '/dashboard' },
            { label: 'All Evidence Records', action: 'NAVIGATE', payload: '/evidence' },
            { label: 'View Assets', action: 'NAVIGATE', payload: '/assets' }
          ]
        };
      }
      if (context.role === 'Auditor') {
        return {
          text: `Hello Auditor ${context.name || ''}! I'm your compliance and integrity assistant. Here is what I can help you with:\n\n• Cryptographic Verification: Inspect SHA-256 evidence integrity against ledger proofs\n• Integrity Checks: Review match / mismatch reports and tamper alerts\n• Audit Trail: Query immutable historical logs and user activity records\n• Blockchain Proofs: Inspect Hyperledger Fabric transaction IDs and timestamps\n\nHow can I support your audit?`,
          emotion: 'idle',
          actions: [
            { label: 'Audit Dashboard', action: 'NAVIGATE', payload: '/dashboard' },
            { label: 'Evidence Register', action: 'NAVIGATE', payload: '/evidence' }
          ]
        };
      }
      // Admin
      return {
        text: `Hello Administrator ${context.name || ''}! I'm your system operations assistant. Here is what I can help you with:\n\n• User Management: Approve pending registrations and assign RBAC roles\n• Assets & Evidence: System-wide registry governance and ledger monitoring\n• System Operations: Verify API connectivity and cryptographic services\n• Audit Oversight: Inspect full system activity logs and compliance history\n\nWhat administrative task would you like to perform?`,
        emotion: 'idle',
        actions: [
          { label: 'User Management', action: 'NAVIGATE', payload: '/admin/users' },
          { label: 'Assets', action: 'NAVIGATE', payload: '/assets' },
          { label: 'Evidence Overview', action: 'NAVIGATE', payload: '/evidence' }
        ]
      };
    }

    // 6. INTENT: ROLE-SPECIFIC WORKFLOW PERMISSION CHECKS
    if (text.includes('approve') || text.includes('pending user') || text.includes('manage user')) {
      if (context.role !== 'Admin') {
        return {
          text: `User account approvals and role management require Administrator privileges. As a ${context.role}, you do not have permission to manage accounts.`,
          emotion: 'error'
        };
      }
      return {
        text: "You can review and approve pending users in the User Management console.",
        actions: [{ label: 'Open User Management', action: 'NAVIGATE', payload: '/admin/users' }],
        emotion: 'success'
      };
    }

    if (text.includes('verify evidence') || text.includes('trigger verification') || text.includes('run verification')) {
      if (context.role === 'Technician') {
        return {
          text: "Technicians submit field evidence records. Formal verification and hash confirmation are conducted by Managers or Auditors.",
          emotion: 'idle',
          actions: [{ label: 'View My Submissions', action: 'NAVIGATE', payload: '/dashboard' }]
        };
      }
      return {
        text: "You can review submitted evidence and run cryptographic integrity verification from the Evidence portal.",
        actions: [{ label: 'Open Evidence Records', action: 'NAVIGATE', payload: '/evidence' }],
        emotion: 'success'
      };
    }

    // 7. INTENT: EVIDENCE CAPTURE GUIDANCE
    if (text.includes('capture evidence') || text.includes('how do i capture') || text.includes('add evidence') || text.includes('upload evidence')) {
      return {
        text: "To capture evidence:\n1. Open the Asset page or navigate to Capture Evidence.\n2. Select the machine / asset unit.\n3. Take a photo using the live camera or upload media.\n4. Ensure GPS location coordinates are captured.\n5. Click 'Submit Evidence' to store off-chain and queue for sealing.",
        emotion: 'idle',
        actions: [
          { label: 'Capture Evidence', action: 'NAVIGATE', payload: '/evidence/capture' },
          { label: 'View Assets', action: 'NAVIGATE', payload: '/assets' }
        ]
      };
    }

    // 8. INTENT: ANCHORING & INTEGRITY EXPLANATION
    if (text.includes('anchoring') || text.includes('integrity mismatch') || text.includes('blockchain proof') || text.includes('how does verification work')) {
      return {
        text: "In the Industrial Evidence Chain:\n• Captured media is hashed using SHA-256.\n• The hash and metadata are anchored to the Hyperledger Fabric ledger.\n• Verification recalculates the current file hash and compares it to the ledger block.\n• If hashes match exactly, status becomes 'Verified'. If any byte was altered, an 'Integrity Mismatch' is flagged.",
        emotion: 'idle'
      };
    }

    // 9. INTENT: ASSET DIRECTORY
    if (text.includes('find an asset') || text.includes('assets') || text.includes('machine') || text.includes('equipment')) {
      return {
        text: "You can browse all registered industrial machines, inspect operational status, and view historical evidence records in the Assets directory.",
        actions: [{ label: 'Open Assets', action: 'NAVIGATE', payload: '/assets' }],
        emotion: 'success'
      };
    }

    // 10. UNKNOWN QUERY FALLBACK
    return {
      text: "I didn't quite catch that. Type 'help' or ask for specific assistance with evidence capture, asset status, verification, or audit logs.",
      emotion: 'idle'
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
        suggestions.push("Find an asset", "Show asset history");
      } else if (currentPath.startsWith('/verification')) {
        suggestions.push("Review pending requests", "Explain integrity mismatch");
      } else if (currentPath === '/audit') {
        suggestions.push("Show recent audit activity", "Filter audit logs");
      } else if (currentPath === '/admin/users' && role === 'Admin') {
        suggestions.push("Show pending users", "Manage user roles");
      } else {
        if (role === 'Technician') {
          suggestions.push("How do I capture evidence?", "Show assigned work", "Explain anchoring");
        } else if (role === 'Manager') {
          suggestions.push("Review pending verifications", "Notify a technician", "Show team activity");
        } else if (role === 'Auditor') {
          suggestions.push("Show recent verification", "Find integrity mismatches", "Open Audit Logs");
        } else {
          suggestions.push("Manage user roles", "View audit logs", "System overview");
        }
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
