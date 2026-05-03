import { execFileSync } from 'node:child_process'

import { test } from '@japa/runner'

interface ImportReference {
  file: string
  specifier: string
  targetLayer: string | null
  targetModule: string | null
}

test.group('Architecture | Accomplishment module boundary', () => {
  test('WP-06 never imports Task, Review or User infrastructure models', ({ assert }) => {
    const output = execFileSync(
      'node',
      [
        'scripts/architecture/import_scanner.mjs',
        '--json',
        '--exclude-tests',
        'app/modules/accomplishments',
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
        ['tasks', 'reviews', 'users'].includes(reference.targetModule ?? '') &&
        reference.targetLayer === 'infra'
    )

    assert.deepEqual(forbidden, [])
  })
})
