import type { Source, PriorityContext } from './types';

// Internal type for priority signals
interface PrioritySignals {
  contactPriority: number;
  urgencyKeywords: number;
  recency: number;
  responseExpectation: number;
  providerBoost: number;
}

// =============================================================================
// Configuration
// =============================================================================

const WEIGHTS = {
  contactPriority: 0.4, // 40%
  urgencyKeywords: 0.2, // 20%
  recency: 0.2, // 20%
  responseExpectation: 0.15, // 15%
  providerBoost: 0.05, // 5%
};

const INACTIVITY_THRESHOLD_DAYS = 7;

// Urgency keywords and their boost values
const URGENCY_KEYWORDS: Record<string, number> = {
  // High urgency (+15-20)
  urgent: 20,
  asap: 20,
  emergency: 20,
  critical: 18,
  deadline: 15,
  immediately: 18,
  
  // Medium urgency (+5-10)
  important: 10,
  priority: 8,
  needed: 7,
  soon: 6,
  'time-sensitive': 10,
  
  // Low urgency (+0-5)
  'when you can': 3,
  'quick question': 5,
  'no rush': 0,
};

// Response expectation by platform (0-15)
const RESPONSE_EXPECTATION: Record<Source, number> = {
  email: 5, // Async, lower urgency expectation
  slack: 12, // Near real-time expectation
  whatsapp: 15, // Immediate response expected
  linkedin: 3, // Professional, less urgent
};

// =============================================================================
// Priority Signal Calculations
// =============================================================================

/**
 * Calculate urgency score based on keywords in content (0-20)
 */
function calculateUrgencyScore(content: string): number {
  const lowerContent = content.toLowerCase();
  let maxScore = 0;

  for (const [keyword, score] of Object.entries(URGENCY_KEYWORDS)) {
    if (lowerContent.includes(keyword)) {
      maxScore = Math.max(maxScore, score);
    }
  }

  return Math.min(maxScore, 20);
}

/**
 * Calculate recency score based on time since last message (0-20)
 */
function calculateRecencyScore(lastMessageAt: Date): number {
  const now = new Date();
  const hoursSince = (now.getTime() - lastMessageAt.getTime()) / (1000 * 60 * 60);

  if (hoursSince < 1) return 20;
  if (hoursSince < 4) return 15;
  if (hoursSince < 24) return 10;
  if (hoursSince < 72) return 5;
  return 0;
}

/**
 * Check if conversation is inactive (no messages for 7+ days)
 */
function isInactive(lastMessageAt: Date): boolean {
  const now = new Date();
  const daysSince = (now.getTime() - lastMessageAt.getTime()) / (1000 * 60 * 60 * 24);
  return daysSince >= INACTIVITY_THRESHOLD_DAYS;
}

/**
 * Calculate provider-specific boost (-10 to +10)
 */
function calculateProviderBoost(
  source: Source,
  metadata: Record<string, unknown>
): number {
  let boost = 0;

  switch (source) {
    case 'email':
      // +5 for high importance, -5 for newsletter
      if (metadata.importance === 'high') boost += 5;
      if (metadata.importance === 'low') boost -= 3;
      break;

    case 'slack':
      // +10 for DMs, +5 for mentions, -5 for channel noise
      if (metadata.isDirectMessage) boost += 10;
      if (Array.isArray(metadata.mentions) && metadata.mentions.length > 0) {
        boost += 5;
      }
      if (!metadata.isDirectMessage && !metadata.mentions) {
        boost -= 5;
      }
      break;

    case 'whatsapp':
      // -5 for forwarded, -10 for group chats
      if (metadata.isForwarded) boost -= 5;
      if (metadata.isGroupChat) boost -= 10;
      break;

    case 'linkedin':
      // +5 for 1st-degree, -5 for InMail
      if (metadata.connectionDegree === 1) boost += 5;
      if (metadata.isInMail) boost -= 5;
      break;
  }

  // Clamp to -10 to +10
  return Math.max(-10, Math.min(10, boost));
}

// =============================================================================
// Main Priority Calculation
// =============================================================================

/**
 * Calculate all priority signals for debugging/transparency
 */
function calculatePrioritySignals(context: PriorityContext): PrioritySignals {
  return {
    contactPriority: context.contactPriority,
    urgencyKeywords: calculateUrgencyScore(context.content),
    recency: calculateRecencyScore(context.lastMessageAt),
    responseExpectation: RESPONSE_EXPECTATION[context.source],
    providerBoost: calculateProviderBoost(context.source, context.metadata),
  };
}

/**
 * Calculate final priority score (0-100)
 * 
 * Each signal is normalized to 0-100, weighted, and summed.
 * Inactive conversations (7+ days) return 0.
 */
export function calculatePriority(context: PriorityContext): number {
  // Check for inactivity - return 0 if inactive
  if (isInactive(context.lastMessageAt)) {
    return 0;
  }

  const signals = calculatePrioritySignals(context);

  // Normalize each signal to 0-100 scale
  const normalized = {
    contactPriority: signals.contactPriority, // Already 0-100
    urgencyKeywords: (signals.urgencyKeywords / 20) * 100, // 0-20 → 0-100
    recency: (signals.recency / 20) * 100, // 0-20 → 0-100
    responseExpectation: (signals.responseExpectation / 15) * 100, // 0-15 → 0-100
    providerBoost: ((signals.providerBoost + 10) / 20) * 100, // -10 to +10 → 0-100
  };

  // Apply weights and sum
  const weightedSum =
    normalized.contactPriority * WEIGHTS.contactPriority +
    normalized.urgencyKeywords * WEIGHTS.urgencyKeywords +
    normalized.recency * WEIGHTS.recency +
    normalized.responseExpectation * WEIGHTS.responseExpectation +
    normalized.providerBoost * WEIGHTS.providerBoost;

  // Clamp to 0-100
  return Math.max(0, Math.min(100, Math.round(weightedSum)));
}

/**
 * Calculate priority with lazy inactivity check
 * Used when fetching conversations to apply the 7-day reset rule
 */
export function getPriorityWithInactivityCheck(
  storedPriority: number,
  lastMessageAt: Date
): number {
  if (isInactive(lastMessageAt)) {
    return 0;
  }
  return storedPriority;
}
