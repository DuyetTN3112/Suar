import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { test } from '@japa/runner'

import {
  acquireArchitectureTestLock,
  releaseArchitectureTestLock,
  runArchitectureGuard,
  scanImportSpecifiers,
  scanProductionImportSpecifiers,
} from './support/boundary_guard_test_helpers.js'

test.group('Architecture | Import and layer boundary guards', (group) => {
  group.setup(acquireArchitectureTestLock)
  group.teardown(releaseArchitectureTestLock)

  test('shared AST scanner recognizes every supported import form', ({ assert }) => {
    const fixtureDirectory = mkdtempSync(join(tmpdir(), 'suar-architecture-import-scanner-'))
    const fixture = join(fixtureDirectory, 'imports.ts')

    writeFileSync(
      fixture,
      [
        'import type { A } from "#modules/a/public_contracts/a"',
        'import "#modules/b/bootstrap/root"',
        'export { c } from "#modules/c/domain/c"',
        'const d = import("#modules/d/infra/d")',
        'import e = require("#modules/e/actions/e")',
        'const f = require("#modules/f/services/f")',
        'type G = import("#modules/g/types/g").G',
      ].join('\n')
    )

    try {
      const references = scanImportSpecifiers([fixture], [/^#modules\//])

      assert.deepEqual(
        references.map((reference) => ({
          kind: reference.kind,
          specifier: reference.specifier,
        })),
        [
          {
            kind: 'import',
            specifier: '#modules/a/public_contracts/a',
          },
          {
            kind: 'import',
            specifier: '#modules/b/bootstrap/root',
          },
          {
            kind: 'export',
            specifier: '#modules/c/domain/c',
          },
          {
            kind: 'dynamic-import',
            specifier: '#modules/d/infra/d',
          },
          {
            kind: 'import-equals',
            specifier: '#modules/e/actions/e',
          },
          {
            kind: 'require',
            specifier: '#modules/f/services/f',
          },
          {
            kind: 'import-type',
            specifier: '#modules/g/types/g',
          },
        ]
      )
    } finally {
      rmSync(fixtureDirectory, { force: true, recursive: true })
    }
  })

  test('shared AST scanner fails closed for a missing root', ({ assert }) => {
    assert.throws(() => {
      scanImportSpecifiers(['app/modules/__missing_architecture_scan_root__'], [/.*/])
    })
  })

  test('production code does not import from eliminated modules common', ({ assert }) => {
    assert.deepEqual(scanProductionImportSpecifiers(['app'], [/^#modules\/common(?:\/|$)/]), [])
  })

  test('protected domain layers do not import cross-module role constants', ({ assert }) => {
    assert.deepEqual(
      scanProductionImportSpecifiers(
        ['app/modules/authorization', 'app/modules/tasks/domain', 'app/modules/projects/domain'],
        [
          /^#modules\/organizations\/constants(?:\/|$)/,
          /^#modules\/projects\/constants(?:\/|$)/,
          /^#modules\/users\/constants(?:\/|$)/,
        ]
      ),
      []
    )
  })

  test('authorization module does not import user module internals', ({ assert }) => {
    assert.deepEqual(
      scanProductionImportSpecifiers(
        ['app/modules/authorization'],
        [/^#modules\/users\/(?!public_contracts\/)/]
      ),
      []
    )
  })

  test('actions do not import the monolithic task repository facade', ({ assert }) => {
    assert.deepEqual(
      scanProductionImportSpecifiers(
        ['app/modules'],
        [/^#modules\/tasks\/infra\/repositories\/task_repository$/]
      ).filter((reference) => reference.file.includes('/actions/')),
      []
    )
  })

  test('actions do not import the organization user repository facade', ({ assert }) => {
    assert.deepEqual(
      scanProductionImportSpecifiers(
        ['app/modules'],
        [/^#modules\/organizations\/infra\/repositories\/organization_user_repository$/]
      ).filter((reference) => reference.file.includes('/actions/')),
      []
    )
  })

  test('source code does not import deprecated layer aliases', ({ assert }) => {
    assert.deepEqual(
      scanImportSpecifiers(
        ['app', 'start', 'config', 'commands', 'tests'],
        [/^#actions\//, /^#infra\//]
      ),
      []
    )
  })

  test('eliminated core module remains absent', ({ assert }) => {
    assert.isFalse(existsSync('app/modules/core'))
  })

  test('business modules do not import HTTP DTO buckets or legacy validation rules', ({
    assert,
  }) => {
    assert.deepEqual(
      scanProductionImportSpecifiers(
        ['app/modules'],
        [/^#modules\/http\/actions\/dtos\//, /^#types\/validation_rules$/]
      ).filter((reference) => !reference.file.includes('/modules/http/')),
      []
    )
  })

  test('runtime module-boundary guard rejects module imports of outer composition', ({
    assert,
  }) => {
    const probeDirectory = 'app/modules/__architecture_guard_probe/controllers'
    const probe = join(probeDirectory, 'probe.ts')
    mkdirSync(probeDirectory, { recursive: true })
    writeFileSync(
      probe,
      "import { probe } from '#composition/__architecture_guard_probe'\nvoid probe\n"
    )

    try {
      assert.throws(() => {
        runArchitectureGuard('scripts/architecture/check_module_domain_boundary.mjs')
      })
    } finally {
      rmSync('app/modules/__architecture_guard_probe', {
        force: true,
        recursive: true,
      })
    }
  })

  test('platform infrastructure cannot depend on feature modules', ({ assert }) => {
    const probeDirectory = 'app/infra/__architecture_guard_probe'
    const probe = join(probeDirectory, 'probe.ts')
    mkdirSync(probeDirectory, { recursive: true })
    writeFileSync(
      probe,
      "import { OrganizationRole } from '#modules/organizations/public_contracts/access/organization_constants'\nvoid OrganizationRole\n"
    )

    try {
      assert.throws(() => {
        runArchitectureGuard('scripts/architecture/check_module_domain_boundary.mjs')
      })
    } finally {
      rmSync(probeDirectory, {
        force: true,
        recursive: true,
      })
    }
  })

  test('runtime guard exposes only the shared HTTP boundary across modules', ({ assert }) => {
    const probeDirectory = 'app/modules/__architecture_guard_probe/actions'
    const probe = join(probeDirectory, 'probe.ts')
    mkdirSync(probeDirectory, { recursive: true })

    try {
      writeFileSync(
        probe,
        "import { isApiTransport } from '#modules/http/boundary/http_transport'\nvoid isApiTransport\n"
      )
      assert.doesNotThrow(() => {
        runArchitectureGuard('scripts/architecture/check_module_domain_boundary.mjs')
      })

      writeFileSync(
        probe,
        "import { readHttpOrgContextContract } from '#modules/organizations/boundary/access/http_org_context_contract'\nvoid readHttpOrgContextContract\n"
      )
      assert.throws(() => {
        runArchitectureGuard('scripts/architecture/check_module_domain_boundary.mjs')
      })
    } finally {
      rmSync('app/modules/__architecture_guard_probe', {
        force: true,
        recursive: true,
      })
    }
  })
})
