import ClearCacheKeyCommand from '#modules/http/actions/cache/commands/clear_cache_key_command'
import FlushCacheCommand from '#modules/http/actions/cache/commands/flush_cache_command'
import SetCacheValueCommand from '#modules/http/actions/cache/commands/set_cache_value_command'
import GetCacheValueQuery from '#modules/http/actions/cache/queries/get_cache_value_query'
import type { HttpActionContext } from '#modules/http/actions/http_action_context'
import { HttpCacheActionFactory } from '#modules/http/actions/ports/inbound/http_cache_action_factory'

export default class ComposedHttpCacheActionFactory extends HttpCacheActionFactory {
  makeClearCacheKeyCommand(context: HttpActionContext): ClearCacheKeyCommand {
    return new ClearCacheKeyCommand(context)
  }

  makeFlushCacheCommand(context: HttpActionContext): FlushCacheCommand {
    return new FlushCacheCommand(context)
  }

  makeSetCacheValueCommand(context: HttpActionContext): SetCacheValueCommand {
    return new SetCacheValueCommand(context)
  }

  makeGetCacheValueQuery(context: HttpActionContext): GetCacheValueQuery {
    return new GetCacheValueQuery(context)
  }
}
