import 'reflect-metadata'

import { setupApp, teardownApp } from './bootstrap.js'

interface WorkerMessage {
  type: 'callback_started' | 'result' | 'error'
  result?: unknown
  error?: string
}

function send(message: WorkerMessage): void {
  process.send?.(message)
}

async function run(): Promise<void> {
  const [role, key, counterKey, delayRaw] = process.argv.slice(2)
  if (!role || !key || !counterKey) {
    throw new Error('Missing single-flight worker arguments')
  }

  await setupApp()
  const [{ default: RedisCacheStore }, { default: Redis }] = await Promise.all([
    import('#modules/cache/infra/redis_cache_store'),
    import('@adonisjs/redis/services/main'),
  ])
  const delayMs = Number(delayRaw ?? '0')

  const result = await RedisCacheStore.remember(key, 60, async () => {
    await Redis.connection('cache').incr(counterKey)
    send({ type: 'callback_started' })
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
    return { source: role }
  })

  send({ type: 'result', result })
}

run()
  .catch((error) => {
    send({
      type: 'error',
      error: error instanceof Error ? error.message : String(error),
    })
    process.exitCode = 1
  })
  .finally(async () => {
    await teardownApp()
  })
