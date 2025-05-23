import { format, formatDistance } from 'date-fns'
import { vi, enUS } from 'date-fns/locale'
import { Conversation, Message, MessageGroup } from '../types'

/**
 * Format ngày để hiển thị trạng thái hoạt động
 */
export const formatDate = (dateString: string, locale: string = 'vi') => {
  try {
    if (!dateString) {
      console.warn('formatDate: Chuỗi thời gian rỗng')
      return locale === 'vi' ? 'Không xác định' : 'Unknown'
    }
    const date = new Date(dateString)
    // Kiểm tra xem date có hợp lệ không
    if (Number.isNaN(date.getTime())) {
      console.warn('formatDate: Chuỗi thời gian không hợp lệ:', dateString)
      return locale === 'vi' ? 'Không xác định' : 'Unknown'
    }
    // Chọn ngôn ngữ phù hợp với locale hiện tại
    const dateLocale = locale === 'vi' ? vi : enUS
    return formatDistance(date, new Date(), {
      addSuffix: true,
      locale: dateLocale,
    })
  } catch (error) {
    console.error('formatDate: Lỗi xử lý thời gian:', error, dateString)
    return locale === 'vi' ? 'Không xác định' : 'Unknown'
  }
}

/**
 * Format giờ của tin nhắn
 */
export const formatMessageDate = (dateString: string) => {
  try {
    if (!dateString) {
      console.warn('formatMessageDate: Chuỗi thời gian rỗng')
      return 'Không xác định'
    }
    const date = new Date(dateString)
    // Kiểm tra xem date có hợp lệ không
    if (Number.isNaN(date.getTime())) {
      console.warn('formatMessageDate: Chuỗi thời gian không hợp lệ:', dateString)
      return 'Không xác định'
    }
    return format(date, 'HH:mm')
  } catch (error) {
    console.error('formatMessageDate: Lỗi xử lý thời gian:', error, dateString)
    return 'Không xác định'
  }
}

/**
 * Nhóm tin nhắn theo ngày
 */
export const groupMessagesByDate = (msgs: Message[] | undefined) => {
  if (!msgs || !Array.isArray(msgs)) {
    return []
  }
  const groups: { [key: string]: Message[] } = {}
  msgs.forEach((message) => {
    try {
      const dateField = message.created_at || message.timestamp
      if (!dateField) {
        console.warn('Tin nhắn không có created_at hoặc timestamp:', message)
        return // Bỏ qua tin nhắn không có thời gian
      }
      const date = new Date(dateField)
      // Kiểm tra xem date có hợp lệ không
      if (Number.isNaN(date.getTime())) {
        console.warn('Thời gian không hợp lệ:', dateField)
        return // Bỏ qua timestamp không hợp lệ
      }
      const dateKey = format(date, 'dd/MM/yyyy')
      if (!groups[dateKey]) {
        groups[dateKey] = []
      }
      groups[dateKey].push(message)
    } catch (error) {
      console.error('Lỗi xử lý thời gian tin nhắn:', error, message)
      // Bỏ qua tin nhắn gây lỗi
    }
  })
  return Object.entries(groups).map(([date, messages]) => ({
    date,
    messages,
  }))
}

/**
 * Lấy tên cuộc trò chuyện
 */
export const getConversationName = (conversation: Conversation) => {
  if (conversation.title) return conversation.title

  // Nếu không có title, lấy tên người tham gia
  return conversation.conversation_participants
    .map((cp) => cp.user.full_name)
    .filter((name) => name)
    .join(', ')
}

/**
 * Tạo các chữ cái đầu từ tên để hiển thị trong avatar
 */
export const getAvatarInitials = (name: string | undefined) => {
  if (!name) return '??'
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .substring(0, 2)
}

/**
 * Tìm người tham gia khác trong cuộc trò chuyện 1-1
 */
export const getOtherParticipant = (conversation: Conversation | null, currentUserId: string) => {
  // Tìm người tham gia khác trong cuộc trò chuyện 1-1
  if (!conversation) return null
  // Nếu là cuộc trò chuyện 1-1
  if (conversation.conversation_participants.length === 2) {
    const otherParticipant = conversation.conversation_participants.find(
      (cp) => cp.user && cp.user.id !== currentUserId
    )
    if (otherParticipant && otherParticipant.user) {
      return otherParticipant.user
    }
  }
  // Nếu là cuộc trò chuyện nhóm, trả về null
  return null
}

/**
 * Lấy tất cả người tham gia khác trong cuộc trò chuyện
 */
export const getOtherParticipants = (conversation: Conversation | null, currentUserId: string) => {
  if (!conversation) return []
  // Lọc ra những người tham gia khác ngoài người dùng hiện tại
  return conversation.conversation_participants
    .filter((cp) => cp.user && cp.user.id !== currentUserId)
    .map((cp) => cp.user)
}

/**
 * Hiển thị thông tin hội thoại nhóm
 */
export const getConversationInfo = (
  conversation: Conversation | null,
  currentUserId: string,
  t: Function
) => {
  if (!conversation) return { title: '', participantCount: 0 }
  // Nếu là cuộc trò chuyện có tiêu đề
  if (conversation.title) {
    return {
      title: conversation.title,
      participantCount: conversation.conversation_participants.length,
    }
  }
  // Nếu là cuộc trò chuyện 1-1
  if (conversation.conversation_participants.length === 2) {
    const otherUser = getOtherParticipant(conversation, currentUserId)
    return {
      title:
        otherUser?.full_name || t('conversation.unknown_user', {}, 'Người dùng không xác định'),
      participantCount: 2,
    }
  }
  // Nếu là cuộc trò chuyện nhóm không có tiêu đề
  const participants = getOtherParticipants(conversation, currentUserId)
  const participantNames = participants
    .slice(0, 3)
    .map((p) => p.full_name)
    .join(', ')

  const remainingCount = participants.length - 3
  const title =
    remainingCount > 0 ? `${participantNames} và ${remainingCount} người khác` : participantNames
  return { title, participantCount: participants.length + 1 } // +1 cho người dùng hiện tại
}

/**
 * Tính toán dung lượng của tin nhắn (tính bằng bytes)
 * @param message Nội dung tin nhắn
 * @returns Dung lượng tin nhắn dưới dạng chuỗi (ví dụ: "1.5 KB")
 */
export function calculateMessageSize(message: string): string {
  // Mỗi ký tự trong chuỗi JS = 2 bytes (UTF-16)
  const bytes = message.length * 2;
  
  // Chuyển đổi bytes thành định dạng dễ đọc
  if (bytes < 1024) {
    return `${bytes} B`;
  } else if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  } else {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
}
