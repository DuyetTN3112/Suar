import cacheService, { del } from '#modules/cache/infra/cache_service'
import singleFlightService from '#modules/cache/infra/single_flight_service'

export const cacheStore = cacheService
export const singleFlight = singleFlightService
export { del }
