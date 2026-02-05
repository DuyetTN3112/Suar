import { execFileSync } from 'node:child_process'

import { test } from '@japa/runner'

interface ImportViolation {
  file: string
  line: number
  specifier: string
}

function countRgMatches(pattern: string, paths: string[]): number {
  try {
    const output = execFileSync(
      'rg',
      [pattern, ...paths, '--glob', '*.ts', '--count'],
      { encoding: 'utf8' }
    )

    return output
      .trim()
      .split('\n')
      .filter(Boolean)
      .reduce((sum, line) => {
        const count = Number.parseInt(line.split(':').pop() ?? '0', 10)
        return Number.isNaN(count) ? sum : sum + count
      }, 0)
  } catch {
    return 0
  }
}

function scanImportSpecifiers(paths: string[], forbidden: RegExp[]): ImportViolation[] {
  const importPattern = "from ['\\\"]([^'\\\"]+)['\\\"]"

  try {
    const output = execFileSync(
      'rg',
      [importPattern, ...paths, '--glob', '*.ts', '--line-number', '--replace', '$path:$line:$1'],
      { encoding: 'utf8' }
    )

    return output
      .trim()
      .split('\n')
      .filter(Boolean)
      .flatMap((line) => {
        const [file, lineNumber, specifier] = line.split(':')
        if (!file || !lineNumber || !specifier) return []

        if (!forbidden.some((pattern) => pattern.test(specifier))) return []

        return [
          {
            file,
            line: Number.parseInt(lineNumber, 10),
            specifier,
          },
        ]
      })
  } catch {
    return []
  }
}

test.group('Architecture boundary guards', () => {
  test('production code does not import from eliminated modules common', ({ assert }) => {
    assert.equal(countRgMatches("from '#modules/common'", ['app']), 0)
  })

  test('protected domain layers do not import cross-module role constants', ({ assert }) => {
    const protectedPaths = [
      'app/modules/authorization',
      'app/modules/tasks/domain',
      'app/modules/projects/domain',
    ]

    for (const pattern of [
      "from '#modules/organizations/constants",
      "from '#modules/projects/constants",
      "from '#modules/users/constants",
    ]) {
      assert.equal(countRgMatches(pattern, protectedPaths), 0)
    }
  })

  test('authorization module does not import user module internals', ({ assert }) => {
    assert.deepEqual(
      scanImportSpecifiers(['app/modules/authorization'], [
        /^#modules\/users\/(?!actions\/public_api$)/,
      ]),
      []
    )
  })

  test('actions and modules do not import Lucid model instances from infra', ({ assert }) => {
    const violations = scanImportSpecifiers(['app/modules'], [
      /^#modules\/[^/]+\/infra\/models\//,
    ]).filter((violation) => /\/(actions|controllers)\//.test(violation.file))

    assert.deepEqual(violations, [])
  })

  test('actions and modules do not import the monolithic task repository facade', ({
    assert,
  }) => {
    assert.equal(
      countRgMatches("from '#modules/tasks/infra/repositories/task_repository'", ['app/modules']),
      0
    )
  })

  test('actions do not import the organization user repository facade', ({ assert }) => {
    assert.equal(
      countRgMatches("from '#modules/organizations/infra/repositories/organization_user_repository'", [
        'app/modules',
      ]),
      0
    )
  })

  test('source code does not import deprecated layer aliases', ({ assert }) => {
    assert.deepEqual(scanImportSpecifiers(['app', 'start', 'config', 'commands', 'tests'], [
      /^#actions\//,
      /^#infra\//,
    ]), [])
  })
})
