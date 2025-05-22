import { format, formatDistance } from 'date-fns'
import { vi } from 'date-fns/locale'
import { Message, MessageGroup, Conversation, ConversationParticipant } from '../components/types'

/**
 * Format ngày để hiển thị trạng thái hoạt động
 */
export const formatDate = (dateString: string): string => {
  try {
    if (!dateString) {
      console.warn('formatDate: Chuỗi thời gian rỗng')
      return 'Không xác định'
    }
    const date = new Date(dateString)
    // Kiểm tra xem date có hợp lệ không
    if (Number.isNaN(date.getTime())) {
      console.warn('formatDate: Chuỗi thời gian không hợp lệ:', dateString)
      return 'Không xác định'
    }
    return formatDistance(date, new Date(), {
      addSuffix: true,
      locale: vi,
    })
  } catch (error) {
    console.error('formatDate: Lỗi xử lý thời gian:', error, dateString)
    return 'Không xác định'
  }
}

/**
 * Format giờ của tin nhắn
 */
export const formatMessageDate = (dateString: string): string => {
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
export const groupMessagesByDate = (msgs: Message[] | undefined): MessageGroup[] => {
  if (!msgs || !Array.isArray(msgs)) {
    return []
  }
  const groups: { [key: string]: Message[] } = {}
  msgs.forEach((message) => {
    try {
      if (!message.timestamp) {
        console.warn('Tin nhắn không có timestamp:', message)
        return // Bỏ qua tin nhắn không có timestamp
      }
      const date = new Date(message.timestamp)
      // Kiểm tra xem date có hợp lệ không
      if (Number.isNaN(date.getTime())) {
        console.warn('Timestamp không hợp lệ:', message.timestamp)
        return // Bỏ qua timestamp không hợp lệ
      }
      const dateKey = format(date, 'dd/MM/yyyy')
      if (!groups[dateKey]) {
        groups[dateKey] = []
      }
      groups[dateKey].push(message)
    } catch (error) {
      console.error('Lỗi xử lý timestamp:', error, message)
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
export const getConversationName = (conversation: Conversation): string => {
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
export const getAvatarInitials = (name: string): string => {
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
  if (conversation && conversation.conversation_participants.length === 2) {
    const otherParticipant = conversation.conversation_participants.find(
      (cp) => cp.user.id !== currentUserId
    )
    return otherParticipant?.user
  }
  return null
}
