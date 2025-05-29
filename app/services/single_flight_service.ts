import { EventEmitter } from 'node:events'

/**
 * Service để implement Single Flight Pattern, ngăn chặn thundering herd/cache stampede
 * Đảm bảo với một key nhất định, chỉ có một request thực sự được thực thi,
 * các request khác cùng key sẽ chờ và nhận lại kết quả từ request "đại diện"
 */

// Registry để lưu các request đang xử lý
const inFlightRequests = new Map<string, Promise<unknown>>()

// EventEmitter để xử lý các sự kiện khi request hoàn tất
const emitter = new EventEmitter()

/**
 * Thực thi một hàm callback với key duy nhất
 * Nếu có request cùng key đang chạy, sẽ chờ kết quả thay vì tạo request mới
 *
 * @param key - Khóa duy nhất để xác định request
 * @param callback - Hàm callback để thực thi nếu không có request nào đang chạy với key này
 * @returns Promise với kết quả từ callback
 */
export async function execute<T>(key: string, callback: () => Promise<T>): Promise<T> {
  // Kiểm tra xem đã có request nào đang chạy với key này chưa
  const existingPromise = inFlightRequests.get(key)

  if (existingPromise) {
    // Nếu có, chờ kết quả từ request đang chạy thay vì tạo request mới
    return existingPromise as Promise<T>
  }

  // Nếu không có request nào đang chạy, tạo promise mới
  const promise = callback()
    .then((result) => {
      // Khi promise hoàn tất, xóa khỏi registry và emit sự kiện
      inFlightRequests.delete(key)
      emitter.emit(`complete:${key}`, result)
      return result
    })
    .catch((error: unknown) => {
      // Khi promise bị lỗi, xóa khỏi registry và emit sự kiện lỗi
      inFlightRequests.delete(key)
      emitter.emit(`error:${key}`, error)
      if (error instanceof Error) {
        throw error
      } else {
        throw error
      }
    })

  // Lưu promise vào registry
  inFlightRequests.set(key, promise)

  return promise
}

/**
 * Kiểm tra xem có request nào đang chạy với key này không
 *
 * @param key - Khóa để kiểm tra
 * @returns true nếu có request đang chạy, false nếu không
 */
export function isInFlight(key: string): boolean {
  return inFlightRequests.has(key)
}

/**
 * Lấy số lượng request đang chạy
 *
 * @returns Số lượng request đang chạy
 */
export function getInFlightCount(): number {
  return inFlightRequests.size
}

/**
 * Hủy bỏ tất cả các request đang chạy (chỉ dùng khi cần dọn dẹp)
 */
export function clear(): void {
  inFlightRequests.clear()
  emitter.removeAllListeners()
}
