import { test } from '@japa/runner'

import { NodeTaskContractContentHasher } from '#modules/tasks/infra/adapters/task-submissions/node_task_contract_content_hasher'

test('Task Contract canonical hash ignores object key order but preserves array order', ({
  assert,
}) => {
  const hasher = new NodeTaskContractContentHasher()
  const first = hasher.hash({ nested: { b: 2, a: 1 }, list: ['first', 'second'] })
  const reorderedKeys = hasher.hash({ list: ['first', 'second'], nested: { a: 1, b: 2 } })
  const reorderedArray = hasher.hash({ nested: { a: 1, b: 2 }, list: ['second', 'first'] })

  assert.equal(first, reorderedKeys)
  assert.notEqual(first, reorderedArray)
  assert.match(first, /^sha256:[0-9a-f]{64}$/)
})
