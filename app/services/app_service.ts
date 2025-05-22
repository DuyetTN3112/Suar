import env from '#start/env'
import { DateTime } from 'luxon'

export default class AppService {
  /**
   * Lấy tên ứng dụng
   */
  static getAppName(): string {
    return env.get('APP_NAME', 'ShadcnAdmin')
  }

  /**
   * Lấy URL ứng dụng
   */
  static getAppUrl(): string {
    return env.get('APP_URL', 'http://localhost:3000')
  }

  /**
   * Lấy logo ứng dụng
   */
  static getAppLogo(): string {
    return env.get('APP_LOGO', '/images/logo.png')
  }

  /**
   * Lấy thời gian hiện tại dựa trên múi giờ của ứng dụng
   */
  static getCurrentDateTime(): DateTime {
    return DateTime.local().setZone(env.get('APP_TIMEZONE', 'Asia/Ho_Chi_Minh'))
  }

  /**
   * Định dạng datetime theo múi giờ và định dạng của ứng dụng
   */
  static formatDateTime(
    date: string | Date | DateTime,
    format: string = 'dd/MM/yyyy HH:mm'
  ): string {
    if (!date) return ''
    let dateTime: DateTime
    if (typeof date === 'string') {
      dateTime = DateTime.fromISO(date)
    } else if (date instanceof Date) {
      dateTime = DateTime.fromJSDate(date)
    } else {
      dateTime = date
    }
    return dateTime.setZone(env.get('APP_TIMEZONE', 'Asia/Ho_Chi_Minh')).toFormat(format)
  }

  /**
   * Lấy tên phiên bản hiện tại của ứng dụng
   */
  static getAppVersion(): string {
    return process.env.npm_package_version || '1.0.0'
  }

  /**
   * Lấy thông tin về môi trường ứng dụng
   */
  static getEnv(): string {
    return env.get('NODE_ENV', 'development')
  }

  /**
   * Kiểm tra xem ứng dụng có đang chạy ở môi trường development không
   */
  static isDev(): boolean {
    return this.getEnv() === 'development'
  }

  /**
   * Kiểm tra xem ứng dụng có đang chạy ở môi trường production không
   */
  static isProd(): boolean {
    return this.getEnv() === 'production'
  }

  /**
   * Cắt chuỗi với số ký tự tối đa cho trước và thêm dấu ... nếu chuỗi dài hơn
   */
  static truncate(text: string, maxLength: number = 100): string {
    if (!text) return ''
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  /**
   * Tạo slug từ chuỗi (chuyển thành chữ thường, bỏ dấu, thay khoảng trắng bằng dấu gạch ngang)
   */
  static slugify(text: string): string {
    if (!text) return ''
    let slug = text
      .toLowerCase()
      .replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g, 'a')
      .replace(/[èéẹẻẽêềếệểễ]/g, 'e')
      .replace(/[ìíịỉĩ]/g, 'i')
      .replace(/[òóọỏõôồốộổỗơờớợởỡ]/g, 'o')
      .replace(/[ùúụủũưừứựửữ]/g, 'u')
      .replace(/[ỳýỵỷỹ]/g, 'y')
      .replace(/đ/g, 'd')
      .replace(/[^\w ]+/g, '')
      .replace(/ +/g, '-')
    return slug
  }
}
