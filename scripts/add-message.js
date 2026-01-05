#!/usr/bin/env node

/**
 * CLI utility for adding messages to the Kinso POC system
 * 
 * Usage:
 *   npm run add:email -- --user "user-demo"           # Creates email with random fake data
 *   npm run add:slack -- --user "user-demo" --dm      # Creates Slack DM with random data
 */

import { faker } from '@faker-js/faker';
import { randomUUID } from 'node:crypto';
import { parseArgs } from 'node:util';

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
};

// Message content generators
function generateEmailSubject() {
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

function generateEmailBody() {
  return faker.lorem.paragraphs({ min: 1, max: 2 }, '\n\n');
}

function generateSlackMessage() {
  const templates = [
    () => `Hey! ${faker.hacker.phrase()}`,
    () => `Quick question - ${faker.lorem.sentence()}`,
    () => `Just pushed ${faker.git.commitMessage()}`,
    () => `Can you review the PR for ${faker.git.branch()}?`,
    () => faker.lorem.sentence(),
  ];
  return faker.helpers.arrayElement(templates)();
}

function generateWhatsAppMessage() {
  const templates = [
    () => `Hey! ${faker.lorem.sentence({ min: 2, max: 5 })}`,
    () => faker.lorem.sentence({ min: 2, max: 6 }),
    () => `Call me when you can`,
    () => `Running ${faker.number.int({ min: 5, max: 20 })} mins late`,
  ];
  return faker.helpers.arrayElement(templates)();
}

function generateLinkedInMessage() {
  const templates = [
    () => `Hi! I came across your profile and was impressed by your experience in ${faker.person.jobArea()}.`,
    () => `I have an exciting ${faker.person.jobTitle()} opportunity at ${faker.company.name()} that might interest you.`,
    () => `Would love to connect and discuss ${faker.company.buzzPhrase()}.`,
  ];
  return faker.helpers.arrayElement(templates)();
}

const HELP_TEXT = `
${colors.cyan}Kinso Message CLI${colors.reset}
Add messages to the priority engine via the API.

${colors.yellow}Usage:${colors.reset}
  npm run add:<source> -- [options]

${colors.yellow}Sources:${colors.reset}
  add:email     Add an email message
  add:slack     Add a Slack message
  add:whatsapp  Add a WhatsApp message
  add:linkedin  Add a LinkedIn message

${colors.yellow}Common Options:${colors.reset}
  --user <userId>      User ID (required)
  --from <email>       Sender's email (auto-generated if omitted)
  --name <name>        Sender's name (auto-generated if omitted)
  --conv <id>          Existing conversation ID (creates new if omitted)
  --url <baseUrl>      API base URL (default: http://localhost:3000)
  --time <iso8601>     Message timestamp (default: now)
  --help               Show this help message

${colors.yellow}Email Options:${colors.reset}
  --subject <subject>  Email subject (auto-generated if omitted)
  --body <body>        Email body (auto-generated if omitted)
  --importance <level> low | normal | high (default: normal)

${colors.yellow}Slack Options:${colors.reset}
  --content <text>     Message content (auto-generated if omitted)
  --dm                 Mark as direct message
  --channel <name>     Channel name (if not DM)

${colors.yellow}WhatsApp Options:${colors.reset}
  --content <text>     Message content (auto-generated if omitted)
  --phone <number>     Phone number (auto-generated if omitted)
  --group              Mark as group chat

${colors.yellow}LinkedIn Options:${colors.reset}
  --content <text>     Message content (auto-generated if omitted)
  --linkedin <url>     LinkedIn profile URL
  --degree <1|2|3>     Connection degree (default: 2)
  --inmail             Mark as InMail

${colors.yellow}Examples:${colors.reset}
  ${colors.dim}# Add email with random fake data${colors.reset}
  npm run add:email -- --user "user-demo"

  ${colors.dim}# Add Slack DM with random fake data${colors.reset}
  npm run add:slack -- --user "user-demo" --dm

  ${colors.dim}# Add with specific values${colors.reset}
  npm run add:email -- --user "user-demo" --from "alice@example.com" --name "Alice" \\
    --subject "Hello" --body "Test message"
`;

// Parse command line arguments
const { values } = parseArgs({
  options: {
    // Common options
    source: { type: 'string' },
    from: { type: 'string' },
    name: { type: 'string' },
    user: { type: 'string' },
    conv: { type: 'string' },
    url: { type: 'string', default: 'http://localhost:3000' },
    time: { type: 'string' },
    help: { type: 'boolean', default: false },
    
    // Email specific
    subject: { type: 'string' },
    body: { type: 'string' },
    importance: { type: 'string', default: 'normal' },
    
    // Slack specific
    content: { type: 'string' },
    dm: { type: 'boolean', default: false },
    channel: { type: 'string' },
    
    // WhatsApp specific
    phone: { type: 'string' },
    group: { type: 'boolean', default: false },
    
    // LinkedIn specific
    linkedin: { type: 'string' },
    degree: { type: 'string', default: '2' },
    inmail: { type: 'boolean', default: false },
  },
  strict: false,
  allowPositionals: true,
});

// Show help if requested
if (values.help) {
  console.log(HELP_TEXT);
  process.exit(0);
}

// Validate source
const validSources = ['email', 'slack', 'whatsapp', 'linkedin'];
if (!values.source || !validSources.includes(values.source)) {
  console.error(`${colors.red}Error: Invalid or missing source. Use one of: ${validSources.join(', ')}${colors.reset}`);
  console.log(`\nRun with --help for usage information.`);
  process.exit(1);
}

// Validate required fields
if (!values.user) {
  console.error(`${colors.red}Error: --user (user ID) is required${colors.reset}`);
  process.exit(1);
}

// Generate fake data for missing fields
const senderName = values.name || faker.person.fullName();
const nameParts = senderName.split(' ');
const senderEmail = values.from || faker.internet.email({ firstName: nameParts[0], lastName: nameParts[1] || '' });
const senderPhone = values.phone || faker.phone.number({ style: 'international' });

// Generate unique IDs (use provided conv ID or generate new one)
const messageId = `${values.source}-msg-${randomUUID().slice(0, 8)}`;
const conversationId = values.conv || `${values.source}-conv-${randomUUID().slice(0, 8)}`;
const timestamp = values.time || new Date().toISOString();

// Build the request body based on source
function buildRequestBody() {
  const basePayload = {
    userId: values.user,
    externalMessageId: messageId,
    externalConversationId: conversationId,
    receivedAt: timestamp,
  };

  switch (values.source) {
    case 'email':
      return {
        ...basePayload,
        from: {
          email: senderEmail,
          name: senderName,
        },
        subject: values.subject || generateEmailSubject(),
        body: values.body || generateEmailBody(),
        metadata: {
          importance: values.importance,
        },
      };

    case 'slack':
      return {
        ...basePayload,
        from: {
          email: senderEmail,
          name: senderName,
          slackUserId: `U${randomUUID().slice(0, 10).toUpperCase()}`,
        },
        content: values.content || generateSlackMessage(),
        metadata: {
          isDirectMessage: values.dm,
          channelName: values.channel || undefined,
        },
      };

    case 'whatsapp':
      return {
        ...basePayload,
        from: {
          email: senderEmail,
          name: senderName,
          phone: senderPhone,
        },
        content: values.content || generateWhatsAppMessage(),
        metadata: {
          messageType: 'text',
          isGroupChat: values.group,
        },
      };

    case 'linkedin':
      return {
        ...basePayload,
        from: {
          email: senderEmail,
          name: senderName,
          linkedinUrl: values.linkedin || `https://linkedin.com/in/${faker.internet.username()}`,
        },
        content: values.content || generateLinkedInMessage(),
        metadata: {
          connectionDegree: parseInt(values.degree, 10),
          isInMail: values.inmail,
        },
      };

    default:
      console.error(`${colors.red}Error: Unknown source: ${values.source}${colors.reset}`);
      process.exit(1);
  }
}

// Send the request
async function sendMessage() {
  const body = buildRequestBody();
  const endpoint = `${values.url}/api/messages/${values.source}`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (response.ok) {
      console.log(`${colors.green}✓${colors.reset} Created: conv=${data.conversationId} priority=${data.priority}`);
    } else {
      console.error(`${colors.red}✗${colors.reset} ${data.error?.message || response.status}`);
      process.exit(1);
    }
  } catch (error) {
    console.error(`${colors.red}✗${colors.reset} ${error.message} (is server running?)`);
    process.exit(1);
  }
}

sendMessage();
