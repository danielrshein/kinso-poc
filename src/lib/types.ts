// Source platforms for messages
export type Source = 'email' | 'slack' | 'whatsapp' | 'linkedin';

// =============================================================================
// Core Entities
// =============================================================================

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Contact {
  id: string;
  userId: string;
  email: string;
  name: string;
  source: Source;
  priority: number; // 0-100, base priority score for this contact
  createdAt: Date;
  updatedAt: Date;
}

export interface Conversation {
  id: string;
  externalId: string;
  userId: string;
  contactId: string;
  source: Source;
  title: string;
  priority: number; // 0-100, calculated priority score
  lastMessageAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  id: string;
  externalId: string;
  conversationId: string;
  source: Source;
  content: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

// =============================================================================
// Message Ingestion Request Types
// =============================================================================

export interface EmailMessageRequest {
  userId: string;
  externalMessageId: string;
  externalConversationId: string;
  from: {
    email: string;
    name: string;
  };
  subject: string;
  body: string;
  receivedAt: string;
  metadata?: {
    hasAttachments?: boolean;
    isReply?: boolean;
    importance?: 'low' | 'normal' | 'high';
  };
}

export interface SlackMessageRequest {
  userId: string;
  externalMessageId: string;
  externalConversationId: string;
  from: {
    email: string;
    name: string;
    slackUserId?: string;
  };
  content: string;
  receivedAt: string;
  metadata?: {
    channelName?: string;
    threadTs?: string;
    mentions?: string[];
    isDirectMessage?: boolean;
  };
}

export interface WhatsAppMessageRequest {
  userId: string;
  externalMessageId: string;
  externalConversationId: string;
  from: {
    email: string;
    name: string;
    phone: string;
  };
  content: string;
  receivedAt: string;
  metadata?: {
    messageType?: 'text' | 'image' | 'video' | 'audio' | 'document';
    isForwarded?: boolean;
    isGroupChat?: boolean;
  };
}

export interface LinkedInMessageRequest {
  userId: string;
  externalMessageId: string;
  externalConversationId: string;
  from: {
    email: string;
    name: string;
    linkedinUrl?: string;
  };
  content: string;
  receivedAt: string;
  metadata?: {
    connectionDegree?: 1 | 2 | 3;
    isInMail?: boolean;
    profileHeadline?: string;
  };
}

// =============================================================================
// Message Ingestion Response Types
// =============================================================================

export interface MessageIngestionResponse {
  messageId: string;
  conversationId: string;
  contactId: string;
  priority: number;
}

// =============================================================================
// Conversation Retrieval Response Types
// =============================================================================

export interface ConversationListItem {
  id: string;
  externalId: string;
  source: Source;
  title: string;
  priority: number;
  lastMessageAt: string;
  contact: {
    id: string;
    name: string;
    email: string;
  };
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface MessageListItem {
  id: string;
  source: Source;
  content: string;
  metadata: Record<string, unknown>;
  contact: {
    id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// =============================================================================
// Error Response Types
// =============================================================================

export interface ApiError {
  error: {
    code: string;
    message: string;
  };
}

// =============================================================================
// SSE Event Types
// =============================================================================

export type SSEEventType = 'conversation:updated' | 'conversation:new' | 'message:new';

export interface SSEEvent {
  type: SSEEventType;
  data: {
    conversationId: string;
    userId: string;
    priority?: number;
    messageId?: string;
  };
}

// =============================================================================
// Priority Calculation Types
// =============================================================================

export interface PriorityContext {
  source: Source;
  content: string;
  lastMessageAt: Date;
  contactPriority: number;
  metadata: Record<string, unknown>;
}
