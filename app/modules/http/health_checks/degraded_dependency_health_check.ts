import { BaseCheck, Result } from '@adonisjs/core/health'
import type { HealthCheckContract, HealthCheckResult } from '@adonisjs/core/types/health'

interface DegradedDependencyHealthCheckOptions {
  degradedMessage: string
}

function safeNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function sanitizeMetadata(meta: unknown): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {}
  const connection = isRecord(meta) ? meta['connection'] : undefined

  if (isRecord(connection)) {
    const name = connection['name']
    const status = connection['status']

    sanitized['connection'] = {
      ...(typeof name === 'string' ? { name } : {}),
      ...(typeof status === 'string' ? { status } : {}),
    }
  }

  const memory = isRecord(meta) ? meta['memoryInBytes'] : undefined
  if (isRecord(memory)) {
    const used = safeNumber(memory['used'])
    const warningThreshold = safeNumber(memory['warningThreshold'])
    const failureThreshold = safeNumber(memory['failureThreshold'])

    sanitized['memoryInBytes'] = {
      ...(used === undefined ? {} : { used }),
      ...(warningThreshold === undefined ? {} : { warningThreshold }),
      ...(failureThreshold === undefined ? {} : { failureThreshold }),
    }
  }

  return sanitized
}

/**
 * Preserves observability for an optional dependency without making it a
 * readiness gate. Error details are intentionally replaced with a fixed
 * message and allowlisted metadata.
 */
export class DegradedDependencyHealthCheck extends BaseCheck {
  public readonly name: string

  constructor(
    private readonly delegate: HealthCheckContract,
    private readonly options: DegradedDependencyHealthCheckOptions
  ) {
    super()
    this.name = delegate.name
    if (delegate.cacheDuration !== undefined) {
      this.cacheDuration = delegate.cacheDuration
    }
  }

  async run(): Promise<HealthCheckResult> {
    try {
      const result = await this.delegate.run()
      const metadata = {
        ...sanitizeMetadata(result.meta),
        dependency_class: 'optional',
        readiness_impact: 'degraded',
        underlying_status: result.status,
      }

      if (result.status === 'ok') {
        return {
          message: result.message,
          status: result.status,
          finishedAt: result.finishedAt,
          meta: metadata,
        }
      }

      return Result.warning(this.options.degradedMessage)
        .setFinishedAt(result.finishedAt)
        .setMetaData(metadata)
        .toJSON()
    } catch {
      return Result.warning(this.options.degradedMessage)
        .setMetaData({
          dependency_class: 'optional',
          readiness_impact: 'degraded',
          underlying_status: 'error',
        })
        .toJSON()
    }
  }
}
