import { exec } from 'node:child_process'
import { promisify } from 'node:util'

import { DevelopmentServerRestarter } from '#modules/http/actions/ports/outbound/development_server_restarter'
import loggerService from '#modules/logger/public_contracts/application_logger'

const execAsync = promisify(exec)

export class NodeDevelopmentServerRestarter extends DevelopmentServerRestarter {
  isRestartAllowed(): boolean {
    return process.env['NODE_ENV'] === 'development'
  }

  scheduleRestart(delayMilliseconds: number): { processId: number } {
    const processId = process.pid

    setTimeout(() => {
      void this.restartProcess(processId)
    }, delayMilliseconds)

    return { processId }
  }

  private async restartProcess(processId: number): Promise<void> {
    try {
      if (process.platform === 'win32') {
        await execAsync(`taskkill /F /PID ${String(processId)} & npm run dev`)
        return
      }

      await execAsync(`kill -9 ${String(processId)} && npm run dev &`)
    } catch (error) {
      loggerService.error('Development server restart failed', {
        processId,
        errorName: error instanceof Error ? error.name : 'UnknownError',
      })
    }
  }
}
