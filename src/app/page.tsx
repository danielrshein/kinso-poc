'use client';

import { faker } from '@faker-js/faker';
import { useCallback, useEffect, useState } from 'react';

// Types matching the API responses
interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

interface ConversationListItem {
  id: string;
  externalId: string;
  source: 'email' | 'slack' | 'whatsapp' | 'linkedin';
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

interface MessageListItem {
  id: string;
  source: 'email' | 'slack' | 'whatsapp' | 'linkedin';
  content: string;
  metadata: Record<string, unknown>;
  contact: {
    id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

type Source = 'email' | 'slack' | 'whatsapp' | 'linkedin';

// Helper to get initials from name
function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// Helper to format relative time
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

// Helper to format full date/time
function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

// Helper to get priority label
function getPriorityLevel(priority: number): 'high' | 'medium' | 'low' {
  if (priority >= 70) return 'high';
  if (priority >= 40) return 'medium';
  return 'low';
}

// Source badge abbreviations
const sourceAbbr: Record<Source, string> = {
  email: 'EM',
  slack: 'SL',
  whatsapp: 'WA',
  linkedin: 'LI',
};

// Source full names
const sourceNames: Record<Source, string> = {
  email: 'Email',
  slack: 'Slack',
  whatsapp: 'WhatsApp',
  linkedin: 'LinkedIn',
};

// Message generators (similar to add-message.js script)
function generateEmailSubject(): string {
  const templates = [
    () => `Re: ${faker.company.buzzPhrase()}`,
    () => `Quick question about ${faker.commerce.product()}`,
    () => `Meeting follow-up: ${faker.date.weekday()}`,
    () => `Urgent: ${faker.company.buzzVerb()} needed`,
    () => `FYI - ${faker.company.buzzNoun()} update`,
    () => faker.lorem.sentence({ min: 3, max: 6 }),
  ];
  return faker.helpers.arrayElement(templates)();
}

function generateEmailBody(): string {
  return faker.lorem.paragraphs({ min: 1, max: 2 }, '\n\n');
}

function generateSlackMessage(): string {
  const templates = [
    () => `Hey! ${faker.hacker.phrase()}`,
    () => `Quick question - ${faker.lorem.sentence()}`,
    () => `Just pushed ${faker.git.commitMessage()}`,
    () => `Can you review the PR for ${faker.git.branch()}?`,
    () => faker.lorem.sentence(),
  ];
  return faker.helpers.arrayElement(templates)();
}

function generateWhatsAppMessage(): string {
  const templates = [
    () => `Hey! ${faker.lorem.sentence({ min: 2, max: 5 })}`,
    () => faker.lorem.sentence({ min: 2, max: 6 }),
    () => `Call me when you can`,
    () => `Running ${faker.number.int({ min: 5, max: 20 })} mins late`,
  ];
  return faker.helpers.arrayElement(templates)();
}

function generateLinkedInMessage(): string {
  const templates = [
    () =>
      `Hi! I came across your profile and was impressed by your experience in ${faker.person.jobArea()}.`,
    () =>
      `I have an exciting ${faker.person.jobTitle()} opportunity at ${faker.company.name()} that might interest you.`,
    () => `Would love to connect and discuss ${faker.company.buzzPhrase()}.`,
  ];
  return faker.helpers.arrayElement(templates)();
}

// Create User Form Component
function CreateUserForm({
  onUserCreated,
}: {
  onUserCreated: (user: User) => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to create user');
      }

      onUserCreated(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h2 style={{ marginBottom: 20, fontSize: '1.125rem', fontWeight: 600 }}>
        Create Your Account
      </h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label" htmlFor="name">
            Name
          </label>
          <input
            id="name"
            type="text"
            className="form-input"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            className="form-input"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        {error && (
          <p style={{ color: 'var(--priority-high)', marginBottom: 16, fontSize: '0.875rem' }}>
            {error}
          </p>
        )}
        <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
          {loading ? 'Creating...' : 'Get Started'}
        </button>
      </form>
    </div>
  );
}

// Add Message Modal Component
function AddMessageModal({
  userId,
  onClose,
  onMessageAdded,
}: {
  userId: string;
  onClose: () => void;
  onMessageAdded: () => void;
}) {
  const [source, setSource] = useState<Source>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const senderName = faker.person.fullName();
    const nameParts = senderName.split(' ');
    const senderEmail = faker.internet.email({
      firstName: nameParts[0],
      lastName: nameParts[1] || '',
    });
    const messageId = `${source}-msg-${crypto.randomUUID().slice(0, 8)}`;
    const conversationId = `${source}-conv-${crypto.randomUUID().slice(0, 8)}`;

    let body: Record<string, unknown> = {
      userId,
      externalMessageId: messageId,
      externalConversationId: conversationId,
      receivedAt: new Date().toISOString(),
    };

    switch (source) {
      case 'email':
        body = {
          ...body,
          from: { email: senderEmail, name: senderName },
          subject: generateEmailSubject(),
          body: generateEmailBody(),
          metadata: { importance: faker.helpers.arrayElement(['low', 'normal', 'high']) },
        };
        break;
      case 'slack':
        body = {
          ...body,
          from: {
            email: senderEmail,
            name: senderName,
            slackUserId: `U${crypto.randomUUID().slice(0, 10).toUpperCase()}`,
          },
          content: generateSlackMessage(),
          metadata: {
            isDirectMessage: faker.datatype.boolean(),
            channelName: faker.helpers.arrayElement(['general', 'engineering', 'random']),
          },
        };
        break;
      case 'whatsapp':
        body = {
          ...body,
          from: {
            email: senderEmail,
            name: senderName,
            phone: faker.phone.number({ style: 'international' }),
          },
          content: generateWhatsAppMessage(),
          metadata: { messageType: 'text', isGroupChat: faker.datatype.boolean() },
        };
        break;
      case 'linkedin':
        body = {
          ...body,
          from: {
            email: senderEmail,
            name: senderName,
            linkedinUrl: `https://linkedin.com/in/${faker.internet.username()}`,
          },
          content: generateLinkedInMessage(),
          metadata: {
            connectionDegree: faker.helpers.arrayElement([1, 2, 3]),
            isInMail: faker.datatype.boolean(),
          },
        };
        break;
    }

    try {
      const response = await fetch(`/api/messages/${source}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to add message');
      }

      onMessageAdded();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Add New Message</h3>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="source">
              Message Source
            </label>
            <select
              id="source"
              className="form-select"
              value={source}
              onChange={(e) => setSource(e.target.value as Source)}
            >
              <option value="email">Email</option>
              <option value="slack">Slack</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="linkedin">LinkedIn</option>
            </select>
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--muted)', marginBottom: 16 }}>
            This will create a message with randomly generated content from a fake sender.
          </p>
          {error && (
            <p style={{ color: 'var(--priority-high)', marginBottom: 16, fontSize: '0.875rem' }}>
              {error}
            </p>
          )}
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose} style={{ flex: 1 }}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ flex: 1 }}>
              {loading ? 'Adding...' : 'Add Message'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Conversation Detail Component - Shows all messages
function ConversationDetail({
  conversation,
  onBack,
}: {
  conversation: ConversationListItem;
  onBack: () => void;
}) {
  const [messages, setMessages] = useState<MessageListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);

  const fetchMessages = useCallback(async () => {
    try {
      const response = await fetch(`/api/conversations/${conversation.id}/messages`);
      const data = await response.json();

      if (response.status === 404) {
        setNotFound(true);
        return;
      }

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to fetch messages');
      }

      setMessages(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [conversation.id]);

  // Initial fetch
  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // SSE subscription for real-time message updates
  useEffect(() => {
    const eventSource = new EventSource(`/api/conversations/${conversation.id}/messages/stream`);

    eventSource.onopen = () => {
      setIsStreaming(true);
    };

    eventSource.onerror = () => {
      setIsStreaming(false);
    };

    // Listen for new messages
    eventSource.addEventListener('message:new', () => {
      fetchMessages();
    });

    // Cleanup on unmount
    return () => {
      eventSource.close();
      setIsStreaming(false);
    };
  }, [conversation.id, fetchMessages]);

  // Auto-redirect back if conversation not found
  useEffect(() => {
    if (notFound) {
      const timer = setTimeout(() => {
        onBack();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [notFound, onBack]);

  if (notFound) {
    return (
      <div className="card" style={{ textAlign: 'center' }}>
        <p style={{ color: 'var(--priority-high)', marginBottom: 12 }}>
          Conversation not found
        </p>
        <p style={{ color: 'var(--muted)', fontSize: '0.875rem', marginBottom: 16 }}>
          The server may have restarted. Redirecting to conversation list...
        </p>
        <div className="loading">
          <div className="spinner" />
        </div>
      </div>
    );
  }

  const priorityLevel = getPriorityLevel(conversation.priority);

  return (
    <div>
      {/* Header with back button */}
      <div className="detail-header">
        <button className="btn-back" onClick={onBack}>
          ← Back
        </button>
      </div>

      {/* Conversation info card */}
      <div className="detail-info">
        <div className="detail-info-row">
          <div className={`source-badge ${conversation.source}`}>
            {sourceAbbr[conversation.source]}
          </div>
          <div className="detail-info-content">
            <h2 className="detail-title">{conversation.title}</h2>
            <div className="detail-meta">
              <span className="detail-contact">{conversation.contact.name}</span>
              <span>·</span>
              <span>{sourceNames[conversation.source]}</span>
              <span>·</span>
              <span className={`priority-badge priority-${priorityLevel}`}>
                Priority: {conversation.priority}
              </span>
            </div>
            <div className="detail-ids">
              <span>Conversation ID: {conversation.id}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="messages-section">
        <div className="messages-header">
          <h3 className="messages-title">
            Messages ({messages.length})
          </h3>
          <span className={`live-indicator ${isStreaming ? 'connected' : 'disconnected'}`}>
            <span className="live-dot" />
            {isStreaming ? 'Live' : 'Connecting...'}
          </span>
        </div>

        {loading ? (
          <div className="loading">
            <div className="spinner" />
          </div>
        ) : error ? (
          <div className="card" style={{ textAlign: 'center' }}>
            <p style={{ color: 'var(--priority-high)', marginBottom: 16 }}>{error}</p>
            <p style={{ color: 'var(--muted)', fontSize: '0.875rem', marginBottom: 16 }}>
              This can happen if the server was restarted. The in-memory store resets on restart.
            </p>
            <button className="btn btn-primary" onClick={onBack}>
              ← Back to Conversations
            </button>
          </div>
        ) : messages.length === 0 ? (
          <div className="empty-state">
            <p className="empty-state-text">No messages in this conversation.</p>
          </div>
        ) : (
          <div className="messages-list">
            {[...messages].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((message) => (
              <div key={message.id} className="message-item">
                <div className="message-header">
                  <span className="message-sender">{message.contact.name}</span>
                  <span className="message-time">{formatDateTime(message.createdAt)}</span>
                </div>
                <div className="message-content">{message.content}</div>
                <div className="message-footer">
                  <span className="message-id">ID: {message.id.slice(0, 8)}</span>
                  {Object.keys(message.metadata).length > 0 && (
                    <span className="message-metadata">
                      {Object.entries(message.metadata)
                        .map(([key, value]) => `${key}: ${value}`)
                        .join(' · ')}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Conversation List Component
function ConversationList({
  userId,
  onAddMessage,
  onSelectConversation,
  refreshTrigger,
}: {
  userId: string;
  onAddMessage: () => void;
  onSelectConversation: (conv: ConversationListItem) => void;
  refreshTrigger: number;
}) {
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const fetchConversations = useCallback(async () => {
    try {
      const response = await fetch(`/api/conversations?userId=${userId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to fetch conversations');
      }

      setConversations(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Initial fetch and manual refresh trigger
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations, refreshTrigger]);

  // SSE subscription for real-time updates
  useEffect(() => {
    const eventSource = new EventSource(`/api/conversations/stream?userId=${userId}`);

    eventSource.onopen = () => {
      setIsConnected(true);
    };

    eventSource.onerror = () => {
      setIsConnected(false);
    };

    // Listen for new conversations
    eventSource.addEventListener('conversation:new', () => {
      fetchConversations();
    });

    // Listen for updated conversations (priority changes)
    eventSource.addEventListener('conversation:updated', () => {
      fetchConversations();
    });

    // Listen for new messages (which also updates conversations)
    eventSource.addEventListener('message:new', () => {
      fetchConversations();
    });

    // Cleanup on unmount
    return () => {
      eventSource.close();
      setIsConnected(false);
    };
  }, [userId, fetchConversations]);

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <p style={{ color: 'var(--priority-high)' }}>{error}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="conversation-header">
        <div>
          <div className="conversation-title-row">
            <h2 className="conversation-title">Conversations</h2>
            <span className={`live-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
              <span className="live-dot" />
              {isConnected ? 'Live' : 'Connecting...'}
            </span>
          </div>
          <p className="conversation-count">{conversations.length} total</p>
        </div>
        <button className="btn btn-primary" onClick={onAddMessage}>
          + Add Message
        </button>
      </div>

      {conversations.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📭</div>
          <p className="empty-state-text">
            No conversations yet. Add a message to get started.
          </p>
        </div>
      ) : (
        <div className="conversation-list">
          {conversations.map((conv) => {
            const priorityLevel = getPriorityLevel(conv.priority);
            return (
              <div
                key={conv.id}
                className="conversation-item conversation-item-clickable"
                onClick={() => onSelectConversation(conv)}
              >
                <div className={`source-badge ${conv.source}`}>
                  {sourceAbbr[conv.source]}
                </div>
                <div className="conversation-content">
                  <div className="conversation-row">
                    <span className="conversation-name">{conv.contact.name}</span>
                    <span className={`priority-badge priority-${priorityLevel}`}>
                      {conv.priority}
                    </span>
                  </div>
                  <div className="conversation-subject">{conv.title}</div>
                  <div className="conversation-meta">
                    <span>{formatRelativeTime(conv.lastMessageAt)}</span>
                    <span>·</span>
                    <span>{conv.messageCount} message{conv.messageCount !== 1 ? 's' : ''}</span>
                    <span>·</span>
                    <span className="conversation-id">{conv.id}</span>
                  </div>
                </div>
                <div className="conversation-arrow">→</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Main Page Component
export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [showAddMessage, setShowAddMessage] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [selectedConversation, setSelectedConversation] = useState<ConversationListItem | null>(null);

  const handleUserCreated = (newUser: User) => {
    setUser(newUser);
  };

  const handleMessageAdded = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleSelectConversation = (conv: ConversationListItem) => {
    setSelectedConversation(conv);
  };

  const handleBackToList = () => {
    setSelectedConversation(null);
  };

  return (
    <main className="container">
      <header className="header">
        <h1 className="logo">Kinso</h1>
        <p className="subtitle">Message Priority Engine</p>
      </header>

      {!user ? (
        <CreateUserForm onUserCreated={handleUserCreated} />
      ) : (
        <>
          <div className="user-bar">
            <div className="user-info">
              <div className="user-avatar">{getInitials(user.name)}</div>
              <div>
                <div className="user-name">{user.name}</div>
                <div className="user-email">{user.email}</div>
                <div className="user-id">{user.id}</div>
              </div>
            </div>
          </div>

          {selectedConversation ? (
            <ConversationDetail
              conversation={selectedConversation}
              onBack={handleBackToList}
            />
          ) : (
            <ConversationList
              userId={user.id}
              onAddMessage={() => setShowAddMessage(true)}
              onSelectConversation={handleSelectConversation}
              refreshTrigger={refreshTrigger}
            />
          )}

          {showAddMessage && (
            <AddMessageModal
              userId={user.id}
              onClose={() => setShowAddMessage(false)}
              onMessageAdded={handleMessageAdded}
            />
          )}
        </>
      )}
    </main>
  );
}
