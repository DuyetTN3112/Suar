/**
 * Conversation State Rules — Pure business rules for conversation state validation.
 *
 * All functions are synchronous, pure, and have 0 database dependencies.
 *
 * @module ConversationStateRules
 */

import type { PolicyResult } from '#domain/shared/policy_result'
import { PolicyResult as PR } from '#domain/shared/policy_result'
import { MessageRecallScope } from '#constants/conversation_constants'

/**
 * Conversation type result.
 */
export interface ConversationTypeResult {
  /** true = 1-1, false = group */
  isDirect: boolean
  isGroup: boolean
}

/**
 * Detect conversation type based on participant count and title.
 *
 * Rules:
 * - Direct (1-1): exactly 2 participants AND no title
 * - Group: 3+ participants OR has a title
 */
export function detectConversationType(
  totalParticipantCount: number,
  hasTitle: boolean
): ConversationTypeResult {
  const isDirect = totalParticipantCount === 2 && !hasTitle
  return {
    isDirect,
    isGroup: !isDirect,
  }
}

/**
 * Check if a direct conversation already exists between two users.
 *
 * Pure check: given a flag indicating existence, return PolicyResult.
 * The command is responsible for querying the database.
 */
export function checkDirectConversationDuplicate(ctx: {
  existingConversationId: string | null
}): PolicyResult {
  if (ctx.existingConversationId !== null) {
    return PR.deny('Cuộc trò chuyện trực tiếp đã tồn tại giữa hai người dùng', 'BUSINESS_RULE')
  }
  return PR.allow()
}

/**
 * Check if a group conversation with the same participants already exists.
 *
 * Pure check: given a flag indicating existence, return PolicyResult.
 * The command is responsible for querying the database.
 */
export function checkGroupConversationDuplicate(ctx: {
  existingConversationId: string | null
}): PolicyResult {
  if (ctx.existingConversationId !== null) {
    return PR.deny('Cuộc trò chuyện nhóm với cùng thành viên đã tồn tại', 'BUSINESS_RULE')
  }
  return PR.allow()
}

/**
 * Validate recall scope value.
 *
 * Rules:
 * - Must be 'self' or 'all'
 */
export function validateRecallScope(scope: string): PolicyResult {
  const validScopes = Object.values(MessageRecallScope) as string[]
  if (!validScopes.includes(scope)) {
    return PR.deny(`Phạm vi thu hồi không hợp lệ: ${scope}`, 'BUSINESS_RULE')
  }
  return PR.allow()
}

/**
 * Validate that all participant IDs reference org members.
 *
 * Pure check: the command provides a pre-validated boolean.
 */
export function validateParticipantsOrgMembership(ctx: {
  allParticipantsAreOrgMembers: boolean
  hasOrganization: boolean
}): PolicyResult {
  if (!ctx.hasOrganization) {
    return PR.allow()
  }

  if (!ctx.allParticipantsAreOrgMembers) {
    return PR.deny('Một hoặc nhiều người tham gia không thuộc tổ chức', 'BUSINESS_RULE')
  }

  return PR.allow()
}
