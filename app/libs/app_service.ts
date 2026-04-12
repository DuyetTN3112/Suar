import { DateTime } from 'luxon'

import { formatDateTime as formatDateTimeLib } from '#libs/date_utils'
import { truncate as truncateString, generateSlug } from '#libs/string_utils'
import env from '#start/env'

/**
 * Lấy tên ứng dụng
 */
function getAppName(): string {
  return env.get('APP_NAME', 'Suar')
}

/**
 * Lấy URL ứng dụng
 */
function getAppUrl(): string {
  return env.get('APP_URL', 'http://localhost:3000')
}

/**
 * Lấy logo ứng dụng
 */
function getAppLogo(): string {
  return env.get('APP_LOGO', '/images/logo.png')
}

/**
 * Lấy thời gian hiện tại dựa trên múi giờ của ứng dụng
 */
function getCurrentDateTime(): DateTime {
  return DateTime.local().setZone(env.get('APP_TIMEZONE', 'Asia/Ho_Chi_Minh'))
}

/**
 * Định dạng datetime theo múi giờ và định dạng của ứng dụng
 * Legacy note: prefer formatDateTime from '#libs/date_utils'
 */
function formatDateTime(
  date: string | Date | DateTime,
  format = 'dd/MM/yyyy HH:mm'
): string {
  return formatDateTimeLib(date, format)
}

/**
 * Lấy tên phiên bản hiện tại của ứng dụng
 */
function getAppVersion(): string {
  return process.env.npm_package_version ?? '1.0.0'
}

/**
 * Lấy thông tin về môi trường ứng dụng
 */
function getEnv(): string {
  return env.get('NODE_ENV', 'development')
}

/**
 * Kiểm tra xem ứng dụng có đang chạy ở môi trường development không
 */
function isDev(): boolean {
  return getEnv() === 'development'
}

/**
 * Kiểm tra xem ứng dụng có đang chạy ở môi trường production không
 */
function isProd(): boolean {
  return getEnv() === 'production'
}

/**
 * Cắt chuỗi với số ký tự tối đa cho trước và thêm dấu ... nếu chuỗi dài hơn
 * Legacy note: prefer truncate from '#libs/string_utils'
 */
function truncate(text: string, maxLength = 100): string {
  return truncateString(text, maxLength)
}

/**
 * Tạo slug từ chuỗi (chuyển thành chữ thường, bỏ dấu, thay khoảng trắng bằng dấu gạch ngang)
 * Legacy note: prefer generateSlug from '#libs/string_utils'
 */
function slugify(text: string): string {
  return generateSlug(text)
}

const AppService = {
  getAppName,
  getAppUrl,
  getAppLogo,
  getCurrentDateTime,
  formatDateTime,
  getAppVersion,
  getEnv,
  isDev,
  isProd,
  truncate,
  slugify,
}

export default AppService
