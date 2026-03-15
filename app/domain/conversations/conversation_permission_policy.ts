/**
 * Conversation Permission Policy — Pure permission decision functions.
 *
 * All functions are synchronous, pure, and have 0 database dependencies.
 * They take pre-fetched context data and return PolicyResult.
 *
 * @module ConversationPermissionPolicy
 */

import type {
  SendMessageContext,
  RecallMessageContext,
  AddParticipantContext,
  DeleteConversationContext,
} from './conversation_types.js'
import type { PolicyResult } from '#domain/shared/policy_result'
import { PolicyResult as PR } from '#domain/shared/policy_result'
import { isSameId } from '#domain/shared/id_utils'
import { MessageRecallScope } from '#constants/conversation_constants'

/**
 * Check if actor can send a message in a conversation.
 *
 * Rules:
 * 1. Must be a participant in the conversation
 * 2. If conversation has organization, must be an approved org member
 */
export function canSendMessage(ctx: SendMessageContext): PolicyResult {
  if (!ctx.isParticipant) {
    return PR.deny('Bạn không phải là thành viên của cuộc trò chuyện này')
  }

  if (ctx.hasOrganization && !ctx.isOrgMember) {
    return PR.deny('Người gửi không thuộc tổ chức của hội thoại')
  }

  return PR.allow()
}

/**
 * Check if actor can recall a message.
 *
 * Rules:
 * 1. Only the message sender can recall
 * 2. Cannot recall an already-recalled message
 * 3. Recall scope must be valid ('self' or 'all')
 */
export function canRecallMessage(ctx: RecallMessageContext): PolicyResult {
  if (!isSameId(ctx.actorId, ctx.messageSenderId)) {
    return PR.deny('Bạn không có quyền thu hồi tin nhắn này')
  }

  if (ctx.isAlreadyRecalled) {
    return PR.deny('Tin nhắn này đã được thu hồi trước đó', 'BUSINESS_RULE')
  }

  const validScopes = Object.values(MessageRecallScope) as string[]
  if (!validScopes.includes(ctx.recallScope)) {
    return PR.deny(`Phạm vi thu hồi không hợp lệ: ${ctx.recallScope}`, 'BUSINESS_RULE')
  }

  return PR.allow()
}

/**
 * Check if actor can add a participant to a conversation.
 *
 * Rules:
 * 1. Actor must be a current participant
 * 2. Target must not already be a participant (no duplicates)
 * 3. Cannot add to direct (1-1) conversations (< 2 participants and no title)
 */
export function canAddParticipant(ctx: AddParticipantContext): PolicyResult {
  if (!ctx.isActorParticipant) {
    return PR.deny('Bạn không có quyền thêm thành viên vào cuộc trò chuyện này')
  }

  if (ctx.isTargetAlreadyParticipant) {
    return PR.deny('Người dùng này đã là thành viên của cuộc trò chuyện', 'BUSINESS_RULE')
  }

  if (ctx.participantCount < 2 && !ctx.hasTitle) {
    return PR.deny('Không thể thêm thành viên vào cuộc trò chuyện trực tiếp', 'BUSINESS_RULE')
  }

  return PR.allow()
}

/**
 * Check if actor can delete (soft delete) a conversation.
 *
 * Rules:
 * 1. Must be a participant in the conversation
 */
export function canDeleteConversation(ctx: DeleteConversationContext): PolicyResult {
  if (!ctx.isParticipant) {
    return PR.deny('Bạn không có quyền xóa cuộc trò chuyện này')
  }

  return PR.allow()
}
