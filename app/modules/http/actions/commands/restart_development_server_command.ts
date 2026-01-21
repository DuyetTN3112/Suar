import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import type { DevelopmentServerRestarter } from '#modules/http/actions/ports/outbound/development_server_restarter'

export interface RestartDevelopmentServerResult {
  processId: number
  message: string
}

export class RestartDevelopmentServerCommand {
  constructor(private readonly restarter: DevelopmentServerRestarter) {}

  execute(): RestartDevelopmentServerResult {
    if (!this.restarter.isRestartAllowed()) {
      throw new ForbiddenException('Chỉ có thể khởi động lại server trong môi trường development')
    }

    const { processId } = this.restarter.scheduleRestart(1_000)
    return {
      processId,
      message: 'Đang khởi động lại dev server...',
    }
  }
}
