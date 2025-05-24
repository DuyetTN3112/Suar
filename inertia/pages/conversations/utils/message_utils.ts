import { format, formatDistance } from 'date-fns'
import { vi } from 'date-fns/locale'
import { Message, MessageGroup, Conversation, ConversationParticipant } from '../components/types'

/**
 * Format ngày để hiển thị trạng thái hoạt động
 */
export const formatDate = (dateString: string): string => {
  try {
    if (!dateString) {
      return 'Không xác định'
    }
    const date = new Date(dateString)
    // Kiểm tra xem date có hợp lệ không
    if (Number.isNaN(date.getTime())) {
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
 * Format giờ của tin nhắn - điều chỉnh cho múi giờ +7 (Việt Nam)
 */
export const formatMessageDate = (dateString: string): string => {
  try {
    if (!dateString) {
      return 'Không xác định'
    }
    const date = new Date(dateString)
    // Kiểm tra xem date có hợp lệ không
    if (Number.isNaN(date.getTime())) {
      return 'Không xác định'
    }

    // Điều chỉnh giờ theo múi giờ Việt Nam (+7)
    // Lấy giờ UTC và chuyển đổi sang múi giờ Việt Nam (+7)
    const localDate = new Date(date.getTime())
    // Thêm offset 7 giờ cho múi giờ Việt Nam
    localDate.setHours(localDate.getHours() + 7)

    return format(localDate, 'HH:mm')
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
        return // Bỏ qua tin nhắn không có timestamp
      }
      // Chuyển đổi sang giờ địa phương Việt Nam (+7)
      const date = new Date(message.timestamp)
      const localDate = new Date(date.getTime())
      localDate.setHours(localDate.getHours() + 7)
      // Kiểm tra xem date có hợp lệ không
      if (Number.isNaN(localDate.getTime())) {
        return // Bỏ qua timestamp không hợp lệ
      }
      const dateKey = format(localDate, 'dd/MM/yyyy')
      if (!groups[dateKey]) {
        groups[dateKey] = []
      }
      groups[dateKey].push(message)
    } catch (error) {
      console.error('Lỗi xử lý timestamp:', error, message)
      // Bỏ qua tin nhắn gây lỗi
    }
  })
  // Sắp xếp tin nhắn trong mỗi nhóm theo thời gian tăng dần (cũ nhất lên trên)
  Object.keys(groups).forEach((dateKey) => {
    groups[dateKey].sort((a, b) => {
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    })
  })
  // Sắp xếp các nhóm theo thứ tự ngày tăng dần (ngày cũ nhất lên trên)
  return Object.entries(groups)
    .sort(([dateA], [dateB]) => {
      const [dayA, monthA, yearA] = dateA.split('/').map(Number)
      const [dayB, monthB, yearB] = dateB.split('/').map(Number)
      // So sánh theo năm, tháng, ngày
      if (yearA !== yearB) return yearA - yearB
      if (monthA !== monthB) return monthA - monthB
      return dayA - dayB
    })
    .map(([date, messages]) => ({
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
