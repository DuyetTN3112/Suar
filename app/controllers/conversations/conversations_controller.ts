import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import ListConversations from '#actions/conversations/list_conversations'
import CreateConversation from '#actions/conversations/create_conversation'
import GetUserMetadata from '#actions/users/get_user_metadata'

/**
 * Controller xử lý các chức năng liệt kê, tạo và lưu cuộc trò chuyện
 */
export default class ConversationsController {
  /**
   * Liệt kê danh sách cuộc trò chuyện
   */
  @inject()
  async index({ request, inertia }: HttpContext, listConversations: ListConversations) {
    const page = request.input('page', 1)
    const limit = request.input('limit', 15)
    const search = request.input('search')
    const options = { page, limit, search }
    const conversations = await listConversations.handle(options)
    return inertia.render('conversations/index', { conversations })
  }

  /**
   * Hiển thị form tạo cuộc trò chuyện mới
   */
  @inject()
  async create({ inertia }: HttpContext, getUserMetadata: GetUserMetadata) {
    const metadata = await getUserMetadata.handle()
    return inertia.render('conversations/create', { metadata })
  }

  /**
   * Lưu cuộc trò chuyện mới vào database
   */
  @inject()
  async store({ request, response, session, auth }: HttpContext, createConversation: CreateConversation) {
    console.log('=== DEBUG CONTROLLER: TẠO HỘI THOẠI ===');
    console.log('Request body:', request.body());
    console.log('Request headers:', request.headers());
    
    try {
      console.log('Người dùng hiện tại:', auth.user?.id);
      console.log('Tổ chức hiện tại:', auth.user?.current_organization_id);
      
      const data = {
        title: request.input('title'),
        participants: request.input('participants', []),
        initial_message: request.input('initial_message'),
      }
      
      console.log('Dữ liệu nhận được từ request:', data);
      console.log('Kiểu dữ liệu của participants:', typeof data.participants);
      console.log('Participants là mảng:', Array.isArray(data.participants));
      
      if (Array.isArray(data.participants)) {
        console.log('Số lượng người tham gia:', data.participants.length);
        console.log('Danh sách người tham gia:', data.participants);
      } else {
        console.log('Participants không phải là mảng:', data.participants);
        // Thử chuyển đổi nếu là chuỗi JSON
        try {
          if (typeof data.participants === 'string') {
            data.participants = JSON.parse(data.participants);
            console.log('Đã chuyển đổi participants từ chuỗi JSON:', data.participants);
          }
        } catch (parseError) {
          console.error('Lỗi khi chuyển đổi participants:', parseError);
        }
      }
      
      console.log('Bắt đầu tạo cuộc trò chuyện...');
      const conversation = await createConversation.handle({ data });
      console.log('Đã tạo cuộc trò chuyện thành công:', conversation.id);
      
      session.flash('success', 'Cuộc trò chuyện đã được tạo thành công');
      return response.redirect().toRoute('conversations.show', { id: conversation.id });
    } catch (error) {
      console.error('=== LỖI KHI TẠO HỘI THOẠI ===');
      console.error('Chi tiết lỗi:', error.message);
      console.error('Stack trace:', error.stack);
      
      session.flash('error', error.message || 'Có lỗi xảy ra khi tạo cuộc trò chuyện');
      return response.redirect().back();
    }
  }
}
