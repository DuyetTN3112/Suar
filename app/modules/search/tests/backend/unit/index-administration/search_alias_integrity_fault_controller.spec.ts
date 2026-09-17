import { test } from '@japa/runner'

import {
  SearchAliasIntegrityFaultConflict,
  SearchAliasIntegrityFaultController,
  type SearchAliasIntegrityIndices,
} from '#modules/search/infra/adapters/search-discovery/search_alias_integrity_fault_controller'

const ALIAS = 'suar_tasks'
const FAULT = `${ALIAS}_v1_rp-fst-09-fault`
const BASE = `${ALIAS}_v1_base`
const MAPPINGS = { properties: { title: { type: 'text' } } }

class FakeIndices implements SearchAliasIntegrityIndices {
  aliases = new Map<string, Set<string>>([[ALIAS, new Set([BASE])]])
  indices = new Set([BASE])
  delayMs = 0
  throwAfterAliasAdd = false

  async getAlias(input: { name: string }): Promise<Record<string, unknown>> {
    if (this.delayMs > 0) await new Promise((resolve) => setTimeout(resolve, this.delayMs))
    return Object.fromEntries([...this.aliases.get(input.name) ?? []].map((name) => [name, {}]))
  }

  create(input: { index: string; mappings: Record<string, unknown> }): Promise<void> {
    void input.mappings
    this.indices.add(input.index)
    return Promise.resolve()
  }

  delete(input: { index: string }, _options?: { ignore: number[] }): Promise<void> {
    this.indices.delete(input.index)
    for (const backing of this.aliases.values()) backing.delete(input.index)
    return Promise.resolve()
  }

  updateAliases(input: {
    actions: Array<
      | { add: { index: string; alias: string } }
      | { remove: { index: string; alias: string } }
    >
  }): Promise<void> {
    for (const action of input.actions) {
      if ('add' in action) this.aliases.get(action.add.alias)?.add(action.add.index)
      else this.aliases.get(action.remove.alias)?.delete(action.remove.index)
    }
    if (this.throwAfterAliasAdd) throw new Error('alias response lost after commit')
    return Promise.resolve()
  }
}

function controller(indices: FakeIndices): SearchAliasIntegrityFaultController {
  return new SearchAliasIntegrityFaultController(indices)
}

test.group('Unit | Search alias-integrity fault controller', () => {
  test('serializes concurrent enables into one fixture slot', async ({ assert }) => {
    const indices = new FakeIndices()
    indices.delayMs = 1
    const fault = controller(indices)

    const results = await Promise.allSettled([
      fault.enable({ aliasName: ALIAS, faultIndexName: FAULT, mappings: MAPPINGS }),
      fault.enable({ aliasName: ALIAS, faultIndexName: FAULT, mappings: MAPPINGS }),
    ])

    assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1)
    const rejected = results.find((result) => result.status === 'rejected')
    assert.isDefined(rejected)
    if (rejected?.status === 'rejected') assert.instanceOf(rejected.reason, SearchAliasIntegrityFaultConflict)
    assert.deepEqual([...indices.aliases.get(ALIAS) ?? []].sort(), [BASE, FAULT].sort())
  })

  test('restore is idempotent and removes a detached orphan fault index', async ({ assert }) => {
    const indices = new FakeIndices()
    indices.indices.add(FAULT)
    const fault = controller(indices)

    await fault.restore({ aliasName: ALIAS, faultIndexName: FAULT })
    await fault.restore({ aliasName: ALIAS, faultIndexName: FAULT })

    assert.isFalse(indices.indices.has(FAULT))
    assert.deepEqual([...indices.aliases.get(ALIAS) ?? []], [BASE])
  })

  test('retains an index when alias update committed before the client error', async ({ assert }) => {
    const indices = new FakeIndices()
    indices.throwAfterAliasAdd = true
    const fault = controller(indices)

    await assert.rejects(
      () => fault.enable({ aliasName: ALIAS, faultIndexName: FAULT, mappings: MAPPINGS }),
      /alias response lost after commit/u
    )
    assert.isTrue(indices.indices.has(FAULT))
    assert.isTrue(indices.aliases.get(ALIAS)?.has(FAULT))

    indices.throwAfterAliasAdd = false
    await fault.restore({ aliasName: ALIAS, faultIndexName: FAULT })
    assert.deepEqual([...indices.aliases.get(ALIAS) ?? []], [BASE])
  })
})
