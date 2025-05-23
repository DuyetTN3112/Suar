import { HttpContext } from '@adonisjs/core/http'
import Conversation from '#models/conversation'
import ConversationParticipant from '#models/conversation_participant'
import { DateTime } from 'luxon'
import Message from '#models/message'
import { inject } from '@adonisjs/core'
import db from '@adonisjs/lucid/services/db'

type ConversationData = {
  title?: string
  participants: string[] | number[] // Hỗ trợ cả string[] và number[]
  initial_message?: string
}

interface ConversationCount {
  id: number
  participant_count: number
}

interface ConversationParticipantData {
  conversation_id: number
  user_id: number
}

@inject()
export default class CreateConversation {
  constructor(protected ctx: HttpContext) {}

  async handle({ data }: { data: ConversationData }) {
    console.log('=== DEBUG CREATE CONVERSATION ACTION ===')
    console.log('Dữ liệu nhận được:', data)
    const user = this.ctx.auth.user!
    console.log('Thông tin người dùng hiện tại:', {
      id: user.id,
      email: user.email,
      current_organization_id: user.current_organization_id,
    })
    // Kiểm tra có ít nhất một người tham gia khác ngoài người tạo
    if (!data.participants.length) {
      console.log('Lỗi: Không có người tham gia nào')
      throw new Error('Cần có ít nhất một người tham gia')
    }
    // Chuyển đổi participants từ string[] sang number[] nếu cần
    const participantsAsNumbers = data.participants.map((id) =>
      typeof id === 'string' ? Number.parseInt(id, 10) : id
    )
    console.log('Danh sách người tham gia sau khi chuyển đổi:', participantsAsNumbers)
    // Kiểm tra xem người tham gia có bao gồm người tạo không
    const includesCreator = participantsAsNumbers.includes(user.id)
    console.log('Người tạo có trong danh sách người tham gia:', includesCreator)
    const allParticipants = includesCreator
      ? participantsAsNumbers
      : [...participantsAsNumbers, user.id]
    console.log('Danh sách tất cả người tham gia:', allParticipants)
    try {
      // Thêm trường hợp trò chuyện 1-1, kiểm tra xem đã có cuộc trò chuyện nào chỉ giữa 2 người này chưa
      if (allParticipants.length === 2 && !data.title) {
        console.log('Kiểm tra cuộc trò chuyện 1-1 đã tồn tại')
        const otherUserId = allParticipants.find((id) => id !== user.id) || 0
        console.log('ID người dùng khác:', otherUserId)
        const existingConversation = await this.findExistingDirectConversation(user.id, otherUserId)
        if (existingConversation) {
          console.log('Đã tìm thấy cuộc trò chuyện 1-1 đã tồn tại:', existingConversation.id)
          // Nếu đã có cuộc trò chuyện trước đó và có tin nhắn khởi tạo, thêm tin nhắn mới
          if (data.initial_message) {
            console.log('Thêm tin nhắn mới vào cuộc trò chuyện đã tồn tại')
            await Message.create({
              conversation_id: existingConversation.id,
              sender_id: user.id,
              message: data.initial_message,
            })
            // Cập nhật thời gian cập nhật của cuộc trò chuyện
            await existingConversation.merge({ updated_at: DateTime.now() }).save()
          }
          return existingConversation
        }
      } else if (allParticipants.length > 2) {
        console.log('Kiểm tra cuộc trò chuyện nhóm đã tồn tại')
        // Kiểm tra cuộc trò chuyện nhóm đã tồn tại
        const existingGroupConversation = await this.findExistingGroupConversation(allParticipants)
        if (existingGroupConversation) {
          console.log('Đã tìm thấy cuộc trò chuyện nhóm đã tồn tại:', existingGroupConversation.id)
          if (data.initial_message) {
            console.log('Thêm tin nhắn mới vào cuộc trò chuyện nhóm đã tồn tại')
            await Message.create({
              conversation_id: existingGroupConversation.id,
              sender_id: user.id,
              message: data.initial_message,
            })
            await existingGroupConversation.merge({ updated_at: DateTime.now() }).save()
          }
          return existingGroupConversation
        }
      }
      // Sử dụng stored procedure để tạo cuộc trò chuyện
      console.log('Tạo cuộc trò chuyện mới sử dụng stored procedure')
      // Chuyển đổi mảng người tham gia thành chuỗi phân cách bằng dấu phẩy
      const participantIdsString = allParticipants.filter((id) => id !== user.id).join(',')
      // Gọi stored procedure create_conversation
      const result = await db.rawQuery('CALL create_conversation(?, ?, ?)', [
        user.id,
        user.current_organization_id,
        participantIdsString,
      ])
      // Lấy ID của cuộc trò chuyện vừa tạo
      const conversationId = result[0][0]?.id || result[0][0]?.LAST_INSERT_ID()
      if (!conversationId) {
        throw new Error('Không thể tạo cuộc trò chuyện')
      }
      console.log('Đã tạo cuộc trò chuyện mới với ID:', conversationId)
      // Thêm tin nhắn đầu tiên nếu có
      if (data.initial_message) {
        console.log('Thêm tin nhắn đầu tiên vào cuộc trò chuyện mới')
        await db.rawQuery('CALL send_message(?, ?, ?)', [
          conversationId,
          user.id,
          data.initial_message,
        ])
      }
      // Lấy thông tin cuộc trò chuyện vừa tạo
      const conversation = await Conversation.find(conversationId)
      if (!conversation) {
        throw new Error('Không thể tìm thấy cuộc trò chuyện vừa tạo')
      }
      return conversation
    } catch (error) {
      console.error('Lỗi khi tạo cuộc trò chuyện:', error)
      console.error('Chi tiết lỗi:', error.message)
      console.error('Stack trace:', error.stack)
      throw error
    }
  }
  // Hàm tìm cuộc trò chuyện trực tiếp giữa 2 người
  private async findExistingDirectConversation(userId1: number, userId2: number) {
    // Tìm cuộc trò chuyện chỉ có đúng 2 người tham gia
    const conversationsWithCount = await db.rawQuery<ConversationCount[]>(`
      SELECT c.id, COUNT(cp.user_id) as participant_count
      FROM conversations c
      JOIN conversation_participants cp ON c.id = cp.conversation_id
      WHERE c.title IS NULL AND c.deleted_at IS NULL
      GROUP BY c.id
      HAVING participant_count = 2
    `)

    // Lọc những cuộc trò chuyện có cả 2 người tham gia
    const potentialConversationIds = conversationsWithCount.map((row) => row.id)
    if (potentialConversationIds.length === 0) {
      return null
    }
    const participantsInConversations = await db.rawQuery<ConversationParticipantData[]>(
      `
      SELECT conversation_id, user_id
      FROM conversation_participants
      WHERE conversation_id IN (?)
        AND user_id IN (?, ?)
    `,
      [potentialConversationIds, userId1, userId2]
    )

    // Nhóm theo cuộc trò chuyện
    const participantsByConversation = new Map<number, Set<number>>()
    participantsInConversations.forEach((row) => {
      if (!participantsByConversation.has(row.conversation_id)) {
        participantsByConversation.set(row.conversation_id, new Set())
      }
      participantsByConversation.get(row.conversation_id)!.add(row.user_id)
    })
    // Tìm cuộc trò chuyện có đúng 2 người tham gia này
    for (const [conversationId, participants] of participantsByConversation.entries()) {
      if (participants.has(userId1) && participants.has(userId2) && participants.size === 2) {
        return await Conversation.find(conversationId)
      }
    }
    return null
  }
  // Hàm tìm cuộc trò chuyện nhóm với chính xác những người tham gia
  private async findExistingGroupConversation(participantIds: number[]) {
    console.log('Tìm cuộc trò chuyện nhóm với những người tham gia:', participantIds)
    try {
      // Sắp xếp ID người tham gia để đảm bảo so sánh chính xác
      const sortedParticipantIds = [...participantIds].sort((a, b) => a - b)
      console.log('Danh sách người tham gia đã sắp xếp:', sortedParticipantIds)
      // Tìm tất cả cuộc trò chuyện có đúng số lượng người tham gia
      const conversationsWithCount = await db.rawQuery<ConversationCount[]>(
        `
        SELECT c.id, COUNT(cp.user_id) as participant_count
        FROM conversations c
        JOIN conversation_participants cp ON c.id = cp.conversation_id
        WHERE c.deleted_at IS NULL
        GROUP BY c.id
        HAVING participant_count = ?
      `,
        [sortedParticipantIds.length]
      )
      console.log(
        `Tìm thấy ${conversationsWithCount.length} cuộc trò chuyện có ${sortedParticipantIds.length} người tham gia`
      )
      // Lọc những cuộc trò chuyện có đúng những người tham gia này
      const potentialConversationIds = conversationsWithCount.map((row) => row.id)
      if (potentialConversationIds.length === 0) {
        console.log('Không tìm thấy cuộc trò chuyện tiềm năng')
        return null
      }
      // Lấy tất cả người tham gia của các cuộc trò chuyện tiềm năng
      const participantsInConversations = await db.rawQuery<ConversationParticipantData[]>(
        `
        SELECT conversation_id, user_id
        FROM conversation_participants
        WHERE conversation_id IN (${potentialConversationIds.map(() => '?').join(',')})
        `,
        [...potentialConversationIds]
      )
      console.log(
        `Tìm thấy ${participantsInConversations.length} bản ghi người tham gia trong các cuộc trò chuyện tiềm năng`
      )
      // Nhóm theo cuộc trò chuyện
      const participantsByConversation = new Map<number, Set<number>>()
      participantsInConversations.forEach((row) => {
        if (!participantsByConversation.has(row.conversation_id)) {
          participantsByConversation.set(row.conversation_id, new Set())
        }
        participantsByConversation.get(row.conversation_id)!.add(row.user_id)
      })
      // Tìm cuộc trò chuyện có đúng những người tham gia này
      for (const [conversationId, participants] of participantsByConversation.entries()) {
        console.log(
          `Kiểm tra cuộc trò chuyện ${conversationId} với ${participants.size} người tham gia`
        )
        // Kiểm tra số lượng người tham gia
        if (participants.size !== sortedParticipantIds.length) {
          console.log(
            `Cuộc trò chuyện ${conversationId} có ${participants.size} người tham gia, không khớp với ${sortedParticipantIds.length}`
          )
          continue
        }
        // Kiểm tra từng người tham gia
        let allMatch = true
        for (const participantId of sortedParticipantIds) {
          if (!participants.has(participantId)) {
            console.log(
              `Cuộc trò chuyện ${conversationId} không có người tham gia ${participantId}`
            )
            allMatch = false
            break
          }
        }
        if (allMatch) {
          console.log(`Tìm thấy cuộc trò chuyện ${conversationId} khớp với tất cả người tham gia`)
          return await Conversation.find(conversationId)
        }
      }

      console.log('Không tìm thấy cuộc trò chuyện nhóm khớp')
      return null
    } catch (error) {
      console.error('Lỗi khi tìm cuộc trò chuyện nhóm:', error)
      return null
    }
  }
}
