import { getHeapStatistics } from 'node:v8'

import { Result, BaseCheck } from '@adonisjs/core/health'
import type { HealthCheckResult } from '@adonisjs/core/types/health'

const WARNING_THRESHOLD_PERCENT = 80
const FAILURE_THRESHOLD_PERCENT = 90

function bytesToMegabytes(value: number): number {
  return Math.round(value / 1024 / 1024)
}

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
  run(): Promise<HealthCheckResult> {
    try {
      const heapLimitBytes = getHeapStatistics().heap_size_limit
      const heapUsedBytes = process.memoryUsage().heapUsed

      if (heapLimitBytes <= 0) {
        return Promise.resolve(
          Result.failed('Không xác định được giới hạn bộ nhớ của tiến trình').toJSON()
        )
      }

      const percentUsed = Math.round((heapUsedBytes / heapLimitBytes) * 100)
      const metadata = {
        memory: {
          heapLimit: `${bytesToMegabytes(heapLimitBytes)}MB`,
          heapUsed: `${bytesToMegabytes(heapUsedBytes)}MB`,
          percentUsed: `${percentUsed}%`,
        },
      }

      if (percentUsed > FAILURE_THRESHOLD_PERCENT) {
        return Promise.resolve(
          Result.failed(`Heap sử dụng ${percentUsed}% vượt ngưỡng cho phép`)
            .mergeMetaData({
              memory: {
                ...metadata.memory,
                threshold: `${FAILURE_THRESHOLD_PERCENT}%`,
              },
            })
            .toJSON()
        )
      }

      if (percentUsed > WARNING_THRESHOLD_PERCENT) {
        return Promise.resolve(
          Result.warning(`Heap sử dụng ${percentUsed}% gần ngưỡng cho phép`)
            .mergeMetaData({
              memory: {
                ...metadata.memory,
                threshold: `${WARNING_THRESHOLD_PERCENT}%`,
              },
            })
            .toJSON()
        )
      }

      return Promise.resolve(
        Result.ok(`Heap sử dụng ${percentUsed}% trong giới hạn cho phép`)
          .mergeMetaData(metadata)
          .toJSON()
      )
    } catch (error) {
      const errorInstance = error instanceof Error ? error : undefined
      return Promise.resolve(
        Result.failed('Không thể kiểm tra tình trạng ứng dụng', errorInstance).toJSON()
      )
    }
  }
}
