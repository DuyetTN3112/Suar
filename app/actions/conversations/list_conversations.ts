import Conversation from '#models/conversation'
import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'

type FilterOptions = {
  page?: number
  limit?: number
  search?: string
}

type PaginatedResponse<T> = {
  data: T[]
  meta: {
    total: number
    per_page: number
    current_page: number
    last_page: number
    first_page: number
    next_page_url: string | null
    previous_page_url: string | null
  }
}

@inject()
export default class ListConversations {
  constructor(protected ctx: HttpContext) {}

  async handle(options: FilterOptions = {}): Promise<PaginatedResponse<Conversation>> {
    const user = this.ctx.auth.user!
    const page = options.page || 1
    const limit = options.limit || 15
    // Lấy danh sách các cuộc trò chuyện mà người dùng tham gia
    const mainQuery = Conversation.query()
      .whereHas('conversation_participants', (participantBuilder) => {
        participantBuilder.where('user_id', user.id)
      })
      .whereNull('deleted_at')
      // Preload participants với user data
      .preload('participants')
      .preload('conversation_participants', (participantQuery) => {
        participantQuery.preload('user')
      })

    // Thêm số tin nhắn chưa đọc vào mỗi cuộc trò chuyện
    const conversationsWithUnreadCount = await db.rawQuery(
      `
      SELECT 
        c.id, 
        COUNT(m.id) as unread_count,
        MAX(m.timestamp) as last_message_at
      FROM 
        conversations c
      JOIN 
        conversation_participants cp ON c.id = cp.conversation_id 
      LEFT JOIN 
        messages m ON c.id = m.conversation_id AND m.sender_id != ? AND m.read_at IS NULL
      WHERE 
        cp.user_id = ? AND c.deleted_at IS NULL
      GROUP BY 
        c.id
      ORDER BY 
        last_message_at DESC
    `,
      [user.id, user.id]
    )
    // Lọc tìm kiếm nếu có
    if (options.search) {
      mainQuery.where((searchBuilder) => {
        searchBuilder
          .where('title', 'LIKE', `%${options.search}%`)
          // Sửa lại relation để tìm kiếm đúng
          .orWhereHas('participants', (userSearchBuilder) => {
            userSearchBuilder.where('full_name', 'LIKE', `%${options.search}%`)
          })
      })
    }
    // Sắp xếp theo tin nhắn mới nhất
    mainQuery.orderBy('updated_at', 'desc')
    const paginator = await mainQuery.paginate(page, limit)
    const conversations = paginator.all()
    // Kết hợp số lượng tin nhắn chưa đọc vào kết quả
    const unreadMap = new Map()
    conversationsWithUnreadCount.forEach((row: any) => {
      unreadMap.set(row.id, {
        unreadCount: row.unread_count || 0,
        lastMessageAt: row.last_message_at,
      })
    })
    // Thêm thông tin về tin nhắn chưa đọc vào từng cuộc trò chuyện
    conversations.forEach((conversation: Conversation) => {
      const unreadInfo = unreadMap.get(conversation.id) || { unreadCount: 0, lastMessageAt: null }
      conversation.$extras = {
        ...conversation.$extras,
        unreadCount: unreadInfo.unreadCount,
        lastMessageAt: unreadInfo.lastMessageAt,
      }
    })
    return {
      data: conversations,
      meta: {
        total: paginator.total,
        per_page: paginator.perPage,
        current_page: paginator.currentPage,
        last_page: paginator.lastPage,
        first_page: paginator.firstPage,
        next_page_url: paginator.getNextPageUrl() || null,
        previous_page_url: paginator.getPreviousPageUrl() || null,
      },
    }
  }
}
