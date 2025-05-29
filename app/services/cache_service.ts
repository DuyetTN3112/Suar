import Redis from '@adonisjs/redis/services/main'
import SingleFlightService from '#services/single_flight_service'

/**
 * Service quản lý Redis cache
 */

/**
 * Thời gian mặc định cho cache (5 phút)
 */
const ttl = 300

/**
 * Prefix mặc định cho các khóa cache
 */
const prefix = 'app:cache'

/**
 * Lưu dữ liệu vào cache
 */
async function set(key: string, value: unknown, cacheTtl: number = 3600): Promise<void> {
  try {
    await Redis.setex(key, cacheTtl, typeof value !== 'string' ? JSON.stringify(value) : value)
  } catch (error) {
    console.error('Cache set error:', error)
    throw error
  }
}

/**
 * Lấy dữ liệu từ cache
 */
async function get<T>(key: string, defaultValue: T | null = null): Promise<T | null> {
  try {
    const value = await Redis.get(key)
    if (!value) return defaultValue
    try {
      return JSON.parse(value) as T
    } catch {
      return value as unknown as T
    }
  } catch (error) {
    console.error('Cache get error:', error)
    return defaultValue
  }
}

/**
 * Kiểm tra xem key có tồn tại trong cache không
 */
async function has(key: string): Promise<boolean> {
  try {
    return (await Redis.exists(key)) > 0
  } catch (error) {
    console.error('Cache has error:', error)
    return false
  }
}

/**
 * Xóa một key trong cache
 */
async function del(key: string): Promise<void> {
  try {
    await Redis.del(key)
  } catch (error) {
    console.error('Cache delete error:', error)
    throw error
  }
}

/**
 * Xóa tất cả các key có cùng prefix
 */
async function deleteByPattern(pattern: string): Promise<void> {
  try {
    const keys = await Redis.keys(pattern)
    if (keys.length > 0) {
      await Redis.del(...keys)
    }
  } catch (error) {
    console.error('Cache pattern delete error:', error)
    throw error
  }
}

/**
 * Lấy hoặc thiết lập cache với Single Flight Pattern
 * Nếu key không tồn tại, sẽ gọi callback để lấy dữ liệu và lưu vào cache
 * Nếu có nhiều request cùng key, chỉ request đầu tiên thực hiện callback,
 * các request khác sẽ chờ và nhận kết quả từ request đầu tiên
 */
function remember<T>(key: string, cacheTtl: number, callback: () => Promise<T>): Promise<T> {
  // Tạo key duy nhất cho single flight pattern
  const singleFlightKey = `singleflight:${key}`

  // Sử dụng Single Flight Pattern để ngăn chặn thundering herd
  return SingleFlightService.execute(singleFlightKey, async () => {
    // Kiểm tra xem key đã có trong cache chưa
    const cachedData = await get<T>(key)
    if (cachedData !== null) {
      return cachedData
    }

    // Nếu không, lấy dữ liệu mới
    const data = await callback()
    // Lưu dữ liệu vào cache
    await set(key, data, cacheTtl)
    return data
  })
}

/**
 * Xóa toàn bộ cache
 */
async function flush(): Promise<void> {
  try {
    await Redis.flushdb()
  } catch (error) {
    console.error('Cache flush error:', error)
    throw error
  }
}

/**
 * Tăng giá trị của key lên 1
 */
async function increment(key: string, by: number = 1): Promise<number> {
  try {
    return await Redis.incrby(key, by)
  } catch (error) {
    console.error('Cache increment error:', error)
    throw error
  }
}

/**
 * Giảm giá trị của key đi 1
 */
async function decrement(key: string, by: number = 1): Promise<number> {
  try {
    return await Redis.decrby(key, by)
  } catch (error) {
    console.error('Cache decrement error:', error)
    throw error
  }
}

const CacheService = {
  ttl,
  prefix,
  set,
  get,
  has,
  delete: del,
  deleteByPattern,
  remember,
  flush,
  increment,
  decrement,
}

export default CacheService
