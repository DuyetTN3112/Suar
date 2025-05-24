import type { HttpContext } from '@adonisjs/core/http'

function hasTooManyRepeats(
  str: string
  // maxRepeat = 20
): boolean {
  return /(.)\1{19,}/u.test(str)
}

// Phát hiện ký tự Zalgo (kết hợp chồng lên nhau) và các ký tự Unicode đặc biệt khác
function detectZalgoText(str: string): boolean {
  // Phát hiện số lượng ký tự kết hợp (combining characters) trên mỗi ký tự cơ bản
  const combiningCharPattern =
    /(.[\u0300-\u036F\u1AB0-\u1AFF\u1DC0-\u1DFF\u20D0-\u20FF\uFE20-\uFE2F]{5,})/gu
  return combiningCharPattern.test(str)
}

function countSpecialUnicode(str: string): number {
  // Đếm số lượng ký tự Unicode ngoài phạm vi thông thường
  return Array.from(str).filter((ch) => ch.codePointAt(0)! > 0xffff).length
}

/**
 * Kiểm tra mật độ ký tự đặc biệt trong văn bản
 * Kỹ thuật này phát hiện khi có quá nhiều ký tự đặc biệt trong một đoạn văn bản nhỏ
 */
// function checkSpecialCharDensity(str: string): boolean {
//   const chunks = []
//   // Chia nhỏ chuỗi thành các đoạn 50 ký tự
//   for (let i = 0; i < str.length; i += 50) {
//     chunks.push(str.substring(i, i + 50))
//   }
//   // Kiểm tra từng đoạn
//   return chunks.some((chunk) => {
//     const specialChars = Array.from(chunk).filter((ch) => {
//       const code = ch.codePointAt(0)!
//       return (
//         code > 0x7f &&
//         ((code >= 0x300 && code <= 0x36f) || // Combining diacritical marks
//           (code >= 0x1ab0 && code <= 0x1aff) || // Combining diacritical marks extended
//           (code >= 0x1dc0 && code <= 0x1dff) || // Combining diacritical marks supplement
//           (code >= 0x20d0 && code <= 0x20ff) || // Combining diacritical marks for symbols
//           code === 0x02ec || // Modifier Letter Voicing
//           code === 0x20dd || // Combining Enclosing Diamond
//           code === 0xa66f || // Combining Cyrillic Vzmet
//           /[\u0300-\u036F\u1AB0-\u1AFF\u1DC0-\u1DFF\u20D0-\u20FF\uFE20-\uFE2F\u02EC\u20DD\u0489꙰]/.test(
//             ch
//           ))
//       )
//     })
//     // Nếu mật độ ký tự đặc biệt > 15% thì xem là tấn công
//     return specialChars.length > chunk.length * 0.15
//   })
// }

// Làm sạch Zalgo text và giới hạn ký tự kết hợp
function sanitizeMessage(str: string): string {
  // Loại bỏ hoàn toàn các ký tự đặc biệt thường dùng trong tấn công Zalgo
  str = str.replace(/[꙰\u02EC\u20DD]/g, '')
  // Loại bỏ các ký tự kết hợp quá nhiều, giữ lại tối đa 1 ký tự kết hợp cho mỗi ký tự cơ bản
  str = str.replace(
    /(.)([\u0300-\u036F\u1AB0-\u1AFF\u1DC0-\u1DFF\u20D0-\u20FF\uFE20-\uFE2F]{1,})/gu,
    (
      // match
      base,
      combining
    ) => base + combining.substring(0, 1)
  )
  // Giới hạn độ dài của chuỗi lặp lại
  str = str.replace(
    /(.)(\1{10,})/g,
    (
      // match,
      char
      //  repeats
    ) => char.repeat(10)
  )

  return str
}

export default class MessageSanitizer {
  public async handle({ request, response }: HttpContext, next: () => Promise<void>) {
    const message = request.input('message')
    if (typeof message !== 'string') {
      return response.badRequest('Tin nhắn không hợp lệ.')
    }
    if (message.length > 10000) {
      return response.badRequest('Tin nhắn vượt quá 10,000 ký tự.')
    }
    if (hasTooManyRepeats(message)) {
      return response.badRequest('Tin nhắn chứa quá nhiều ký tự lặp lại.')
    }
    if (countSpecialUnicode(message) > 1000) {
      return response.badRequest('Tin nhắn chứa quá nhiều ký tự đặc biệt.')
    }
    if (message.replace(/\s/g, '').length < 1) {
      return response.badRequest('Tin nhắn không hợp lệ.')
    }
    // Phát hiện Zalgo text
    if (detectZalgoText(message)) {
      // Lựa chọn 1: Từ chối hoàn toàn
      // return response.badRequest('Tin nhắn chứa định dạng không được phép.')
      // Lựa chọn 2: Làm sạch tin nhắn
      request.updateBody({
        ...request.body(),
        message: sanitizeMessage(message),
      })
    }
    await next()
  }
}
