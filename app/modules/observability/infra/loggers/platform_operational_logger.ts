import loggerService, { type LogLevel } from '#modules/logger/public_contracts/application_logger'
import type { PlatformEvent } from '#modules/observability/public_contracts/platform_event'
import { redactSensitiveObject } from '#modules/observability/public_contracts/platform_redaction'

export class PlatformOperationalLogger {
  log(level: LogLevel, event: PlatformEvent): void {
    const { value, redactionApplied } = redactSensitiveObject(
      event as unknown as Record<string, unknown>
    )
    const payload = {
      ...value,
      compliance: {
        ...(typeof value['compliance'] === 'object' && value['compliance'] !== null
          ? (value['compliance'] as Record<string, unknown>)
          : {}),
        redaction_applied: redactionApplied || event.compliance.redaction_applied,
      },
    }

    loggerService.logStructured(level, event.event_name, payload)
  }
}

export const platformOperationalLogger = new PlatformOperationalLogger()
