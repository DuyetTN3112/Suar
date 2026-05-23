/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */

import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import { createSavedFilterView } from '#modules/filtering/domain/saved-filter-views/saved_filter_view'
import { NodeFilterHashGenerator } from '#modules/filtering/infra/adapters/filtering-runtime/node_filter_hash_generator'
import { PostgresFilterSavedViewRepository } from '#modules/filtering/infra/repositories/saved-filter-views/postgres_filter_saved_view_repository'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'

const VIEW_ID = '99999999-9999-4999-8999-999999999999'
const OWNER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const NOW = '2026-08-10T00:00:00.000Z'

function deferred(): { readonly promise: Promise<void>; readonly resolve: () => void; readonly reject: (error: unknown) => void } {
  let resolvePromise: () => void = () => undefined
  let rejectPromise: (error: unknown) => void = () => undefined
  const promise = new Promise<void>((resolve, reject) => {
    resolvePromise = resolve
    rejectPromise = reject
  })
  return { promise, resolve: resolvePromise, reject: rejectPromise }
}

test.group('Integration | Filter saved-view locking', (group) => {
  group.setup(setupApp)
  group.teardown(async () => {
    await db.from('filter_saved_views').where('id', VIEW_ID).delete()
    await teardownApp()
  })

  test('serializes an external mutation behind a taxonomy worker row lock', async ({ assert }) => {
    const repository = new PostgresFilterSavedViewRepository()
    const hashGenerator = new NodeFilterHashGenerator()
    const view = createSavedFilterView({
      id: VIEW_ID,
      name: 'Locked view',
      description: null,
      ownerId: OWNER_ID,
      visibility: 'private',
      organizationId: null,
      teamId: null,
      context: { key: 'tasks.discovery.public', owner: 'tasks', schemaVersion: 1 },
      semanticState: { filter: null, textQuery: null, sort: [], projection: [] },
      presentationState: {},
      isDefault: false,
      isPinned: false,
      alertState: { status: 'disabled', reason: null },
      createdAt: NOW,
      updatedAt: NOW,
      lastSuccessfulMigrationVersion: 1,
    }, {}, hashGenerator)

    await db.transaction((transaction) => repository.create({ owner: { type: 'user', id: OWNER_ID }, view }, transaction))

    const workerRead = deferred()
    const releaseWorker = deferred()
    let workerError: unknown
    const worker = db.transaction(async (transaction) => {
      const locked = await repository.findById(VIEW_ID, transaction, { lock: 'for_update' })
      assert.isNotNull(locked)
      workerRead.resolve()
      await releaseWorker.promise
    }).catch((error: unknown) => {
      workerError = error
      workerRead.reject(error)
    })

    await workerRead.promise
    let mutationError: unknown
    try {
      await db.transaction(async (transaction) => {
        await transaction.rawQuery("set local lock_timeout = '100ms'")
        const current = await repository.findById(VIEW_ID, transaction)
        if (current === null) throw new Error('Expected the external mutation fixture')

        const changedView = createSavedFilterView({
          ...current.view,
          name: 'External mutation',
          updatedAt: '2026-08-10T00:01:00.000Z',
        }, {}, hashGenerator)
        await repository.update({
          record: { ...current, view: changedView },
          expectedLockVersion: current.lockVersion,
        }, transaction)
      })
    } catch (error) {
      mutationError = error
    } finally {
      releaseWorker.resolve()
      await worker
    }

    assert.equal((mutationError as { code?: string } | undefined)?.code, '55P03')
    assert.isUndefined(workerError)
    const persisted = await repository.findById(VIEW_ID)
    assert.equal(persisted?.view.name, 'Locked view')
  })
})
