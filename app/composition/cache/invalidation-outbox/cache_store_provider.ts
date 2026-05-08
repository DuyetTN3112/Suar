import { NodePrivateCacheKeyDigestProvider } from '#modules/cache/infra/adapters/cache-runtime/node_private_cache_key_digest_provider'
import inProcessSingleFlightExecutor from '#modules/cache/infra/adapters/cache-runtime/in_process_single_flight_executor'
import redisCacheStore from '#modules/cache/infra/adapters/cache-runtime/redis_cache_store'
import { registerPrivateCacheKeyDigestProvider } from '#modules/cache/public_contracts/cache_contract'
import { registerCacheStoreProvider } from '#modules/cache/public_contracts/cache_store'

export default class CacheStoreProvider {
  register(): void {
    registerPrivateCacheKeyDigestProvider(new NodePrivateCacheKeyDigestProvider())
    registerCacheStoreProvider({
      cacheStore: redisCacheStore,
      singleFlight: inProcessSingleFlightExecutor,
    })
  }
}
