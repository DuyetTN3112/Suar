import { Result, BaseCheck } from '@adonisjs/core/health'
import type { HealthCheckResult } from '@adonisjs/core/types/health'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'

const execAsync = promisify(exec)

/**
 * Custom health check để kiểm tra tình trạng của ứng dụng
 */
export class ApplicationCheck extends BaseCheck {
  /**
   * Tên của health check, thuộc tính bắt buộc từ BaseCheck
   */
  public readonly name = 'application'

  /**
   * Thực hiện kiểm tra các tiến trình quan trọng của ứng dụng
   */
  async run(): Promise<HealthCheckResult> {
    try {
      // Kiểm tra dung lượng RAM còn trống
      const { stdout: freeResult } = await execAsync('free -m')
      // Phân tích kết quả
      const memoryLines = freeResult.split('\n')
      const memValues = memoryLines[1]?.trim().split(/\s+/).map(Number) || []
      // Nếu có đủ thông tin
      if (memValues.length >= 3) {
        const total = memValues[1] // Tổng RAM
        const used = memValues[2] // RAM đã sử dụng
        const percentUsed = Math.round((used / total) * 100)
        // Đánh giá tình trạng dựa trên phần trăm sử dụng
        if (percentUsed > 90) {
          return Result.failed(`RAM sử dụng ${percentUsed}% vượt ngưỡng cho phép`).mergeMetaData({
            memory: {
              total: `${total}MB`,
              used: `${used}MB`,
              percentUsed: `${percentUsed}%`,
              threshold: '90%',
            },
          })
        } else if (percentUsed > 80) {
          return Result.warning(`RAM sử dụng ${percentUsed}% gần ngưỡng cho phép`).mergeMetaData({
            memory: {
              total: `${total}MB`,
              used: `${used}MB`,
              percentUsed: `${percentUsed}%`,
              threshold: '80%',
            },
          })
        }
        // Trả về OK nếu mọi thứ bình thường
        return Result.ok(`RAM sử dụng ${percentUsed}% trong giới hạn cho phép`).mergeMetaData({
          memory: {
            total: `${total}MB`,
            used: `${used}MB`,
            percentUsed: `${percentUsed}%`,
          },
        })
      }
      // Nếu không thể phân tích kết quả
      return Result.ok('Kiểm tra ứng dụng thành công')
    } catch (error) {
      // Xử lý lỗi khi kiểm tra
      return Result.failed('Không thể kiểm tra tình trạng ứng dụng', error)
    }
  }
}
