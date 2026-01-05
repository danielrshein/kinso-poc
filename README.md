# Message Priority Engine

POC for the Kinso backend challenge. I went with Option A (API-first design).

See [DESIGN.md](DESIGN.md) for the full breakdown of data models, priority calculation logic, trade-offs, and scaling considerations.

## Setup

```bash
npm install
npm run dev
```

Server runs at http://localhost:3000.

## What It Does

Takes messages from different platforms (email, Slack, WhatsApp, LinkedIn), scores them by priority (0-100), and gives you a sorted list of conversations. There's also an SSE endpoint for real-time updates.

## Demo

The UI at http://localhost:3000 lets you:

1. Create a user (or use an existing one)
2. Add messages from different sources
3. See conversations update in real-time, sorted by priority

You can find user IDs, conversation IDs, and contact IDs through the UI.

### Helper Scripts

You can also add messages via the command line. These generate fake sender data by default:

```bash
# Add a random email for a user
npm run add:email -- --user "user-123"

# Add a Slack DM
npm run add:slack -- --user "user-123" --dm

# Add to an existing conversation
npm run add:email -- --user "user-123" --conv "email-conv-abc123"

# Specify sender details
npm run add:whatsapp -- --user "user-123" --from "alice@example.com" --name "Alice"
```

Run `npm run add:email -- --help` for all options.

## API Endpoints

### Ingesting Messages

- `POST /api/messages/email`
- `POST /api/messages/slack`
- `POST /api/messages/whatsapp`
- `POST /api/messages/linkedin`

### Conversations

- `GET /api/conversations?userId=<id>` - list sorted by priority
- `GET /api/conversations/<id>` - single conversation
- `GET /api/conversations/<id>/messages` - messages in a conversation
- `GET /api/conversations/stream?userId=<id>` - real-time updates (SSE)

## Project Structure

```
src/
├── app/api/
│   ├── messages/{email,slack,whatsapp,linkedin}/route.ts
│   └── conversations/
│       ├── route.ts
│       ├── stream/route.ts
│       └── [id]/route.ts, messages/route.ts
└── lib/
    ├── types.ts
    ├── priority.ts
    └── store.ts
```
