import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { getPriorityWithInactivityCheck } from '@/lib/priority';
import type { 
  ConversationListItem, 
  PaginatedResponse, 
  ApiError,
  Source 
} from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const userId = searchParams.get('userId');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const source = searchParams.get('source') as Source | null;

    // Validate required parameters
    if (!userId) {
      return NextResponse.json<ApiError>(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Missing required query parameter: userId',
          },
        },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = store.getUser(userId);
    if (!user) {
      return NextResponse.json<ApiError>(
        {
          error: {
            code: 'USER_NOT_FOUND',
            message: `User with id ${userId} not found`,
          },
        },
        { status: 404 }
      );
    }

    // Get conversations
    const { conversations, total } = store.getConversationsForUser(userId, {
      page,
      limit,
      source: source || undefined,
    });

    // Transform to response format
    const data: ConversationListItem[] = conversations.map((conversation) => {
      const contact = store.getContact(conversation.contactId);
      const messageCount = store.getMessageCountForConversation(conversation.id);
      
      // Apply lazy inactivity check for priority
      const priority = getPriorityWithInactivityCheck(
        conversation.priority,
        conversation.lastMessageAt
      );

      return {
        id: conversation.id,
        externalId: conversation.externalId,
        source: conversation.source,
        title: conversation.title,
        priority,
        lastMessageAt: conversation.lastMessageAt.toISOString(),
        contact: {
          id: contact?.id || '',
          name: contact?.name || 'Unknown',
          email: contact?.email || '',
        },
        messageCount,
        createdAt: conversation.createdAt.toISOString(),
        updatedAt: conversation.updatedAt.toISOString(),
      };
    });

    const response: PaginatedResponse<ConversationListItem> = {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json<ApiError>(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        },
      },
      { status: 500 }
    );
  }
}
