import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { calculatePriority } from '@/lib/priority';
import type { LinkedInMessageRequest, MessageIngestionResponse, ApiError } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body: LinkedInMessageRequest = await request.json();

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
      source: 'linkedin',
    });

    // Find or create conversation
    const title = body.metadata?.isInMail
      ? `InMail from ${body.from.name}`
      : `LinkedIn with ${body.from.name}`;
    
    const { conversation } = store.findOrCreateConversation({
      userId: body.userId,
      contactId: contact.id,
      externalId: body.externalConversationId,
      source: 'linkedin',
      title,
    });

    // Create message
    const messageDate = body.receivedAt ? new Date(body.receivedAt) : new Date();
    const message = store.createMessage({
      conversationId: conversation.id,
      externalId: body.externalMessageId,
      source: 'linkedin',
      content: body.content || '',
      metadata: {
        ...body.metadata,
        linkedinUrl: body.from.linkedinUrl,
      },
      createdAt: messageDate,
    });

    // Calculate priority with LinkedIn-specific logic
    // Connection degree boost, InMail handling in priority calculation
    const priority = calculatePriority({
      source: 'linkedin',
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
    console.error('Error processing LinkedIn message:', error);
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
