/**
 * Conversation Constants
 *
 * Constants liên quan đến Conversation, Message, ConversationParticipant.
 * Pattern: enum + options array + helper function
 *
 * @module ConversationConstants
 */

// ============================================================================
// Message Send Status
// ============================================================================

/**
 * Trạng thái gửi tin nhắn
 */
export enum MessageSendStatus {
  SENDING = 'sending',
  SENT = 'sent',
  FAILED = 'failed',
}

export const messageSendStatusOptions = [
  {
    label: 'Sending',
    labelVi: 'Đang gửi',
    value: MessageSendStatus.SENDING,
    style: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    color: '#f59e0b',
  },
  {
    label: 'Sent',
    labelVi: 'Đã gửi',
    value: MessageSendStatus.SENT,
    style: 'bg-green-100 text-green-800 border-green-200',
    color: '#22c55e',
  },
  {
    label: 'Failed',
    labelVi: 'Lỗi gửi',
    value: MessageSendStatus.FAILED,
    style: 'bg-red-100 text-red-800 border-red-200',
    color: '#ef4444',
  },
]

export function getMessageSendStatusName(status: MessageSendStatus): string {
  return messageSendStatusOptions.find((option) => option.value === status)?.label ?? 'Unknown'
}

export function getMessageSendStatusNameVi(status: MessageSendStatus): string {
  return (
    messageSendStatusOptions.find((option) => option.value === status)?.labelVi ?? 'Không xác định'
  )
}

// ============================================================================
// Message Recall Scope
// ============================================================================

/**
 * Phạm vi thu hồi tin nhắn
 */
export enum MessageRecallScope {
  /** Thu hồi chỉ cho chính mình */
  SELF = 'self',
  /** Thu hồi cho tất cả người tham gia */
  ALL = 'all',
}

export const messageRecallScopeOptions = [
  {
    label: 'Self Only',
    labelVi: 'Chỉ mình tôi',
    value: MessageRecallScope.SELF,
    description: 'Chỉ ẩn tin nhắn cho bạn, người khác vẫn thấy',
  },
  {
    label: 'Everyone',
    labelVi: 'Tất cả',
    value: MessageRecallScope.ALL,
    description: 'Thu hồi tin nhắn cho tất cả mọi người',
  },
]

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
