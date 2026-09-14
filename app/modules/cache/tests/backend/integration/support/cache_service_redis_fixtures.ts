import { randomUUID } from 'node:crypto'

import { resolveCacheGenerationControlTtlSeconds } from '#modules/cache/domain/cache-runtime/cache_generation_control_policy'

export const RUN_REAL_REDIS = process.env['CACHE_INTEGRATION_DRIVER'] === 'redis'
export const SKIP_REASON =
  'Set CACHE_INTEGRATION_DRIVER=redis to run against the configured cache connection'
export const EXPECTED_GENERATION_CONTROL_TTL_SECONDS = resolveCacheGenerationControlTtlSeconds(
  process.env['CACHE_GENERATION_CONTROL_TTL_SECONDS']
)

export function createNamespace(): string {
  return `cache-real:${randomUUID()}`
}

export function commandCalls(commandStats: string, command: string): number {
  const match = commandStats.match(new RegExp(`(?:^|\\r?\\n)cmdstat_${command}:calls=(\\d+)`))
  return Number(match?.[1] ?? 0)
}

export async function waitForRedisLock(
  connection: { pttl(key: string): Promise<number> },
  lockKey: string,
  timeoutMs = 1_000
): Promise<void> {
  const deadline = performance.now() + timeoutMs
  do {
    if ((await connection.pttl(lockKey)) > 0) {
      return
    }
    await new Promise((resolve) => setTimeout(resolve, 10))
  } while (performance.now() < deadline)

  throw new Error(`Redis single-flight leader did not acquire its lock within ${timeoutMs}ms`)
}
