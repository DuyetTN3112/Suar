import AppException from '#modules/errors/public_contracts/application_exception'
import { Result } from '#modules/errors/public_contracts/result'
import { BaseCommand } from '#modules/http/actions/base_command'
import type { HttpPlatformUiEventInput } from '#modules/http/actions/dtos/platform_ui_event'
import type { HttpActionContext } from '#modules/http/actions/http_action_context'
import type {
  HttpPlatformUiEventWriter,
} from '#modules/http/actions/ports/outbound/http_platform_ui_event_writer'

export default class RecordPlatformUiEventCommand extends BaseCommand<
  [HttpPlatformUiEventInput, HttpActionContext],
  void
> {
  constructor(private readonly events: HttpPlatformUiEventWriter) {
    super()
  }

  async executeAndWrap(input: HttpPlatformUiEventInput, execCtx: HttpActionContext) {
    try {
      return Result.ok(await this.execute(input, execCtx))
    } catch (error) {
      if (error instanceof AppException) return Result.fail(error)
      throw error
    }
  }

  execute(input: HttpPlatformUiEventInput, execCtx: HttpActionContext): Promise<void> {
    return this.events.record(input, execCtx)
  }
}
