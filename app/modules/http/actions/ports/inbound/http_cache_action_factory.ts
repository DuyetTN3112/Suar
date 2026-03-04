import type ClearCacheKeyCommand from '#modules/http/actions/cache/commands/clear_cache_key_command'
import type FlushCacheCommand from '#modules/http/actions/cache/commands/flush_cache_command'
import type SetCacheValueCommand from '#modules/http/actions/cache/commands/set_cache_value_command'
import type GetCacheValueQuery from '#modules/http/actions/cache/queries/get_cache_value_query'
import type { HttpActionContext } from '#modules/http/actions/http_action_context'

/**
 * Runtime DI token for context-bound HTTP cache use cases.
 *
 * Controllers depend on this construction contract and execute exactly one
 * Command or Query for the endpoint intent.
 */
export abstract class HttpCacheActionFactory {
  abstract makeClearCacheKeyCommand(context: HttpActionContext): ClearCacheKeyCommand
  abstract makeFlushCacheCommand(context: HttpActionContext): FlushCacheCommand
  abstract makeSetCacheValueCommand(context: HttpActionContext): SetCacheValueCommand
  abstract makeGetCacheValueQuery(context: HttpActionContext): GetCacheValueQuery
}
