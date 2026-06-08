import { test } from '@japa/runner'

import AdminSearchProjectionController from '#modules/http/controllers/search-discovery/admin_search_projection_controller'
import type { AuthorizedSearchIndexOperator } from '#modules/search/actions/dtos/search_index_operator'
import type { SearchIndexInventory } from '#modules/search/domain/index-administration/search_index_administration'

const operator: AuthorizedSearchIndexOperator = {
  id: '019fa98a-927e-7cdf-86a3-03dbf6caa185',
  systemRole: 'superadmin',
  actorType: 'service',
  authenticationProvenance: 'runtime_environment',
}

const inventory: SearchIndexInventory = {
  target: 'tasks',
  aliasName: 'suar_tasks',
  initialPhysicalIndexName: 'suar_tasks_v1',
  activeIndexNames: ['suar_tasks_v2'],
  generations: [],
}

function context(input: {
  userId?: string
  query?: Record<string, unknown>
  body?: Record<string, unknown>
}) {
  const response = {
    statusCode: 0,
    payload: undefined as unknown,
    status(statusCode: number) {
      this.statusCode = statusCode
      return this
    },
    json(payload: unknown) {
      this.payload = payload
      return payload
    },
  }
  const renders: Array<{ view: string; props: unknown }> = []
  return {
    auth: { user: input.userId ? { id: input.userId } : null },
    request: {
      input: (key: string, fallback?: unknown) => input.query?.[key] ?? fallback,
      body: () => input.body ?? {},
    },
    response,
    inertia: {
      render: (view: string, props: unknown) => {
        renders.push({ view, props })
        return { view, props }
      },
    },
    renders,
  }
}

function dependencies(overrides: Record<string, unknown> = {}) {
  const calls: Array<{ name: string; input?: unknown }> = []
  const deps = {
    authorize: {
      handle: (input: unknown) => {
        calls.push({ name: 'authorize', input })
        return Promise.resolve(operator)
      },
    },
    inspect: {
      handle: (input: unknown) => {
        calls.push({ name: 'inspect', input })
        return Promise.resolve([inventory])
      },
    },
    previewCleanup: {
      handle: (input: unknown) => {
        calls.push({ name: 'previewCleanup', input })
        return Promise.resolve({ mode: 'preview', planToken: 'cleanup-plan' })
      },
    },
    applyCleanup: {
      handle: (input: unknown) => {
        calls.push({ name: 'applyCleanup', input })
        return Promise.resolve({ mode: 'applied', planToken: 'cleanup-plan' })
      },
    },
    previewRollback: {
      handle: (input: unknown) => {
        calls.push({ name: 'previewRollback', input })
        return Promise.resolve({ mode: 'preview', rollbackIndexName: 'suar_tasks_v1' })
      },
    },
    applyRollback: {
      handle: (input: unknown) => {
        calls.push({ name: 'applyRollback', input })
        return Promise.resolve({ mode: 'applied', rollbackIndexName: 'suar_tasks_v1' })
      },
    },
    ...overrides,
  }
  return {
    deps: deps as unknown as NonNullable<ConstructorParameters<typeof AdminSearchProjectionController>[0]>,
    calls,
  }
}

test.group('AdminSearchProjectionController', () => {
  test('lists index status only after operator authorization', async ({ assert }) => {
    const { deps, calls } = dependencies()
    const controller = new AdminSearchProjectionController(deps)
    const ctx = context({ userId: operator.id, query: { target: 'tasks' } })

    await controller.index(ctx as never)

    assert.deepEqual(calls, [
      { name: 'authorize', input: { assertedActorId: operator.id } },
      { name: 'inspect', input: { target: 'tasks' } },
    ])
    assert.equal(ctx.response.statusCode, 200)
    assert.deepEqual(ctx.response.payload, { data: [inventory] })
  })

  test('renders the admin page from inventory and labels missing lifecycle evidence honestly', async ({
    assert,
  }) => {
    const { deps, calls } = dependencies()
    const controller = new AdminSearchProjectionController(deps)
    const ctx = context({ userId: operator.id })

    await controller.page(ctx as never)

    assert.deepEqual(calls, [
      { name: 'authorize', input: { assertedActorId: operator.id } },
      { name: 'inspect', input: {} },
    ])
    assert.equal(ctx.renders[0]?.view, 'admin/search_projections/index')
    const props = ctx.renders[0]?.props as { snapshot: { generations: unknown[] } }
    assert.deepEqual(props.snapshot.generations, [])
  })

  test('passes cleanup preview and apply input from the API boundary without widening it', async ({
    assert,
  }) => {
    const { deps, calls } = dependencies()
    const controller = new AdminSearchProjectionController(deps)
    const previewContext = context({
      userId: operator.id,
      query: { target: 'tasks', retainRetired: '2', olderThanHours: '24' },
    })
    await controller.previewCleanup(previewContext as never)
    const applyContext = context({
      userId: operator.id,
      body: {
        target: 'tasks',
        retainRetired: 2,
        olderThanHours: 24,
        reason: 'Approved cleanup after the rollback retention window',
        confirmation: 'DELETE_RETIRED_SEARCH_INDICES',
        expectedPlanToken: 'cleanup-plan',
      },
    })
    await controller.applyCleanup(applyContext as never)

    assert.deepEqual(calls.map(({ name }) => name), [
      'authorize',
      'previewCleanup',
      'authorize',
      'applyCleanup',
    ])
    assert.deepEqual(calls.slice(1).filter(({ name }) => name !== 'authorize'), [
      {
        name: 'previewCleanup',
        input: { target: 'tasks', retainRetired: 2, olderThanHours: 24 },
      },
      {
        name: 'applyCleanup',
        input: {
          target: 'tasks',
          retainRetired: 2,
          olderThanHours: 24,
          reason: 'Approved cleanup after the rollback retention window',
          confirmation: 'DELETE_RETIRED_SEARCH_INDICES',
          expectedPlanToken: 'cleanup-plan',
        },
      },
    ])
    assert.equal(previewContext.response.statusCode, 200)
    assert.equal(applyContext.response.statusCode, 200)
  })

  test('supports rollback preview and apply only through the existing fenced contracts', async ({
    assert,
  }) => {
    const { deps, calls } = dependencies()
    const controller = new AdminSearchProjectionController(deps)
    const input = {
      target: 'tasks',
      expectedCurrentIndexName: 'suar_tasks_v2',
      rollbackIndexName: 'suar_tasks_v1',
    }
    const previewContext = context({ userId: operator.id, query: input })
    await controller.previewRollback(previewContext as never)
    const applyContext = context({
      userId: operator.id,
      body: {
        ...input,
        reason: 'Approved rollback for a verified Search incident',
        confirmation: 'ROLLBACK_SEARCH_INDEX',
      },
    })
    await controller.applyRollback(applyContext as never)

    assert.deepEqual(calls.map(({ name }) => name), [
      'authorize',
      'previewRollback',
      'authorize',
      'applyRollback',
    ])
    assert.deepEqual(calls.slice(1).filter(({ name }) => name !== 'authorize'), [
      { name: 'previewRollback', input },
      {
        name: 'applyRollback',
        input: {
          ...input,
          reason: 'Approved rollback for a verified Search incident',
          confirmation: 'ROLLBACK_SEARCH_INDEX',
        },
      },
    ])
    assert.equal(previewContext.response.statusCode, 200)
    assert.equal(applyContext.response.statusCode, 200)
  })

  test('passes activation preview/apply fencing fields without widening the boundary', async ({
    assert,
  }) => {
    const { deps, calls } = dependencies({
      previewActivation: {
        handle: (input: unknown) => {
          calls.push({ name: 'previewActivation', input })
          return Promise.resolve({ mode: 'preview', expectedStateToken: 'state-token' })
        },
      },
      applyActivation: {
        handle: (input: unknown) => {
          calls.push({ name: 'applyActivation', input })
          return Promise.resolve({ status: 'active' })
        },
      },
    })
    const controller = new AdminSearchProjectionController(deps)
    const previewContext = context({ userId: operator.id, query: { id: 'generation-1' } })
    await controller.previewActivation(previewContext as never)
    const applyContext = context({
      userId: operator.id,
      body: {
        id: 'generation-1',
        expectedLockVersion: 2,
        expectedCurrentIndexNames: ['suar_tasks_v1'],
        expectedStateToken: 'state-token',
        now: '2026-08-09T00:02:00.000Z',
      },
    })
    await controller.applyActivation(applyContext as never)

    assert.deepEqual(calls.map(({ name }) => name), [
      'authorize',
      'previewActivation',
      'authorize',
      'applyActivation',
    ])
    assert.deepEqual(calls[1]?.input, { id: 'generation-1' })
    assert.deepEqual(calls[3]?.input, {
      id: 'generation-1',
      expectedLockVersion: 2,
      expectedCurrentIndexNames: ['suar_tasks_v1'],
      expectedStateToken: 'state-token',
      now: '2026-08-09T00:02:00.000Z',
    })
  })

  test('fails closed before use cases for missing or unauthorized operators', async ({ assert }) => {
    const { deps, calls } = dependencies()
    deps.authorize.handle = (input: unknown) => {
      calls.push({ name: 'authorize', input })
      return Promise.resolve(null)
    }
    const controller = new AdminSearchProjectionController(deps)
    const ctx = context({ userId: operator.id })

    await assert.rejects(() => controller.index(ctx as never), /not authorized/i)
    assert.deepEqual(calls, [{ name: 'authorize', input: { assertedActorId: operator.id } }])

    const anonymous = context({})
    await assert.rejects(() => controller.index(anonymous as never), /authentication required/i)
  })

  test('does not invent rebuild, reconcile, or abort operations without existing contracts', async ({
    assert,
  }) => {
    const { deps } = dependencies()
    const controller = new AdminSearchProjectionController(deps)

    const operations = [
      (ctx: never) => controller.rebuild(ctx),
      (ctx: never) => controller.reconcile(ctx),
      (ctx: never) => controller.abort(ctx),
    ]
    for (const operation of operations) {
      await assert.rejects(
        () => operation(context({ userId: operator.id }) as never),
        /not supported/i
      )
    }
  })
})
