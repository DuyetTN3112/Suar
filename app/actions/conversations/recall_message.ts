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
    console.log(`[RecallMessage] Đang xử lý yêu cầu thu hồi tin nhắn:`, {
      messageId,
      scope,
      userId,
    })
    // Tìm tin nhắn cần thu hồi
    const message = await Message.find(messageId)
    if (!message) {
      console.error(`[RecallMessage] Không tìm thấy tin nhắn với ID ${messageId}`)
      throw new NotFoundError('Tin nhắn không tồn tại hoặc đã bị xóa')
    }

    console.log(`[RecallMessage] Đã tìm thấy tin nhắn:`, message.summary)

    // Kiểm tra quyền thu hồi
    if (!userId) {
      console.error(`[RecallMessage] Không có thông tin người dùng`)
      throw new UnauthorizedError('Bạn cần đăng nhập để thực hiện thao tác này')
    }

    // Chỉ người gửi tin nhắn mới có thể thu hồi
    if (message.sender_id !== userId) {
      console.error(
        `[RecallMessage] Người dùng ${userId} không phải là người gửi tin nhắn ${messageId}`
      )
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

          console.log(`[RecallMessage] Đang cập nhật tin nhắn với scope 'all':`, {
            is_recalled: message.is_recalled,
            recall_scope: message.recall_scope,
            recalled_at: message.recalled_at?.toISO(),
          })
          
          await message.save()
        } else if (scope === 'self') {
          // Thu hồi chỉ với bản thân: Thêm bản ghi vào deleted_messages
          // Không cập nhật is_recalled và recall_scope trong messages
          
          console.log(`[RecallMessage] Đang thêm bản ghi vào deleted_messages với scope 'self'`)
          
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
          } else {
            console.log(`[RecallMessage] Bản ghi đã tồn tại trong deleted_messages`)
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
        console.error(`[RecallMessage] NGHIÊM TRỌNG: Không thể tìm thấy tin nhắn sau khi xử lý!`)
        throw new Error('Không thể xác nhận trạng thái tin nhắn sau khi thu hồi')
      }
      
      console.log(`[RecallMessage] Trạng thái tin nhắn sau khi xử lý:`, refreshedMessage.summary)
      
      // Kiểm tra trạng thái thu hồi dựa vào scope
      let validationSuccess = false
      
      if (result.scope === 'all') {
        validationSuccess = refreshedMessage.isRecalledForEveryone
        if (!validationSuccess) {
          console.error(
            `[RecallMessage] CẢNH BÁO: Tin nhắn không được đánh dấu thu hồi cho mọi người!`
          )
        }
      } else if (result.scope === 'self') {
        // Kiểm tra xem bản ghi đã được thêm vào deleted_messages chưa
        const deletedRecord = await DeletedMessage.query()
          .where('message_id', messageId)
          .where('user_id', userId)
          .first()
          
        validationSuccess = !!deletedRecord
        if (!validationSuccess) {
          console.error(`[RecallMessage] CẢNH BÁO: Tin nhắn không được thêm vào deleted_messages!`)
        }
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
      console.error(`[RecallMessage] Lỗi khi xử lý thu hồi tin nhắn:`, error)
      throw error
    }
  }
}
