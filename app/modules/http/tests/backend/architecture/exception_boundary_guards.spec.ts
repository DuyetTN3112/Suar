import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { test } from '@japa/runner'

import {
  acquireArchitectureTestLock,
  releaseArchitectureTestLock,
  runArchitectureGuard,
} from './support/boundary_guard_test_helpers.js'

test.group('Architecture | Exception boundary guards', (group) => {
  group.setup(acquireArchitectureTestLock)
  group.teardown(releaseArchitectureTestLock)

  test('exception boundary guard passes', () => {
    runArchitectureGuard('scripts/architecture/check_exception_boundaries.mjs')
  })

  test('exception boundary guard rejects a raw controller error', ({ assert }) => {
    const probeDirectory = 'app/modules/__exception_guard_probe/controllers'
    const probe = join(probeDirectory, 'probe.ts')
    mkdirSync(probeDirectory, { recursive: true })
    writeFileSync(probe, 'export function probe() { throw new Error("raw boundary failure") }\n')

    try {
      assert.throws(() => {
        runArchitectureGuard('scripts/architecture/check_exception_boundaries.mjs')
      })
    } finally {
      rmSync('app/modules/__exception_guard_probe', {
        force: true,
        recursive: true,
      })
    }
  })

  test('exception boundary guard rejects unsanitized command diagnostic logs', ({ assert }) => {
    const probe = 'commands/__exception_boundary_probe.ts'
    writeFileSync(
      probe,
      [
        'declare const logger: { error(message: string): void }',
        'export class Probe {',
        '  logger = logger',
        '  run(error: unknown) {',
        '    this.logger.error(error instanceof Error ? error.message : String(error))',
        '  }',
        '}',
      ].join('\n')
    )

    try {
      assert.throws(() => {
        runArchitectureGuard('scripts/architecture/check_exception_boundaries.mjs')
      })
    } finally {
      rmSync(probe, { force: true })
    }
  })

  test('exception boundary guard rejects unsanitized loggerService diagnostics', ({ assert }) => {
    const probeDirectory = 'app/modules/__exception_guard_probe/actions'
    const probe = join(probeDirectory, 'probe.ts')
    mkdirSync(probeDirectory, { recursive: true })
    writeFileSync(
      probe,
      [
        'declare const loggerService: { error(message: string, data: object): void }',
        'export function probe(error: unknown) {',
        '  loggerService.error("dependency failed", {',
        '    error: error instanceof Error ? error.message : String(error),',
        '  })',
        '}',
      ].join('\n')
    )

    try {
      assert.throws(() => {
        runArchitectureGuard('scripts/architecture/check_exception_boundaries.mjs')
      })
    } finally {
      rmSync('app/modules/__exception_guard_probe', {
        force: true,
        recursive: true,
      })
    }
  })

  test('exception boundary guard rejects raw errors passed to loggerService', ({ assert }) => {
    const probeDirectory = 'app/modules/__exception_guard_probe/actions'
    const probe = join(probeDirectory, 'probe.ts')
    mkdirSync(probeDirectory, { recursive: true })
    writeFileSync(
      probe,
      [
        'declare const loggerService: { error(message: string, error: unknown): void }',
        'export function probe(error: unknown) {',
        '  loggerService.error("dependency failed", error)',
        '}',
      ].join('\n')
    )

    try {
      assert.throws(() => {
        runArchitectureGuard('scripts/architecture/check_exception_boundaries.mjs')
      })
    } finally {
      rmSync('app/modules/__exception_guard_probe', {
        force: true,
        recursive: true,
      })
    }
  })

  test('exception boundary guard rejects raw Error objects passed to the core logger', ({
    assert,
  }) => {
    const probeDirectory = 'app/modules/__exception_guard_probe/actions'
    const probe = join(probeDirectory, 'probe.ts')
    mkdirSync(probeDirectory, { recursive: true })
    writeFileSync(
      probe,
      [
        "import logger from '@adonisjs/core/services/logger'",
        'export function probe(error: unknown) {',
        '  logger.warn({ err: error }, "dependency failed")',
        '}',
      ].join('\n')
    )

    try {
      assert.throws(() => {
        runArchitectureGuard('scripts/architecture/check_exception_boundaries.mjs')
      })
    } finally {
      rmSync('app/modules/__exception_guard_probe', {
        force: true,
        recursive: true,
      })
    }
  })

  test('exception boundary guard rejects a catch message returned in a result envelope', ({
    assert,
  }) => {
    const probeDirectory = 'app/modules/__exception_guard_probe/actions'
    const probe = join(probeDirectory, 'probe.ts')
    mkdirSync(probeDirectory, { recursive: true })
    writeFileSync(
      probe,
      [
        'export async function probe() {',
        '  try { return { success: true, message: "done" } }',
        '  catch (error) {',
        '    const leaked = error instanceof Error ? error.message : String(error)',
        '    return { success: false, message: leaked }',
        '  }',
        '}',
      ].join('\n')
    )

    try {
      assert.throws(() => {
        runArchitectureGuard('scripts/architecture/check_exception_boundaries.mjs')
      })
    } finally {
      rmSync('app/modules/__exception_guard_probe', {
        force: true,
        recursive: true,
      })
    }
  })

  test('exception boundary guard rejects an unobserved search dependency fallback', ({
    assert,
  }) => {
    const probeDirectory = 'app/modules/__exception_guard_probe/actions'
    const probe = join(probeDirectory, 'probe.ts')
    mkdirSync(probeDirectory, { recursive: true })
    writeFileSync(
      probe,
      [
        'declare function searchSkillsViaEngine(): Promise<unknown[]>',
        'export async function probe() {',
        '  try {',
        '    return await searchSkillsViaEngine()',
        '  } catch {',
        '    return []',
        '  }',
        '}',
      ].join('\n')
    )

    try {
      assert.throws(() => {
        runArchitectureGuard('scripts/architecture/check_exception_boundaries.mjs')
      })
    } finally {
      rmSync('app/modules/__exception_guard_probe', {
        force: true,
        recursive: true,
      })
    }
  })

  test('exception boundary guard rejects fail-open PostgreSQL schema drift', ({ assert }) => {
    const probeDirectory = 'app/modules/__exception_guard_probe/actions'
    const probe = join(probeDirectory, 'probe.ts')
    mkdirSync(probeDirectory, { recursive: true })
    writeFileSync(
      probe,
      [
        'declare function persistIdentity(): Promise<void>',
        'export async function probe() {',
        '  try {',
        '    await persistIdentity()',
        '  } catch (error: unknown) {',
        '    if ((error as { code?: string }).code !== "42P01") throw error',
        '  }',
        '}',
      ].join('\n')
    )

    try {
      assert.throws(() => {
        runArchitectureGuard('scripts/architecture/check_exception_boundaries.mjs')
      })
    } finally {
      rmSync('app/modules/__exception_guard_probe', {
        force: true,
        recursive: true,
      })
    }
  })

  test('exception boundary guard rejects a listener that resolves after processing failure', ({
    assert,
  }) => {
    const probeDirectory = 'app/modules/__exception_guard_probe/listeners'
    const probe = join(probeDirectory, 'probe_listener.ts')
    mkdirSync(probeDirectory, { recursive: true })
    writeFileSync(
      probe,
      [
        'declare function persistProjection(): Promise<void>',
        'export async function handleEvent() {',
        '  try {',
        '    await persistProjection()',
        '  } catch (error) {',
        '    void error',
        '  }',
        '}',
      ].join('\n')
    )

    try {
      assert.throws(() => {
        runArchitectureGuard('scripts/architecture/check_exception_boundaries.mjs')
      })
    } finally {
      rmSync('app/modules/__exception_guard_probe', {
        force: true,
        recursive: true,
      })
    }
  })

  test('exception boundary guard rejects rollback without a transaction completion check', ({
    assert,
  }) => {
    const probeDirectory = 'app/modules/__exception_guard_probe/actions'
    const probe = join(probeDirectory, 'probe.ts')
    mkdirSync(probeDirectory, { recursive: true })
    writeFileSync(
      probe,
      [
        'export async function probe(trx: { rollback(): Promise<void> }) {',
        '  try { return } catch { await trx.rollback() }',
        '}',
      ].join('\n')
    )

    try {
      assert.throws(() => {
        runArchitectureGuard('scripts/architecture/check_exception_boundaries.mjs')
      })
    } finally {
      rmSync('app/modules/__exception_guard_probe', {
        force: true,
        recursive: true,
      })
    }
  })

  test('exception boundary guard rejects required audit writes after commit', ({ assert }) => {
    const probeDirectory = 'app/modules/__exception_guard_probe/actions'
    const probe = join(probeDirectory, 'probe.ts')
    mkdirSync(probeDirectory, { recursive: true })
    writeFileSync(
      probe,
      [
        'declare const trx: { commit(): Promise<void> }',
        'declare const auditPublicApi: { write(): Promise<void> }',
        'export async function probe() {',
        '  await trx.commit()',
        '  await auditPublicApi.write()',
        '}',
      ].join('\n')
    )

    try {
      assert.throws(() => {
        runArchitectureGuard('scripts/architecture/check_exception_boundaries.mjs')
      })
    } finally {
      rmSync('app/modules/__exception_guard_probe', {
        force: true,
        recursive: true,
      })
    }
  })

  test('exception boundary guard rejects detached audit writes in a transaction callback', ({
    assert,
  }) => {
    const probeDirectory = 'app/modules/__exception_guard_probe/actions'
    const probe = join(probeDirectory, 'probe.ts')
    mkdirSync(probeDirectory, { recursive: true })
    writeFileSync(
      probe,
      [
        'declare const auditPublicApi: { write(context: object, input: object): Promise<void> }',
        'export async function probe() {',
        '  await (async (trx: object) => {',
        '    void trx',
        '    await auditPublicApi.write({}, {})',
        '  })({})',
        '}',
      ].join('\n')
    )

    try {
      assert.throws(() => {
        runArchitectureGuard('scripts/architecture/check_exception_boundaries.mjs')
      })
    } finally {
      rmSync('app/modules/__exception_guard_probe', {
        force: true,
        recursive: true,
      })
    }
  })

  test('exception boundary guard rejects noncritical audit writes sharing a transaction', ({
    assert,
  }) => {
    const probeDirectory = 'app/modules/__exception_guard_probe/actions'
    const probe = join(probeDirectory, 'probe.ts')
    mkdirSync(probeDirectory, { recursive: true })
    writeFileSync(
      probe,
      [
        'declare const auditPublicApi: {',
        '  write(context: object, input: object, trx: object): Promise<void>',
        '}',
        'export async function probe(trx: object) {',
        '  await auditPublicApi.write({}, { action: "change_business_state" }, trx)',
        '}',
      ].join('\n')
    )

    try {
      assert.throws(() => {
        runArchitectureGuard('scripts/architecture/check_exception_boundaries.mjs')
      })
    } finally {
      rmSync('app/modules/__exception_guard_probe', {
        force: true,
        recursive: true,
      })
    }
  })

  test('exception boundary guard rejects an audit helper detached from its transaction', ({
    assert,
  }) => {
    const probeDirectory = 'app/modules/__exception_guard_probe/actions'
    const probe = join(probeDirectory, 'probe.ts')
    mkdirSync(probeDirectory, { recursive: true })
    writeFileSync(
      probe,
      [
        'export class Probe {',
        '  async run(trx: object) {',
        '    void trx',
        '    await this.writeResolutionAudit("dispute-id")',
        '  }',
        '  private async writeResolutionAudit(_id: string) {}',
        '}',
      ].join('\n')
    )

    try {
      assert.throws(() => {
        runArchitectureGuard('scripts/architecture/check_exception_boundaries.mjs')
      })
    } finally {
      rmSync('app/modules/__exception_guard_probe', {
        force: true,
        recursive: true,
      })
    }
  })

  test('exception boundary guard rejects floating event promises', ({ assert }) => {
    const probeDirectory = 'app/modules/__exception_guard_probe/actions'
    const probe = join(probeDirectory, 'probe.ts')
    mkdirSync(probeDirectory, { recursive: true })
    writeFileSync(
      probe,
      [
        "import emitter from '@adonisjs/core/services/emitter'",
        'export function probe() {',
        '  emitter.emit("business.event")',
        '}',
      ].join('\n')
    )

    try {
      assert.throws(() => {
        runArchitectureGuard('scripts/architecture/check_exception_boundaries.mjs')
      })
    } finally {
      rmSync('app/modules/__exception_guard_probe', {
        force: true,
        recursive: true,
      })
    }
  })

  test('exception boundary guard rejects unsettled cache invalidation after commit', ({
    assert,
  }) => {
    const probeDirectory = 'app/modules/__exception_guard_probe/actions'
    const probe = join(probeDirectory, 'probe.ts')
    mkdirSync(probeDirectory, { recursive: true })
    writeFileSync(
      probe,
      [
        'declare const cacheInvalidationStore: { delete(key: string): Promise<void> }',
        'declare function executeInTransaction<T>(work: () => Promise<T>): Promise<T>',
        'export async function probe() {',
        '  const result = await executeInTransaction(async () => "entity-id")',
        '  await cacheInvalidationStore.delete(result)',
        '}',
      ].join('\n')
    )

    try {
      assert.throws(() => {
        runArchitectureGuard('scripts/architecture/check_exception_boundaries.mjs')
      })
    } finally {
      rmSync('app/modules/__exception_guard_probe', {
        force: true,
        recursive: true,
      })
    }
  })
})
