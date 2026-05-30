import { fork, type ChildProcess } from 'node:child_process'
import path from 'node:path'

import Redis from '@adonisjs/redis/services/main'
import { test } from '@japa/runner'

import RedisCacheStore from '#modules/cache/infra/adapters/cache-runtime/redis_cache_store'

const RUN_REAL_REDIS = process.env['CACHE_INTEGRATION_DRIVER'] === 'redis'
const SKIP_REASON = 'Set CACHE_INTEGRATION_DRIVER=redis to run the multi-process Redis test'
const WORKER_PATH = path.resolve(
  process.cwd(),
  'tests/helpers/cache_singleflight_process_worker.ts'
)

interface WorkerMessage {
  type: 'callback_started' | 'result' | 'error'
  result?: unknown
  error?: string
}

function runWorker(args: string[]): {
  child: ChildProcess
  callbackStarted: Promise<void>
  completed: Promise<unknown>
} {
  const child = fork(WORKER_PATH, args, {
    execArgv: ['--import=@poppinss/ts-exec'],
    env: { ...process.env, LOG_LEVEL: 'silent' },
    stdio: ['ignore', 'ignore', 'pipe', 'ipc'],
  })
  let stderr = ''
  child.stderr?.on('data', (chunk: Buffer) => {
    stderr += chunk.toString('utf8')
  })

  let callbackStartedResolve: (() => void) | undefined
  const callbackStarted = new Promise<void>((resolve) => {
    callbackStartedResolve = resolve
  })
  let result: unknown
  let workerError: string | undefined
  const completed = new Promise<unknown>((resolve, reject) => {
    child.on('message', (rawMessage: WorkerMessage) => {
      if (rawMessage.type === 'callback_started') {
        callbackStartedResolve?.()
      } else if (rawMessage.type === 'result') {
        result = rawMessage.result
      } else {
        workerError = rawMessage.error
      }
    })
    child.once('error', reject)
    child.once('exit', (code) => {
      if (code === 0 && result !== undefined) {
        resolve(result)
        return
      }
      reject(
        new Error(
          `single-flight worker exited with code ${String(code)}: ${workerError ?? stderr.trim()}`
        )
      )
    })
  })

  return { child, callbackStarted, completed }
}

test('RedisCacheStore | Redis coalesces one fill across two Node processes', async ({
  assert,
  cleanup,
}) => {
  const namespace = `cache-multiprocess:${crypto.randomUUID()}`
  const key = `${namespace}:value`
  const counterKey = `${namespace}:callback-count`
  const connection = Redis.connection('cache')
  const children: ChildProcess[] = []
  cleanup(async () => {
    for (const child of children) {
      if (child.exitCode === null) child.kill('SIGTERM')
    }
    await Promise.all([RedisCacheStore.delete(key), connection.del(counterKey)])
  })

  const leader = runWorker(['slow-leader', key, counterKey, '800'])
  children.push(leader.child)
  await leader.callbackStarted

  const follower = runWorker(['duplicate', key, counterKey, '0'])
  children.push(follower.child)
  const [leaderResult, followerResult] = await Promise.all([leader.completed, follower.completed])

  assert.deepEqual(leaderResult, { source: 'slow-leader' })
  assert.deepEqual(followerResult, { source: 'slow-leader' })
  assert.equal(await connection.get(counterKey), '1')
})
  .timeout(15_000)
  .skip(!RUN_REAL_REDIS, SKIP_REASON)
