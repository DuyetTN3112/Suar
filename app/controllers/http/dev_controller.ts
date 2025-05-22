import { HttpContext } from '@adonisjs/core/http'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'

const execAsync = promisify(exec)

export default class DevController {
  /**
   * Endpoint để khởi động lại dev server
   * Chỉ có tác dụng trong môi trường development
   */
  async restart({ response, logger }: HttpContext) {
    // Kiểm tra môi trường
    if (process.env.NODE_ENV !== 'development') {
      return response.status(403).json({
        error: 'Chỉ có thể khởi động lại server trong môi trường development',
      })
    }

    try {
      logger.info('Đang khởi động lại dev server...')

      // Lưu process ID để restart
      const pid = process.pid
      logger.info(`Process ID: ${pid}`)

      // Thực hiện restart sau 1 giây
      setTimeout(async () => {
        try {
          // Thực hiện restart dựa trên OS
          if (process.platform === 'win32') {
            // Windows
            await execAsync('taskkill /F /PID ' + pid + ' & npm run dev')
          } else {
            // Linux/Mac
            await execAsync('kill -9 ' + pid + ' && npm run dev &')
          }
        } catch (error) {
          logger.error('Lỗi khi khởi động lại server:', error)
        }
      }, 1000)

      return response.json({
        success: true,
        message: 'Đang khởi động lại dev server...',
      })
    } catch (error) {
      logger.error('Lỗi khi xử lý yêu cầu khởi động lại:', error)
      return response.status(500).json({
        error: 'Không thể khởi động lại server',
        details: error.message,
      })
    }
  }
}
