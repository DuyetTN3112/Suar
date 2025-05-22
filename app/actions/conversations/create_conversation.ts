import { HttpContext } from '@adonisjs/core/http'
import Conversation from '#models/conversation'
import ConversationParticipant from '#models/conversation_participant'
import { DateTime } from 'luxon'
import Message from '#models/message'
import { inject } from '@adonisjs/core'
import db from '@adonisjs/lucid/services/db'

type ConversationData = {
  title?: string
  participants: number[]
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
    const user = this.ctx.auth.user!
    // Kiểm tra có ít nhất một người tham gia khác ngoài người tạo
    if (!data.participants.length) {
      throw new Error('Cần có ít nhất một người tham gia')
    }
    // Kiểm tra xem người tham gia có bao gồm người tạo không
    const allParticipants = data.participants.includes(user.id)
      ? data.participants
      : [...data.participants, user.id]
    // Thêm trường hợp trò chuyện 1-1, kiểm tra xem đã có cuộc trò chuyện nào chỉ giữa 2 người này chưa
    if (allParticipants.length === 2 && !data.title) {
      const existingConversation = await this.findExistingDirectConversation(
        user.id,
        allParticipants.find((id) => id !== user.id) || 0
      )
      if (existingConversation) {
        // Nếu đã có cuộc trò chuyện trước đó và có tin nhắn khởi tạo, thêm tin nhắn mới
        if (data.initial_message) {
          await Message.create({
            conversation_id: existingConversation.id,
            sender_id: user.id,
            message: data.initial_message,
            timestamp: DateTime.now(),
          })
          // Cập nhật thời gian cập nhật của cuộc trò chuyện
          await existingConversation.merge({ updated_at: DateTime.now() }).save()
        }
        return existingConversation
      }
    }
    // Tạo transaction để đảm bảo tính nhất quán dữ liệu
    return await db.transaction(async (trx) => {
      // Tạo cuộc trò chuyện mới
      const conversation = await Conversation.create(
        {
          title: data.title || null,
        },
        { client: trx }
      )
      // Thêm người tham gia
      await Promise.all(
        allParticipants.map((participantId) =>
          ConversationParticipant.create(
            {
              conversation_id: conversation.id,
              user_id: participantId,
            },
            { client: trx }
          )
        )
      )
      // Thêm tin nhắn đầu tiên nếu có
      if (data.initial_message) {
        await Message.create(
          {
            conversation_id: conversation.id,
            sender_id: user.id,
            message: data.initial_message,
            timestamp: DateTime.now(),
          },
          { client: trx }
        )
      }
      return conversation
    })
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
}
