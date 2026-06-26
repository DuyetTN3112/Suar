import { test } from '@japa/runner'

import { NodeProjectContextContentHasher } from '#modules/projects/infra/adapters/project-context/node_project_context_content_hasher'

test('Project Context canonical hash ignores object key order but preserves semantic values', ({
  assert,
}) => {
  const hasher = new NodeProjectContextContentHasher()
  const first = hasher.hash({
    title: 'Pre-order API',
    defaults: { environment: 'staging', standards: ['OpenAPI 3.1', 'idempotency'] },
  })
  const reordered = hasher.hash({
    defaults: { standards: ['OpenAPI 3.1', 'idempotency'], environment: 'staging' },
    title: 'Pre-order API',
  })
  const changed = hasher.hash({
    defaults: { standards: ['OpenAPI 3.1'], environment: 'staging' },
    title: 'Pre-order API',
  })

  assert.match(first, /^sha256:[0-9a-f]{64}$/)
  assert.equal(first, reordered)
  assert.notEqual(first, changed)
})
