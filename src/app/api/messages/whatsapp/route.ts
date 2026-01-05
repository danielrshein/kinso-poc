import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { calculatePriority } from '@/lib/priority';
import type { WhatsAppMessageRequest, MessageIngestionResponse, ApiError } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body: WhatsAppMessageRequest = await request.json();

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

    if (!body.from?.name || !body.from?.phone) {
      return NextResponse.json<ApiError>(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Missing required fields: from.name, from.phone',
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
    // For WhatsApp, use email if available, otherwise generate from phone
    const contactEmail = body.from.email || `${body.from.phone}@whatsapp.placeholder`;
    
    const contact = store.findOrCreateContact({
      userId: body.userId,
      email: contactEmail,
      name: body.from.name,
      source: 'whatsapp',
    });

    // Find or create conversation
    const title = body.metadata?.isGroupChat
      ? 'WhatsApp Group'
      : `WhatsApp with ${body.from.name}`;
    
    const { conversation } = store.findOrCreateConversation({
      userId: body.userId,
      contactId: contact.id,
      externalId: body.externalConversationId,
      source: 'whatsapp',
      title,
    });

    // Create message
    const messageDate = body.receivedAt ? new Date(body.receivedAt) : new Date();
    const message = store.createMessage({
      conversationId: conversation.id,
      externalId: body.externalMessageId,
      source: 'whatsapp',
      content: body.content || '',
      metadata: {
        ...body.metadata,
        phone: body.from.phone,
      },
      createdAt: messageDate,
    });

    // Calculate priority with WhatsApp-specific logic
    // Forward/group chat penalties handled in priority calculation
    const priority = calculatePriority({
      source: 'whatsapp',
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
    console.error('Error processing WhatsApp message:', error);
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
