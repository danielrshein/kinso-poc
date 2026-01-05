import { v4 as uuidv4 } from 'uuid';
import { calculatePriority } from './priority';
import type {
  User,
  Contact,
  Conversation,
  Message,
  Source,
  SSEEvent,
  SSEEventType,
} from './types';

// =============================================================================
// Event Emitter for SSE
// =============================================================================

type EventListener = (event: SSEEvent) => void;

class EventEmitter {
  private listeners: Set<EventListener> = new Set();

  subscribe(listener: EventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  emit(event: SSEEvent): void {
    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in SSE listener:', error);
      }
    });
  }
}

// =============================================================================
// In-Memory Store
// =============================================================================

class Store {
  private users: Map<string, User> = new Map();
  private contacts: Map<string, Contact> = new Map();
  private conversations: Map<string, Conversation> = new Map();
  private messages: Map<string, Message> = new Map();

  // Index for deduplication lookups
  private messagesByExternalId: Map<string, Message> = new Map();
  private contactsByUserAndEmail: Map<string, Contact> = new Map();
  private conversationsByUserAndExternalId: Map<string, Conversation> = new Map();

  // Event emitter for SSE
  public events: EventEmitter = new EventEmitter();

  constructor() {
    // Seed with demo data
    this.seedData();
  }

  private seedData(): void {
    // ==========================================================================
    // Create Demo User
    // ==========================================================================
    const demoUser: User = {
      id: 'user-demo',
      email: 'demo@kinso.dev',
      name: 'Demo User',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(demoUser.id, demoUser);

    // ==========================================================================
    // Create Contacts (one per source with varying priorities)
    // ==========================================================================
    const contactCeo: Contact = {
      id: uuidv4(),
      userId: demoUser.id,
      email: 'sarah.chen@acme.com',
      name: 'Sarah Chen (CEO)',
      source: 'email',
      priority: 90, // High priority - executive
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const contactSlack: Contact = {
      id: uuidv4(),
      userId: demoUser.id,
      email: 'mike.johnson@team.com',
      name: 'Mike Johnson',
      source: 'slack',
      priority: 60, // Medium priority - team member
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const contactClient: Contact = {
      id: uuidv4(),
      userId: demoUser.id,
      email: 'alex.rivera@client.io',
      name: 'Alex Rivera',
      source: 'whatsapp',
      priority: 75, // High priority - client
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const contactLinkedin: Contact = {
      id: uuidv4(),
      userId: demoUser.id,
      email: 'recruiter@bigtech.com',
      name: 'Jennifer Wu',
      source: 'linkedin',
      priority: 40, // Lower priority - recruiter
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const contacts = [contactCeo, contactSlack, contactClient, contactLinkedin];
    contacts.forEach((contact) => {
      this.contacts.set(contact.id, contact);
      this.contactsByUserAndEmail.set(`${contact.userId}:${contact.email}`, contact);
    });

    // ==========================================================================
    // Create Conversations and Messages
    // ==========================================================================
    const now = new Date();
    const hoursAgo = (hours: number) => new Date(now.getTime() - hours * 60 * 60 * 1000);

    // Conversation 1: Urgent email from CEO (should be highest priority)
    const conv1 = this.createSeededConversation({
      externalId: 'thread-001',
      userId: demoUser.id,
      contactId: contactCeo.id,
      source: 'email',
      title: 'Q4 Board Presentation - URGENT Review Needed',
    });
    this.createSeededMessage({
      conversationId: conv1.id,
      externalId: 'msg-001',
      source: 'email',
      content: 'Hi, I need you to review the Q4 board presentation ASAP. The board meeting is tomorrow and this is critical. Please prioritize this immediately.',
      metadata: { importance: 'high', hasAttachments: true },
      createdAt: hoursAgo(1),
    });
    this.createSeededMessage({
      conversationId: conv1.id,
      externalId: 'msg-002',
      source: 'email',
      content: 'Just following up - this is urgent. Can you confirm you received this?',
      metadata: { importance: 'high', isReply: true },
      createdAt: hoursAgo(0.5),
    });

    // Conversation 2: Slack DM (high priority due to DM + recency)
    const conv2 = this.createSeededConversation({
      externalId: 'dm-mike-001',
      userId: demoUser.id,
      contactId: contactSlack.id,
      source: 'slack',
      title: 'DM with Mike Johnson',
    });
    this.createSeededMessage({
      conversationId: conv2.id,
      externalId: 'msg-003',
      source: 'slack',
      content: 'Hey! Quick question about the API integration. Are we still using v2 or have we migrated to v3?',
      metadata: { isDirectMessage: true },
      createdAt: hoursAgo(2),
    });
    this.createSeededMessage({
      conversationId: conv2.id,
      externalId: 'msg-004',
      source: 'slack',
      content: 'Also, the client is asking about the timeline. Can you give me an update when you get a chance?',
      metadata: { isDirectMessage: true },
      createdAt: hoursAgo(1.5),
    });

    // Conversation 3: WhatsApp client message (high priority - client + immediate)
    const conv3 = this.createSeededConversation({
      externalId: 'wa-alex-001',
      userId: demoUser.id,
      contactId: contactClient.id,
      source: 'whatsapp',
      title: 'Alex Rivera',
    });
    this.createSeededMessage({
      conversationId: conv3.id,
      externalId: 'msg-005',
      source: 'whatsapp',
      content: 'Hi! Just wanted to check on the project status. We have a deadline coming up and need to make sure everything is on track.',
      metadata: { messageType: 'text' },
      createdAt: hoursAgo(3),
    });
    this.createSeededMessage({
      conversationId: conv3.id,
      externalId: 'msg-006',
      source: 'whatsapp',
      content: 'Also, can we schedule a call for this week? Its important we align on next steps.',
      metadata: { messageType: 'text' },
      createdAt: hoursAgo(2.5),
    });

    // Conversation 4: LinkedIn recruiter (lower priority)
    const conv4 = this.createSeededConversation({
      externalId: 'li-jennifer-001',
      userId: demoUser.id,
      contactId: contactLinkedin.id,
      source: 'linkedin',
      title: 'Jennifer Wu - BigTech Opportunity',
    });
    this.createSeededMessage({
      conversationId: conv4.id,
      externalId: 'msg-007',
      source: 'linkedin',
      content: 'Hi! I came across your profile and I think you would be a great fit for a Senior Engineer role at BigTech. Would you be interested in learning more?',
      metadata: { connectionDegree: 2, isInMail: true, profileHeadline: 'Tech Recruiter at BigTech' },
      createdAt: hoursAgo(24),
    });

    // Conversation 5: Regular email (medium priority)
    const conv5 = this.createSeededConversation({
      externalId: 'thread-002',
      userId: demoUser.id,
      contactId: contactCeo.id,
      source: 'email',
      title: 'Weekly Team Sync Notes',
    });
    this.createSeededMessage({
      conversationId: conv5.id,
      externalId: 'msg-008',
      source: 'email',
      content: 'Hi team, here are the notes from our weekly sync. Please review and let me know if I missed anything. No rush on this.',
      metadata: { importance: 'normal' },
      createdAt: hoursAgo(48),
    });

    // Conversation 6: Slack channel mention (lower priority than DM)
    const conv6 = this.createSeededConversation({
      externalId: 'channel-eng-001',
      userId: demoUser.id,
      contactId: contactSlack.id,
      source: 'slack',
      title: '#engineering',
    });
    this.createSeededMessage({
      conversationId: conv6.id,
      externalId: 'msg-009',
      source: 'slack',
      content: 'Has anyone seen the new TypeScript 5.4 features? Looks like they added some cool stuff for type inference.',
      metadata: { channelName: 'engineering', isDirectMessage: false },
      createdAt: hoursAgo(12),
    });
    this.createSeededMessage({
      conversationId: conv6.id,
      externalId: 'msg-010',
      source: 'slack',
      content: '@demo-user what do you think about migrating our codebase?',
      metadata: { channelName: 'engineering', isDirectMessage: false, mentions: ['demo-user'] },
      createdAt: hoursAgo(10),
    });

    // ==========================================================================
    // Update conversation priorities based on latest messages
    // ==========================================================================
    this.updateConversationPrioritiesFromMessages();

    // ==========================================================================
    // Log startup information
    // ==========================================================================
    this.logStartupInfo(demoUser);
  }

  private createSeededConversation(data: {
    externalId: string;
    userId: string;
    contactId: string;
    source: Source;
    title: string;
  }): Conversation {
    const conversation: Conversation = {
      id: uuidv4(),
      externalId: data.externalId,
      userId: data.userId,
      contactId: data.contactId,
      source: data.source,
      title: data.title,
      priority: 50,
      lastMessageAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.conversations.set(conversation.id, conversation);
    this.conversationsByUserAndExternalId.set(
      `${conversation.userId}:${conversation.source}:${conversation.externalId}`,
      conversation
    );
    return conversation;
  }

  private createSeededMessage(data: {
    conversationId: string;
    externalId: string;
    source: Source;
    content: string;
    metadata: Record<string, unknown>;
    createdAt: Date;
  }): Message {
    const message: Message = {
      id: uuidv4(),
      conversationId: data.conversationId,
      externalId: data.externalId,
      source: data.source,
      content: data.content,
      metadata: data.metadata,
      createdAt: data.createdAt,
      updatedAt: new Date(),
    };
    this.messages.set(message.id, message);
    this.messagesByExternalId.set(message.externalId, message);
    return message;
  }

  private updateConversationPrioritiesFromMessages(): void {
    this.conversations.forEach((conversation) => {
      const latestMessage = this.getLatestMessageForConversation(conversation.id);
      const contact = this.contacts.get(conversation.contactId);
      
      if (latestMessage && contact) {
        const priority = calculatePriority({
          source: conversation.source,
          content: latestMessage.content,
          lastMessageAt: latestMessage.createdAt,
          contactPriority: contact.priority,
          metadata: latestMessage.metadata,
        });
        
        conversation.priority = priority;
        conversation.lastMessageAt = latestMessage.createdAt;
        conversation.updatedAt = new Date();
      }
    });
  }

  private logStartupInfo(user: User): void {
    const contactCount = Array.from(this.contacts.values()).filter(c => c.userId === user.id).length;
    const conversationCount = Array.from(this.conversations.values()).filter(c => c.userId === user.id).length;
    const messageCount = Array.from(this.messages.values()).length;

    // Get conversations sorted by priority for display
    const topConversations = Array.from(this.conversations.values())
      .filter(c => c.userId === user.id)
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 3);

    console.log(`
===============================================
🚀 Kinso Message Priority Engine
===============================================

Demo User Created:
  ID:    ${user.id}
  Email: ${user.email}
  Name:  ${user.name}

Seeded Data:
  • ${contactCount} contacts
  • ${conversationCount} conversations
  • ${messageCount} messages

Top Priority Conversations:
${topConversations.map((c, i) => {
  const contact = this.contacts.get(c.contactId);
  return `  ${i + 1}. [${c.priority}] ${c.title} (${c.source}) - ${contact?.name || 'Unknown'}`;
}).join('\n')}

Try these endpoints:
  GET  http://localhost:3000/api/conversations?userId=${user.id}
  GET  http://localhost:3000/api/conversations/stream?userId=${user.id}

POST a new message:
  curl -X POST http://localhost:3000/api/messages/email \\
    -H "Content-Type: application/json" \\
    -d '{
      "userId": "${user.id}",
      "externalMessageId": "new-msg-001",
      "externalConversationId": "new-thread-001",
      "from": { "email": "boss@company.com", "name": "The Boss" },
      "subject": "Urgent: Need your input ASAP",
      "body": "This is critical and needs immediate attention!",
      "metadata": { "importance": "high" }
    }'

===============================================
`);
  }

  // =============================================================================
  // User Operations
  // =============================================================================

  getUser(id: string): User | undefined {
    return this.users.get(id);
  }

  createUser(data: { id?: string; email: string; name: string }): User {
    const user: User = {
      id: data.id || uuidv4(),
      email: data.email.toLowerCase(),
      name: data.name,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(user.id, user);
    return user;
  }

  // =============================================================================
  // Contact Operations
  // =============================================================================

  getContact(id: string): Contact | undefined {
    return this.contacts.get(id);
  }

  findContactByUserAndEmail(userId: string, email: string): Contact | undefined {
    const key = `${userId}:${email.toLowerCase()}`;
    return this.contactsByUserAndEmail.get(key);
  }

  createContact(data: {
    userId: string;
    email: string;
    name: string;
    source: Source;
    priority?: number;
  }): Contact {
    const contact: Contact = {
      id: uuidv4(),
      userId: data.userId,
      email: data.email.toLowerCase(),
      name: data.name,
      source: data.source,
      priority: data.priority ?? 50, // Default priority of 50
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.contacts.set(contact.id, contact);
    this.contactsByUserAndEmail.set(`${contact.userId}:${contact.email}`, contact);
    return contact;
  }

  findOrCreateContact(data: {
    userId: string;
    email: string;
    name: string;
    source: Source;
  }): Contact {
    const existing = this.findContactByUserAndEmail(data.userId, data.email);
    if (existing) {
      return existing;
    }
    return this.createContact(data);
  }

  // =============================================================================
  // Conversation Operations
  // =============================================================================

  getConversation(id: string): Conversation | undefined {
    return this.conversations.get(id);
  }

  findConversationByUserAndExternalId(
    userId: string,
    externalId: string,
    source: Source
  ): Conversation | undefined {
    const key = `${userId}:${source}:${externalId}`;
    return this.conversationsByUserAndExternalId.get(key);
  }

  createConversation(data: {
    userId: string;
    contactId: string;
    externalId: string;
    source: Source;
    title: string;
  }): Conversation {
    const conversation: Conversation = {
      id: uuidv4(),
      externalId: data.externalId,
      userId: data.userId,
      contactId: data.contactId,
      source: data.source,
      title: data.title,
      priority: 50, // Initial priority
      lastMessageAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.conversations.set(conversation.id, conversation);
    this.conversationsByUserAndExternalId.set(
      `${conversation.userId}:${conversation.source}:${conversation.externalId}`,
      conversation
    );

    // Emit new conversation event
    this.events.emit({
      type: 'conversation:new',
      data: {
        conversationId: conversation.id,
        userId: conversation.userId,
        priority: conversation.priority,
      },
    });

    return conversation;
  }

  findOrCreateConversation(data: {
    userId: string;
    contactId: string;
    externalId: string;
    source: Source;
    title: string;
  }): { conversation: Conversation; isNew: boolean } {
    const existing = this.findConversationByUserAndExternalId(
      data.userId,
      data.externalId,
      data.source
    );
    if (existing) {
      return { conversation: existing, isNew: false };
    }
    return { conversation: this.createConversation(data), isNew: true };
  }

  updateConversationPriority(
    conversationId: string,
    priority: number,
    lastMessageAt: Date
  ): Conversation | undefined {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      return undefined;
    }

    conversation.priority = priority;
    conversation.lastMessageAt = lastMessageAt;
    conversation.updatedAt = new Date();

    // Emit update event
    this.events.emit({
      type: 'conversation:updated',
      data: {
        conversationId: conversation.id,
        userId: conversation.userId,
        priority: conversation.priority,
      },
    });

    return conversation;
  }

  getConversationsForUser(
    userId: string,
    options: {
      page?: number;
      limit?: number;
      source?: Source;
    } = {}
  ): {
    conversations: Conversation[];
    total: number;
  } {
    const page = options.page ?? 1;
    const limit = Math.min(options.limit ?? 20, 100);

    let conversations = Array.from(this.conversations.values()).filter(
      (c) => c.userId === userId
    );

    if (options.source) {
      conversations = conversations.filter((c) => c.source === options.source);
    }

    // Sort by priority DESC, then createdAt DESC
    conversations.sort((a, b) => {
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

    const total = conversations.length;
    const start = (page - 1) * limit;
    const paginated = conversations.slice(start, start + limit);

    return { conversations: paginated, total };
  }

  // =============================================================================
  // Message Operations
  // =============================================================================

  getMessage(id: string): Message | undefined {
    return this.messages.get(id);
  }

  findMessageByExternalId(externalId: string): Message | undefined {
    return this.messagesByExternalId.get(externalId);
  }

  createMessage(data: {
    conversationId: string;
    externalId: string;
    source: Source;
    content: string;
    metadata: Record<string, unknown>;
    createdAt?: Date;
  }): Message {
    const message: Message = {
      id: uuidv4(),
      conversationId: data.conversationId,
      externalId: data.externalId,
      source: data.source,
      content: data.content,
      metadata: data.metadata,
      createdAt: data.createdAt ?? new Date(),
      updatedAt: new Date(),
    };
    this.messages.set(message.id, message);
    this.messagesByExternalId.set(message.externalId, message);

    // Emit new message event
    const conversation = this.conversations.get(data.conversationId);
    if (conversation) {
      this.events.emit({
        type: 'message:new',
        data: {
          conversationId: conversation.id,
          userId: conversation.userId,
          messageId: message.id,
        },
      });
    }

    return message;
  }

  getMessagesForConversation(
    conversationId: string,
    options: {
      page?: number;
      limit?: number;
    } = {}
  ): {
    messages: Message[];
    total: number;
  } {
    const page = options.page ?? 1;
    const limit = Math.min(options.limit ?? 50, 100);

    const messages = Array.from(this.messages.values())
      .filter((m) => m.conversationId === conversationId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()); // Oldest first

    const total = messages.length;
    const start = (page - 1) * limit;
    const paginated = messages.slice(start, start + limit);

    return { messages: paginated, total };
  }

  getMessageCountForConversation(conversationId: string): number {
    return Array.from(this.messages.values()).filter(
      (m) => m.conversationId === conversationId
    ).length;
  }

  getLatestMessageForConversation(conversationId: string): Message | undefined {
    const messages = Array.from(this.messages.values())
      .filter((m) => m.conversationId === conversationId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return messages[0];
  }
}

// Export singleton instance
// Use globalThis to ensure singleton persists across Next.js hot reloads
const globalForStore = globalThis as unknown as { store: Store | undefined };

export const store = globalForStore.store ?? new Store();

if (process.env.NODE_ENV !== 'production') {
  globalForStore.store = store;
}
