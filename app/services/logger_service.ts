import env from '#start/env'
import logger from '@adonisjs/core/services/logger'

/**
 * Cấp độ log
 * - ERROR: Chỉ log lỗi nghiêm trọng
 * - WARN: Log cảnh báo và lỗi
 * - INFO: Log thông tin chung, cảnh báo và lỗi (mặc định)
 * - DEBUG: Log chi tiết cho debugging (nhiều log)
 * - TRACE: Log tất cả mọi thứ (rất nhiều log)
 */
export type LogLevel = 'error' | 'warn' | 'info' | 'debug' | 'trace'

/**
 * Service quản lý log tập trung
 * Cung cấp các phương thức để kiểm soát lượng thông tin log ra
 */
export class LoggerService {
  private isDevMode: boolean
  private currentLogLevel: LogLevel
  private logLevelPriority: Record<LogLevel, number> = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3,
    trace: 4,
  }

  constructor() {
    this.isDevMode = env.get('NODE_ENV') === 'development'
    // In production, set default log level to 'warn' to reduce noise
    this.currentLogLevel = this.isDevMode ? (env.get('LOG_LEVEL', 'info') as LogLevel) : 'warn'
  }

  /**
   * Kiểm tra xem có nên log với cấp độ này không
   * @param level Cấp độ log cần kiểm tra
   * @returns true nếu nên log, false nếu không
   */
  private shouldLog(level: LogLevel): boolean {
    return this.logLevelPriority[level] <= this.logLevelPriority[this.currentLogLevel]
  }

  /**
   * Log lỗi nghiêm trọng (luôn được log)
   * @param message Thông điệp chính
   * @param args Các tham số bổ sung
   */
  public error(message: string, ...args: unknown[]): void {
    logger.error(`[ERROR] ${message}`, ...args)
  }

  /**
   * Log cảnh báo
   * @param message Thông điệp chính
   * @param args Các tham số bổ sung
   */
  public warn(message: string, ...args: unknown[]): void {
    if (this.shouldLog('warn')) {
      logger.warn(`[WARN] ${message}`, ...args)
    }
  }

  /**
   * Log thông tin chung
   * @param message Thông điệp chính
   * @param args Các tham số bổ sung
   */
  public info(message: string, ...args: unknown[]): void {
    if (this.shouldLog('info')) {
      logger.info(`[INFO] ${message}`, ...args)
    }
  }

  /**
   * Log thông tin debug - chỉ dùng trong phát triển
   * @param message Thông điệp chính
   * @param args Các tham số bổ sung
   */
  public debug(message: string, ...args: unknown[]): void {
    if (this.shouldLog('debug') && this.isDevMode) {
      logger.debug(`[DEBUG] ${message}`, ...args)
    }
  }

  /**
   * Log chi tiết nhất - chỉ dùng khi cần trace
   * @param message Thông điệp chính
   * @param args Các tham số bổ sung
   */
  public trace(message: string, ...args: unknown[]): void {
    if (this.shouldLog('trace') && this.isDevMode) {
      logger.trace(`[TRACE] ${message}`, ...args)
    }
  }

  /**
   * Log thông tin cơ bản về một đối tượng, không log chi tiết
   * @param label Nhãn để phân biệt log
   * @param obj Đối tượng cần log
   * @param level Cấp độ log (mặc định: 'info')
   */
  public logObject(label: string, obj: unknown, level: LogLevel = 'info'): void {
    if (!this.shouldLog(level)) return

    try {
      if (!obj) {
        this[level](`${label}: <null hoặc undefined>`)
        return
      }

      // Nếu là mảng, chỉ log số lượng phần tử và các ID nếu có
      if (Array.isArray(obj)) {
        const ids = obj.map((item) => item.id || item._id).filter(Boolean)
        this[level](
          `${label}: Mảng [${obj.length} phần tử]${ids.length > 0 ? `, ID: ${ids.join(', ')}` : ''}`
        )
        return
      }

      // Nếu là object, chỉ log các thông tin cơ bản
      if (typeof obj === 'object' && obj !== null) {
        const basicInfo = {
          id: obj.id || obj._id,
          name: obj.name || obj.title || obj.label,
          type: obj.constructor ? obj.constructor.name : typeof obj,
        }
        this[level](`${label}: ${JSON.stringify(basicInfo)}`)
        return
      }

      // Trường hợp khác
      this[level](`${label}: ${obj}`)
    } catch (error) {
      this.error(`Lỗi khi log object ${label}:`, error)
    }
  }
}

// Export singleton instance để sử dụng trong toàn ứng dụng
export default new LoggerService()
