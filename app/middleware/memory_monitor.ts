import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

/**
 * Middleware để giám sát sử dụng bộ nhớ
 */
export default class MemoryMonitorMiddleware {
  private lastMonitored: number = Date.now()
  private monitorInterval: number = 60000 // 60 giây
  async handle(ctx: HttpContext, next: NextFn) {
    // Chỉ monitor sau mỗi khoảng thời gian
    const now = Date.now()
    if (now - this.lastMonitored > this.monitorInterval) {
      this.lastMonitored = now
      this.logMemoryUsage()
    }
    return next()
  }
  private logMemoryUsage() {
    const memoryUsage = process.memoryUsage()
    // Chuyển đổi bytes sang MB để dễ đọc
    const formatMemory = (bytes: number) => Math.round((bytes / 1024 / 1024) * 100) / 100
    console.log('=== Memory Usage ===')
    console.log(`RSS: ${formatMemory(memoryUsage.rss)} MB`)
    console.log(`Heap Total: ${formatMemory(memoryUsage.heapTotal)} MB`)
    console.log(`Heap Used: ${formatMemory(memoryUsage.heapUsed)} MB`)
    console.log(`External: ${formatMemory(memoryUsage.external)} MB`)
    // Phát hiện rò rỉ bộ nhớ tiềm ẩn
    if (memoryUsage.heapUsed > 1024 * 1024 * 1024) {
      // > 1GB heap
      console.warn('WARNING: Heap usage exceeds 1GB. Possible memory leak!')
    }
    // Gợi ý thu gom rác
    if (global.gc) {
      console.log('Triggering garbage collection...')
      global.gc()
      // Log lại sau khi GC
      const afterGC = process.memoryUsage()
      console.log('=== After GC ===')
      console.log(
        `Heap Used: ${formatMemory(afterGC.heapUsed)} MB (Freed: ${formatMemory(memoryUsage.heapUsed - afterGC.heapUsed)} MB)`
      )
    }
  }
}
