import { execFileSync } from 'node:child_process'

import { test } from '@japa/runner'

interface ImportReference {
  file: string
  specifier: string
  targetLayer: string | null
  targetModule: string | null
}

test.group('Architecture | Review observation boundary', () => {
  test('WP-05 stores cross-module provenance as logical IDs without infrastructure imports', ({
    assert,
  }) => {
    const output = execFileSync(
      'node',
      [
        'scripts/architecture/import_scanner.mjs',
        '--json',
        '--exclude-tests',
        'app/modules/reviews/infra/models/observation/review_observation.ts',
        'app/modules/reviews/infra/models/observation/review_observation_revision.ts',
        'app/modules/reviews/infra/models/observation/review_observation_evidence_link.ts',
        'app/modules/reviews/infra/repositories/observation/review_observation_repository.ts',
      ],
      {
        encoding: 'utf8',
        maxBuffer: 16 * 1024 * 1024,
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    )
    const references = JSON.parse(output) as ImportReference[]
    const forbidden = references.filter(
      (reference) =>
        ['tasks', 'users', 'accomplishments'].includes(reference.targetModule ?? '') &&
        reference.targetLayer === 'infra'
    )

    assert.deepEqual(forbidden, [])
  })
})
