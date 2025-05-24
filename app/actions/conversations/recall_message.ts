import Message from '#models/message'
import DeletedMessage from '#models/deleted_message'
import { DateTime } from 'luxon'
import { inject } from '@adonisjs/core'
import { Exception } from '@adonisjs/core/exceptions'
import db from '@adonisjs/lucid/services/db'

// Định nghĩa các lớp Exception cần thiết
class NotFoundError extends Exception {
  static status = 404
  static code = 'E_NOT_FOUND'
}

class UnauthorizedError extends Exception {
  static status = 401
  static code = 'E_UNAUTHORIZED'
}

interface RecallMessageParams {
  messageId: number
  scope: 'all' | 'self'
  userId: number
}

@inject()
export default class RecallMessage {
  /**
   * Thu hồi tin nhắn
   */
  async handle({ messageId, scope, userId }: RecallMessageParams) {
    // Tìm tin nhắn cần thu hồi
    const message = await Message.find(messageId)
    if (!message) {
      throw new NotFoundError('Tin nhắn không tồn tại hoặc đã bị xóa')
    }

    // Kiểm tra quyền thu hồi
    if (!userId) {
      throw new UnauthorizedError('Bạn cần đăng nhập để thực hiện thao tác này')
    }

    // Chỉ người gửi tin nhắn mới có thể thu hồi
    if (message.sender_id !== userId) {
      throw new UnauthorizedError('Bạn không có quyền thu hồi tin nhắn này')
    }

    try {
      // Bắt đầu transaction để đảm bảo tính toàn vẹn dữ liệu
      const result = await db.transaction(async (trx) => {
        message.useTransaction(trx)

        if (scope === 'all') {
          // Thu hồi với tất cả: Cập nhật trường trong messages
          message.is_recalled = true
          message.recalled_at = DateTime.now()
          message.recall_scope = scope

          if (scope === 'all') {
            // Khi thu hồi với tất cả, thay đổi nội dung tin nhắn
            message.message = 'Tin nhắn này đã bị thu hồi.'
          }

          await message.save()
        } else if (scope === 'self') {
          // Thu hồi chỉ với bản thân: Thêm bản ghi vào deleted_messages
          // Không cập nhật is_recalled và recall_scope trong messages

          // Kiểm tra xem bản ghi đã tồn tại chưa để tránh lỗi unique constraint
          const existingRecord = await DeletedMessage.query()
            .where('message_id', messageId)
            .where('user_id', userId)
            .first()

          if (!existingRecord) {
            const deletedMessage = new DeletedMessage()
            deletedMessage.message_id = messageId
            deletedMessage.user_id = userId
            deletedMessage.useTransaction(trx)
            await deletedMessage.save()
          }
        }

        return {
          scope,
          success: true,
        }
      })

      // Kiểm tra lại xem tin nhắn đã được xử lý thành công chưa
      const refreshedMessage = await Message.find(messageId)
      if (!refreshedMessage) {
        throw new Error('Không thể xác nhận trạng thái tin nhắn sau khi thu hồi')
      }

      // Kiểm tra trạng thái thu hồi dựa vào scope
      let validationSuccess = false

      if (result.scope === 'all') {
        validationSuccess = refreshedMessage.isRecalledForEveryone
      } else if (result.scope === 'self') {
        // Kiểm tra xem bản ghi đã được thêm vào deleted_messages chưa
        const deletedRecord = await DeletedMessage.query()
          .where('message_id', messageId)
          .where('user_id', userId)
          .first()

        validationSuccess = !!deletedRecord
      }

      return {
        success: validationSuccess,
        message: 'Tin nhắn đã được thu hồi thành công',
        data: refreshedMessage,
        scope: result.scope,
        validationChecks: {
          isEffectivelyRecalled: result.scope === 'all' ? refreshedMessage.isEffectivelyRecalled : true,
          isRecalledForEveryone: result.scope === 'all' ? refreshedMessage.isRecalledForEveryone : 'not-applicable',
          isDeletedForSelf: result.scope === 'self' ? validationSuccess : 'not-applicable',
        },
      }
    } catch (error) {
      throw error
    }
  }
}
