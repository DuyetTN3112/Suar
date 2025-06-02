import type { HttpContext } from '@adonisjs/core/http'
import ValidationException from '#exceptions/validation_exception'
import {
  hasTooManyRepeats,
  detectZalgoText,
  countSpecialUnicode,
  sanitizeMessage,
} from '#libs/message_utils'

export default class MessageSanitizer {
  public async handle({ request }: HttpContext, next: () => Promise<void>) {
    const message = request.input('message') as unknown
    if (typeof message !== 'string') {
      throw ValidationException.field('message', 'Tin nhắn không hợp lệ.')
    }
    if (message.length > 10000) {
      throw ValidationException.field('message', 'Tin nhắn vượt quá 10,000 ký tự.')
    }
    if (hasTooManyRepeats(message)) {
      throw ValidationException.field('message', 'Tin nhắn chứa quá nhiều ký tự lặp lại.')
    }
    if (countSpecialUnicode(message) > 1000) {
      throw ValidationException.field('message', 'Tin nhắn chứa quá nhiều ký tự đặc biệt.')
    }
    if (message.replace(/\s/g, '').length < 1) {
      throw ValidationException.field('message', 'Tin nhắn không hợp lệ.')
    }
    // Phát hiện Zalgo text
    if (detectZalgoText(message)) {
      // Làm sạch tin nhắn
      request.updateBody({
        ...request.body(),
        message: sanitizeMessage(message),
      })
    }
    await next()
  }
}
