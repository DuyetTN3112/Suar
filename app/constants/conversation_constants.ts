/**
 * Conversation Constants
 *
 * Constants liên quan đến Conversation, Message, ConversationParticipant.
 *
 * CLEANUP 2026-03-01:
 *   - XÓA messageSendStatusOptions, getMessageSendStatusName, getMessageSendStatusNameVi → 0 usages
 *   - XÓA messageRecallScopeOptions → 0 usages
 *   - GIỮ enums → map trực tiếp với DB v3 CHECK constraints
 *   - GIỮ CONVERSATION_DEFAULTS → nên dùng thay hardcoded values
 *
 * @module ConversationConstants
 */

// ============================================================================
// Message Send Status
// ============================================================================

/**
 * Trạng thái gửi tin nhắn
 * v3.0 CHECK: 'sending', 'sent', 'failed'
 */
export enum MessageSendStatus {
  SENDING = 'sending',
  SENT = 'sent',
  FAILED = 'failed',
}

// ============================================================================
// Message Recall Scope
// ============================================================================

/**
 * Phạm vi thu hồi tin nhắn
 * v3.0 CHECK: 'self', 'all'
 */
export enum MessageRecallScope {
  /** Thu hồi chỉ cho chính mình */
  SELF = 'self',
  /** Thu hồi cho tất cả người tham gia */
  ALL = 'all',
}

// ============================================================================
// Conversation Defaults
// ============================================================================

/**
 * Giá trị mặc định cho cuộc trò chuyện
 */
export const CONVERSATION_DEFAULTS = {
  /** Số tin nhắn tải mỗi lần (pagination) */
  MESSAGES_PER_PAGE: 50,
  /** Số cuộc trò chuyện tải mỗi lần */
  CONVERSATIONS_PER_PAGE: 20,
  /** Độ dài tối đa của tin nhắn */
  MAX_MESSAGE_LENGTH: 5000,
  /** Độ dài tối đa của tiêu đề cuộc trò chuyện */
  MAX_TITLE_LENGTH: 100,
  /** Số ký tự hiển thị trong preview tin nhắn */
  MESSAGE_PREVIEW_LENGTH: 30,
} as const
