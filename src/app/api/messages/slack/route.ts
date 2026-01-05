import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { calculatePriority } from '@/lib/priority';
import type { SlackMessageRequest, MessageIngestionResponse, ApiError } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body: SlackMessageRequest = await request.json();

    // Validate required fields
    if (!body.userId || !body.externalMessageId || !body.externalConversationId) {
      return NextResponse.json<ApiError>(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Missing required fields: userId, externalMessageId, externalConversationId',
          },
        },
        { status: 400 }
      );
    }

    if (!body.from?.email || !body.from?.name) {
      return NextResponse.json<ApiError>(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Missing required fields: from.email, from.name',
          },
        },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = store.getUser(body.userId);
    if (!user) {
      return NextResponse.json<ApiError>(
        {
          error: {
            code: 'USER_NOT_FOUND',
            message: `User with id ${body.userId} not found`,
          },
        },
        { status: 404 }
      );
    }

    // Check for duplicate message (idempotency)
    const existingMessage = store.findMessageByExternalId(body.externalMessageId);
    if (existingMessage) {
      return NextResponse.json<ApiError>(
        {
          error: {
            code: 'DUPLICATE_MESSAGE',
            message: `Message with externalId ${body.externalMessageId} already exists`,
          },
        },
        { status: 409 }
      );
    }

    // Find or create contact
    const contact = store.findOrCreateContact({
      userId: body.userId,
      email: body.from.email,
      name: body.from.name,
      source: 'slack',
    });

    // Find or create conversation
    // For Slack, use channel name or DM indicator as title
    const title = body.metadata?.channelName || 
      (body.metadata?.isDirectMessage ? `DM with ${body.from.name}` : 'Slack Conversation');
    
    const { conversation } = store.findOrCreateConversation({
      userId: body.userId,
      contactId: contact.id,
      externalId: body.externalConversationId,
      source: 'slack',
      title,
    });

    // Create message
    const messageDate = body.receivedAt ? new Date(body.receivedAt) : new Date();
    const message = store.createMessage({
      conversationId: conversation.id,
      externalId: body.externalMessageId,
      source: 'slack',
      content: body.content || '',
      metadata: {
        ...body.metadata,
        slackUserId: body.from.slackUserId,
      },
      createdAt: messageDate,
    });

    // Calculate priority with Slack-specific logic
    // DM boost, @mention detection handled in priority calculation
    const priority = calculatePriority({
      source: 'slack',
      content: body.content || '',
      lastMessageAt: messageDate,
      contactPriority: contact.priority,
      metadata: body.metadata || {},
    });

    // Update conversation priority
    store.updateConversationPriority(conversation.id, priority, messageDate);

    const response: MessageIngestionResponse = {
      messageId: message.id,
      conversationId: conversation.id,
      contactId: contact.id,
      priority,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Error processing Slack message:', error);
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
