# Single Flight Pattern Implementation

## Overview

The Single Flight Pattern has been implemented in this AdonisJS project to prevent the "thundering herd" or "cache stampede" problem. This pattern ensures that for a given key, only one request is actually executed while other concurrent requests with the same key wait for the result.

## Problem Addressed

When multiple requests hit the same cache key simultaneously and it's a cache miss, all requests would normally execute the expensive operation (database query, API call, etc.), potentially overwhelming the backend. The Single Flight Pattern solves this by:

1. Ensuring only one request per key is executed
2. Having other requests wait for the result
3. Returning the same result to all waiting requests

## Implementation Details

### 1. SingleFlightService

The core implementation is in `app/services/single_flight_service.ts`. It uses:

- A Map to track in-flight requests by key
- Promises to handle concurrent access
- Event emitter for proper cleanup

### 2. Integration with CacheService

The [remember](file://d:\ShadcnAdmin\app\services\cache_service.ts#L89-L101) method in `app/services/cache_service.ts` now uses the Single Flight Pattern:

```typescript
static async remember<T>(key: string, ttl: number, callback: () => Promise<T>): Promise<T> {
  // Tạo key duy nhất cho single flight pattern
  const singleFlightKey = `singleflight:${key}`
  
  // Sử dụng Single Flight Pattern để ngăn chặn thundering herd
  return SingleFlightService.execute(singleFlightKey, async () => {
    // Kiểm tra xem key đã có trong cache chưa
    const cachedData = await this.get<T>(key)
    if (cachedData !== null) {
      return cachedData
    }

    // Nếu không, lấy dữ liệu mới
    const data = await callback()
    // Lưu dữ liệu vào cache
    await this.set(key, data, ttl)
    return data
  })
}
```

### 3. Integration with CacheMiddleware

The `app/middleware/cache_middleware.ts` also implements the Single Flight Pattern to prevent duplicate HTTP request processing:

```typescript
return SingleFlightService.execute(singleFlightKey, async () => {
  // Kiểm tra lại cache để đảm bảo không có request khác đã set cache trong khi chờ
  const recheckedData = await Redis.get(cacheKey)
  if (recheckedData) {
    // Trả về dữ liệu từ cache
    return response.header('X-Cache', 'HIT').json(JSON.parse(recheckedData))
  }
  
  // Process the request normally and cache the result
  // ...
})
```

## Usage Examples

### Using CacheService with Single Flight Pattern

```typescript
import CacheService from '#services/cache_service'

// This will ensure only one expensive operation is executed
// even if called concurrently with the same key
const result = await CacheService.remember(
  'user-profile-123',
  3600, // TTL: 1 hour
  async () => {
    // Expensive operation (e.g., database query)
    return await fetchUserProfileFromDatabase(123)
  }
)
```

### Using SingleFlightService directly

```typescript
import SingleFlightService from '#services/single_flight_service'

const result = await SingleFlightService.execute(
  'unique-operation-key',
  async () => {
    // Expensive operation
    return await someExpensiveOperation()
  }
)
```

## Benefits

1. **Reduced Load**: Prevents multiple concurrent executions of the same expensive operation
2. **Improved Performance**: Reduces resource consumption during cache misses
3. **Better Scalability**: Handles traffic spikes more gracefully
4. **Consistent Response Times**: All requests for the same key receive results at the same time

## Testing

The implementation has been tested with:
1. Concurrent requests with the same key (should execute only once)
2. Requests with different keys (should execute separately)
3. Error handling (errors are propagated correctly)
4. In-flight status tracking (properly tracks execution state)

## Monitoring

You can monitor the service with:
- `SingleFlightService.isInFlight(key)`: Check if a key is currently being processed
- `SingleFlightService.getInFlightCount()`: Get the total number of concurrent operations
