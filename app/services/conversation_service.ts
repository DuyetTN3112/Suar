import Conversation from '#models/conversation'
import ConversationParticipant from '#models/conversation_participant'
import OrganizationUser from '#models/organization_user'
// import User from '#models/user'
import db from '@adonisjs/lucid/services/db'

export default class ConversationService {
  /**
   * Đảm bảo người dùng có quyền truy cập vào cuộc trò chuyện
   * Kiểm tra và thêm người dùng vào organization nếu cần
   */
  static async ensureUserAccessToConversation(
    userId: number,
    conversationId: number
  ): Promise<boolean> {
    try {
      // Lấy thông tin cuộc trò chuyện
      const conversation = await Conversation.find(conversationId)
      if (!conversation || !conversation.organization_id) {
        return false
      }

      // Kiểm tra xem người dùng đã là thành viên của conversation chưa
      const isParticipant = await ConversationParticipant.query()
        .where('conversation_id', conversationId)
        .where('user_id', userId)
        .first()

      if (!isParticipant) {
        // Thêm người dùng vào conversation nếu chưa có
        await ConversationParticipant.create({
          conversation_id: conversationId,
          user_id: userId,
        })
      }

      // Kiểm tra xem người dùng đã là thành viên của organization chưa
      const orgUser = await OrganizationUser.query()
        .where('organization_id', conversation.organization_id)
        .where('user_id', userId)
        .first()

      if (!orgUser) {
        // Thêm người dùng vào organization với trạng thái approved
        await OrganizationUser.create({
          organization_id: conversation.organization_id,
          user_id: userId,
          role_id: 3, // Default role for regular users
          status: 'approved',
        })
      } else if (orgUser.status !== 'approved') {
        // Cập nhật trạng thái nếu chưa được approved
        await orgUser.merge({ status: 'approved' }).save()
      }

      return true
    } catch (error) {
      console.error('Lỗi khi đảm bảo quyền truy cập cuộc trò chuyện:', error)
      return false
    }
  }

  /**
   * Kiểm tra xem người dùng có quyền gửi tin nhắn trong cuộc trò chuyện không
   */
  static async canUserSendMessage(userId: number, conversationId: number): Promise<boolean> {
    try {
      // Kiểm tra người dùng có trong conversation_participants
      const isParticipant = await db
        .from('conversation_participants')
        .where('conversation_id', conversationId)
        .where('user_id', userId)
        .first()

      if (!isParticipant) {
        return false
      }

      // Lấy organization_id từ cuộc trò chuyện
      const conversation = await Conversation.find(conversationId)
      if (!conversation || !conversation.organization_id) {
        return false
      }

      // Kiểm tra người dùng có trong organization_users với trạng thái approved
      const orgUser = await db
        .from('organization_users')
        .where('organization_id', conversation.organization_id)
        .where('user_id', userId)
        .where('status', 'approved')
        .first()

      return !!orgUser
    } catch (error) {
      console.error('Lỗi khi kiểm tra quyền gửi tin nhắn:', error)
      return false
    }
  }

  /**
   * Loại bỏ người dùng khỏi cuộc trò chuyện nếu họ không còn thuộc tổ chức
   */
  static async removeUserIfNotInOrganization(
    userId: number,
    conversationId: number
  ): Promise<void> {
    try {
      // Lấy thông tin cuộc trò chuyện
      const conversation = await Conversation.find(conversationId)
      if (!conversation || !conversation.organization_id) {
        return
      }

      // Kiểm tra xem người dùng có còn trong organization không
      const orgUser = await OrganizationUser.query()
        .where('organization_id', conversation.organization_id)
        .where('user_id', userId)
        .where('status', 'approved')
        .first()

      // Nếu người dùng không còn trong organization, xóa họ khỏi conversation
      if (!orgUser) {
        await ConversationParticipant.query()
          .where('conversation_id', conversationId)
          .where('user_id', userId)
          .delete()
      }
    } catch (error) {
      console.error('Lỗi khi loại bỏ người dùng khỏi cuộc trò chuyện:', error)
    }
  }
}
