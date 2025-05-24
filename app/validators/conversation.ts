import vine from '@vinejs/vine'

// Hàm chuẩn hóa Unicode và cắt chuỗi
function normalizeAndLimit(value: string) {
  if (typeof value === 'string') {
    let normalized = value.normalize('NFKC')
    if (normalized.length > 5000) {
      normalized = normalized.slice(0, 5000)
    }
    return normalized
  }
  return value
}

/**
 * Validator cho tạo cuộc trò chuyện mới
 */
export const createConversationValidator = vine.compile(
  vine.object({
    title: vine.string().maxLength(255).optional(),
    participants: vine.array(vine.string()).minLength(1),
  })
)

/**
 * Validator cho cập nhật cuộc trò chuyện
 */
export const updateConversationValidator = vine.compile(
  vine.object({
    title: vine.string().maxLength(255).optional(),
  })
)

/**
 * Validator cho thêm người tham gia vào cuộc trò chuyện
 */
export const addParticipantValidator = vine.compile(
  vine.object({
    userId: vine.string(),
  })
)

/**
 * Validator cho gửi tin nhắn mới
 */
export const sendMessageValidator = vine.compile(
  vine.object({
    message: vine
      .string()
      .minLength(1)
      .maxLength(5000)
      .trim()
      .escape()
      .transform(normalizeAndLimit),
  })
)

/**
 * Validator cho phân trang tin nhắn
 */
export const messagesPaginationValidator = vine.compile(
  vine.object({
    page: vine.number().optional(),
    limit: vine.number().optional(),
    before: vine.string().optional(),
    after: vine.string().optional(),
  })
)

/**
 * Validator cho tìm kiếm cuộc trò chuyện
 */
export const searchConversationsValidator = vine.compile(
  vine.object({
    query: vine.string().optional(),
    page: vine.number().optional(),
    limit: vine.number().optional(),
  })
)

/**
 * Validator cho đánh dấu tin nhắn đã đọc
 */
export const markAsReadValidator = vine.compile(
  vine.object({
    messageIds: vine.array(vine.string()).optional(),
    conversationId: vine.string().optional(),
  })
)

/**
 * Kiểm tra spam
 */
// export const checkSpam = async (userId: string, messageCount: number, timeWindow: number) => {
//   // TODO: Implement spam checking logic using Redis or database
//   // For now, return false to allow all messages
//   return false
// }
