import type { HttpContext } from '@adonisjs/core/http'

/** Lightweight probes that intentionally do not touch external dependencies. */
export default class OperationalProbeController {
  liveness({ response }: HttpContext) {
    response.noContent()
  }

  chromeDevtools({ response }: HttpContext) {
    response.noContent()
  }
}
