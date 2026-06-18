import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

import { test } from '@japa/runner'

const ORGANIZATION_ACTION_FEATURES = [
  'access',
  'directory',
  'invitations',
  'members',
  'dashboard',
  'projects',
  'settings',
  'sprints',
  'tasks',
  'workflow',
] as const

function collectSharedDirectories(root: string): string[] {
  if (!existsSync(root)) {
    return []
  }

  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    if (!entry.isDirectory()) {
      return []
    }

    const path = join(root, entry.name)
    return entry.name === 'shared' ? [path] : collectSharedDirectories(path)
  })
}

function collectTypeScriptFiles(root: string): string[] {
  if (!existsSync(root)) {
    return []
  }

  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = join(root, entry.name)
    if (entry.isDirectory()) {
      return collectTypeScriptFiles(path)
    }

    return entry.isFile() && entry.name.endsWith('.ts') ? [path] : []
  })
}

test.group('Unit | Organization layer-in-module architecture', () => {
  test('keeps shared command and query bases at the actions layer root', ({ assert }) => {
    const organizationsRoot = join(process.cwd(), 'app/modules/organizations')

    assert.isTrue(existsSync(join(organizationsRoot, 'actions/commands/base_command.ts')))
    assert.isTrue(existsSync(join(organizationsRoot, 'actions/queries/base_query.ts')))

    for (const feature of ORGANIZATION_ACTION_FEATURES) {
      assert.isFalse(existsSync(join(organizationsRoot, `actions/commands/${feature}/base_command.ts`)))
      assert.isFalse(existsSync(join(organizationsRoot, `actions/queries/${feature}/base_query.ts`)))
    }
  })

  test('contains no shared module', ({ assert }) => {
    const organizationsRoot = join(process.cwd(), 'app/modules/organizations')

    assert.deepEqual(collectSharedDirectories(organizationsRoot), [])
  })

  test('keeps controllers behind feature-local action boundaries', ({ assert }) => {
    const organizationsRoot = join(process.cwd(), 'app/modules/organizations')
    const controllerFiles = collectTypeScriptFiles(organizationsRoot).filter((file) =>
      file.includes('/controllers/')
    )

    for (const file of controllerFiles) {
      const source = readFileSync(file, 'utf8')

      for (const forbiddenImport of [
        '/actions/ports/outbound/',
        '/actions/factories/',
        '/actions/services/',
      ]) {
        assert.notInclude(
          source,
          forbiddenImport,
          `${file} must enter through a feature-local inbound action boundary`
        )
      }
    }
  })

  test('preserves layer-first roots and eliminates feature-first action namespaces', ({ assert }) => {
    const organizationsRoot = join(process.cwd(), 'app/modules/organizations')
    const organizationTypeScriptFiles = collectTypeScriptFiles(organizationsRoot)

    for (const layerRoot of ['actions', 'controllers', 'domain', 'infra', 'public_contracts']) {
      assert.isTrue(
        existsSync(join(organizationsRoot, layerRoot)),
        `${layerRoot} must remain a module-owned layer root`
      )
    }

    for (const feature of ORGANIZATION_ACTION_FEATURES) {
      assert.isFalse(
        collectTypeScriptFiles(join(organizationsRoot, feature, 'actions')).length > 0,
        `${feature}/actions must not recreate the obsolete feature-first layout`
      )
    }

    assert.notInclude(
      organizationTypeScriptFiles.map((file) => file.split('/').at(-1)),
      'organization_administration_action_factory.ts'
    )

    const eliminatedImportPrefixes = ['core', 'current'].map(
      (namespace) => `#modules/organizations/${namespace}/`
    )
    for (const file of organizationTypeScriptFiles) {
      const source = readFileSync(file, 'utf8')
      for (const prefix of eliminatedImportPrefixes) {
        assert.notInclude(source, prefix)
      }
    }
  })
})
