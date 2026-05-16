import { randomUUID } from 'node:crypto'

import Redis from '@adonisjs/redis/services/main'
import { test } from '@japa/runner'

import { resolveCacheGenerationControlTtlSeconds } from '#modules/cache/domain/cache-runtime/cache_generation_control_policy'
import { cacheGenerationControlKey } from '#modules/cache/domain/cache-runtime/cache_generation_policy'
import RedisCacheStore from '#modules/cache/infra/adapters/cache-runtime/redis_cache_store'
import { CACHE_REDIS_KEY_PREFIX } from '#modules/cache/public_contracts/cache_contract'

const RUN_CAPACITY_DRILL = process.env['CACHE_GENERATION_CAPACITY_DRILL'] === '1'
const CONTROL_COUNT = 5_000
const BATCH_SIZE = 100
const EXPECTED_TTL_SECONDS = resolveCacheGenerationControlTtlSeconds(
  process.env['CACHE_GENERATION_CONTROL_TTL_SECONDS']
)

function infoNumber(info: string, field: string): number {
  const match = info.match(new RegExp(`(?:^|\\r?\\n)${field}:(\\d+)`))
  return Number(match?.[1] ?? 0)
}

function percentile(sortedValues: number[], percentileValue: number): number {
  const index = Math.min(
    sortedValues.length - 1,
    Math.max(0, Math.ceil(sortedValues.length * percentileValue) - 1)
  )
  return sortedValues[index] ?? 0
}

test('Cache generation capacity | bounds cardinality memory and expiry', async ({
  assert,
  cleanup,
}) => {
  const rootNamespace = `capacity:${randomUUID()}`
  const namespaces = Array.from(
    { length: CONTROL_COUNT },
    (_, index) => `${rootNamespace}:user:${String(index)}`
  )
  const controlKeys = namespaces.map((namespace) => cacheGenerationControlKey(namespace))
  const connection = Redis.connection('cache')

  cleanup(async () => {
    for (let offset = 0; offset < controlKeys.length; offset += BATCH_SIZE) {
      const pipeline = connection.pipeline()
      for (const controlKey of controlKeys.slice(offset, offset + BATCH_SIZE)) {
        pipeline.unlink(controlKey)
      }
      await pipeline.exec()
    }
  })

  const usedMemoryBefore = infoNumber(await connection.info('memory'), 'used_memory')
  const startedAt = performance.now()
  const physicalKeys: string[] = []

  for (let offset = 0; offset < namespaces.length; offset += BATCH_SIZE) {
    const resolvedBatch = await Promise.all(
      namespaces
        .slice(offset, offset + BATCH_SIZE)
        .map((namespace, batchIndex) =>
          RedisCacheStore.resolveVersionedKeyBestEffort(
            namespace,
            `${rootNamespace}:logical:${String(offset + batchIndex)}`
          )
        )
    )
    for (const physicalKey of resolvedBatch) {
      if (!physicalKey) {
        throw new Error('Generation control capacity drill lost the Redis connection')
      }
      physicalKeys.push(physicalKey)
    }
  }

  const elapsedMilliseconds = performance.now() - startedAt
  const usedMemoryAfter = infoNumber(await connection.info('memory'), 'used_memory')
  const samples = controlKeys.filter((_, index) => index % 25 === 0)
  const samplePipeline = connection.pipeline()
  for (const controlKey of samples) {
    samplePipeline.ttl(controlKey)
    samplePipeline.call('MEMORY', 'USAGE', `${CACHE_REDIS_KEY_PREFIX}${controlKey}`)
  }
  const sampleResults = await samplePipeline.exec()
  if (!sampleResults) {
    throw new Error('Generation control capacity drill returned no Redis sample results')
  }

  const ttlSamples: number[] = []
  const memorySamples: number[] = []
  for (let index = 0; index < sampleResults.length; index += 2) {
    const ttlResult = sampleResults[index]
    const memoryResult = sampleResults[index + 1]
    if (!ttlResult || ttlResult[0] || !memoryResult || memoryResult[0]) {
      throw ttlResult?.[0] ?? memoryResult?.[0] ?? new Error('Incomplete Redis capacity sample')
    }
    ttlSamples.push(Number(ttlResult[1]))
    memorySamples.push(Number(memoryResult[1]))
  }

  memorySamples.sort((first, second) => first - second)
  assert.lengthOf(physicalKeys, CONTROL_COUNT)
  assert.equal(new Set(physicalKeys).size, CONTROL_COUNT)
  assert.isTrue(
    ttlSamples.every((ttl) => ttl > EXPECTED_TTL_SECONDS - 30 && ttl <= EXPECTED_TTL_SECONDS)
  )
  assert.isTrue(memorySamples.every((bytes) => bytes > 0 && bytes <= 1_024))

  console.info(
    [
      '[cache-generation-capacity]',
      `controls=${String(CONTROL_COUNT)}`,
      `elapsed_ms=${elapsedMilliseconds.toFixed(1)}`,
      `controls_per_second=${((CONTROL_COUNT * 1_000) / elapsedMilliseconds).toFixed(1)}`,
      `sample_memory_p50_bytes=${String(percentile(memorySamples, 0.5))}`,
      `sample_memory_p95_bytes=${String(percentile(memorySamples, 0.95))}`,
      `redis_used_memory_delta_bytes=${String(Math.max(0, usedMemoryAfter - usedMemoryBefore))}`,
    ].join(' ')
  )
})
  .skip(!RUN_CAPACITY_DRILL, 'Set CACHE_GENERATION_CAPACITY_DRILL=1 for the isolated drill')
  .timeout(30_000)
