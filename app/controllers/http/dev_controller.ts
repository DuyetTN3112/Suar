import type { HttpContext } from '@adonisjs/core/http'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import ForbiddenException from '#exceptions/forbidden_exception'

const execAsync = promisify(exec)

export default class DevController {
  /**
   * Endpoint để khởi động lại dev server
   * Chỉ có tác dụng trong môi trường development
   */
  restart({ response, logger }: HttpContext) {
    // Kiểm tra môi trường
    if (process.env.NODE_ENV !== 'development') {
      throw new ForbiddenException('Chỉ có thể khởi động lại server trong môi trường development')
    }

    logger.info('Đang khởi động lại dev server...')

    // Lưu process ID để restart
    const pid = process.pid
    logger.info(`Process ID: ${String(pid)}`)

    // Thực hiện restart sau 1 giây
    setTimeout(() => {
      void (async () => {
        try {
          // Thực hiện restart dựa trên OS
          if (process.platform === 'win32') {
            // Windows
            await execAsync(`taskkill /F /PID ${String(pid)} & npm run dev`)
          } else {
            // Linux/Mac
            await execAsync(`kill -9 ${String(pid)} && npm run dev &`)
          }
        } catch (error) {
          logger.error('Lỗi khi khởi động lại server:', error)
        }
      })()
    }, 1000)

    response.json({
      success: true,
      message: 'Đang khởi động lại dev server...',
    })
  }
}
