import { store } from '@/lib/store';
import type { ApiError, MessageListItem, PaginatedResponse } from '@/lib/types';
import { NextRequest, NextResponse } from 'next/server';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));

    // Check if conversation exists
    const conversation = store.getConversation(id);
    if (!conversation) {
      return NextResponse.json<ApiError>(
        {
          error: {
            code: 'CONVERSATION_NOT_FOUND',
            message: `Conversation with id ${id} not found`,
          },
        },
        { status: 404 }
      );
    }

    // Get contact for the conversation
    const contact = store.getContact(conversation.contactId);

    // Get messages
    const { messages, total } = store.getMessagesForConversation(id, {
      page,
      limit,
    });

    // Transform to response format
    const data: MessageListItem[] = messages.map((message) => ({
      id: message.id,
      source: message.source,
      content: message.content,
      metadata: message.metadata,
      contact: {
        id: contact?.id || '',
        name: contact?.name || 'Unknown',
      },
      createdAt: message.createdAt.toISOString(),
      updatedAt: message.updatedAt.toISOString(),
    }));

    const response: PaginatedResponse<MessageListItem> = {
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
    console.error('Error fetching messages:', error);
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
