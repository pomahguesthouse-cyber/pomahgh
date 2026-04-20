/**
 * Decision Engine — Rule-based router.
 * 
 * Pure mapping: Intent → AgentKey.
 * No side effects, no I/O. Easy to unit test, easy to reason about.
 * 
 * The orchestrator handles:
 *  - Calling the right agent handler for each AgentKey
 *  - Honoring agent_configs.is_active and escalation_target overrides
 */

import type { Intent } from './intentClassifier.ts';
import { isAgentActive, getEscalationTarget } from '../../_shared/agentConfigCache.ts';

export type AgentKey =
  | 'name_collection'   // handled inline by orchestrator
  | 'price_list'        // priceList.ts (fast path)
  | 'room_brochure'     // faq.ts handles this via room photo flow
  | 'booking'           // booking.ts (full AI conversation)
  | 'payment'           // booking agent handles payment sub-flow
  | 'faq'               // faq.ts
  | 'complaint';        // complaint.ts

export interface RoutingDecision {
  agent: AgentKey;
  reason: string;
  /** Original (pre-fallback) intent — preserved for logging. */
  originalIntent: Intent;
  /** True when the resolved agent is different from the natural mapping. */
  fallbackUsed: boolean;
}

/**
 * Static intent → agent map. Single source of truth.
 */
const INTENT_TO_AGENT: Record<Intent, AgentKey> = {
  greeting:          'name_collection',
  name_capture:      'name_collection',
  price_inquiry:     'price_list',
  room_photo:        'room_brochure',
  booking:           'booking',
  payment:           'booking',     // payment is sub-flow of booking agent
  faq:               'faq',
  complaint:         'complaint',
  manager_command:   'booking',     // shouldn't reach here (handled upstream)
  price_approval:    'booking',     // shouldn't reach here
  payment_approval:  'booking',     // shouldn't reach here
  unknown:           'faq',         // safe default — KB lookup
};

/**
 * Map agent_configs.agent_id values to AgentKey.
 * Lets DB-driven escalation override our static map.
 */
function normalizeAgentId(id: string): AgentKey | null {
  switch (id) {
    case 'booking': return 'booking';
    case 'faq': return 'faq';
    case 'complaint': return 'complaint';
    case 'price_list': return 'price_list';
    case 'room_brochure': return 'room_brochure';
    case 'payment': return 'payment';
    default: return null;
  }
}

/**
 * Resolve which agent should handle a given intent, taking into account
 * runtime overrides from agent_configs (is_active + escalation_target).
 */
export function decide(intent: Intent): RoutingDecision {
  const natural = INTENT_TO_AGENT[intent];
  let agent: AgentKey = natural;
  let reason = `intent:${intent}`;
  let fallbackUsed = false;

  // Skip override checks only for inline-handled keys.
  // Fast-path agents are still operational agents and should honor DB toggles.
  const dbCheckable: AgentKey[] = ['booking', 'faq', 'complaint', 'price_list', 'room_brochure', 'payment'];
  if (dbCheckable.includes(agent)) {
    if (!isAgentActive(agent)) {
      const fallback = getEscalationTarget(agent);
      const normalized = fallback ? normalizeAgentId(fallback) : null;
      if (normalized && isAgentActive(normalized)) {
        agent = normalized;
        reason = `${natural}_inactive_escalated_to_${agent}`;
        fallbackUsed = true;
      } else {
        agent = 'booking'; // last-resort
        reason = `${natural}_inactive_default_booking`;
        fallbackUsed = true;
      }
    }
  }

  return { agent, reason, originalIntent: intent, fallbackUsed };
}
