import { store } from '@/lib/store';
import type { SSEEvent } from '@/lib/types';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  const { id: conversationId } = await context.params;

  // Verify conversation exists
  const conversation = store.getConversation(conversationId);
  if (!conversation) {
    return new Response(
      JSON.stringify({
        error: {
          code: 'CONVERSATION_NOT_FOUND',
          message: `Conversation with id ${conversationId} not found`,
        },
      }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Create a readable stream for SSE
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // Helper to send SSE event
      const sendEvent = (event: SSEEvent) => {
        const data = `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`;
        controller.enqueue(encoder.encode(data));
      };

      // Send initial connection event
      sendEvent({
        type: 'message:new',
        data: {
          conversationId,
          userId: conversation.userId,
          messageId: 'connection-established',
        },
      });

      // Subscribe to store events
      const unsubscribe = store.events.subscribe((event) => {
        // Only send events for this specific conversation
        if (event.data.conversationId !== conversationId) {
          return;
        }

        // Only forward message:new events
        if (event.type !== 'message:new') {
          return;
        }

        try {
          sendEvent(event);
        } catch (error) {
          // Client disconnected
          console.error('Error sending SSE event:', error);
        }
      });

      // Handle client disconnect
      request.signal.addEventListener('abort', () => {
        unsubscribe();
        controller.close();
      });

      // Keep connection alive with periodic heartbeat
      const heartbeatInterval = setInterval(() => {
        try {
          const heartbeat = `: heartbeat\n\n`;
          controller.enqueue(encoder.encode(heartbeat));
        } catch {
          clearInterval(heartbeatInterval);
        }
      }, 30000); // Every 30 seconds

      // Cleanup on abort
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeatInterval);
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  });
}
