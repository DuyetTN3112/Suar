import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

import { test } from '@japa/runner'

const ORGANIZATION_FEATURES = [
  'access',
  'dashboard',
  'directory',
  'invitations',
  'members',
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
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = join(root, entry.name)
    if (entry.isDirectory()) {
      return collectTypeScriptFiles(path)
    }

    return entry.isFile() && entry.name.endsWith('.ts') ? [path] : []
  })
}

test.group('Unit | Organization layer-in-module architecture', () => {
  test('keeps command and query bases local to every organization feature', ({ assert }) => {
    const organizationsRoot = join(process.cwd(), 'app/modules/organizations')
    const moduleRoots = ORGANIZATION_FEATURES.map((feature) => join(organizationsRoot, feature))

    for (const moduleRoot of moduleRoots) {
      assert.isTrue(
        existsSync(join(moduleRoot, 'actions/command/base_command.ts')),
        `${moduleRoot} must own actions/command/base_command.ts`
      )
      assert.isTrue(
        existsSync(join(moduleRoot, 'actions/query/base_query.ts')),
        `${moduleRoot} must own actions/query/base_query.ts`
      )
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

  test('does not retain layer-first, core, or current filesystem namespaces', ({ assert }) => {
    const organizationsRoot = join(process.cwd(), 'app/modules/organizations')
    const organizationTypeScriptFiles = collectTypeScriptFiles(organizationsRoot)

    for (const forbiddenRoot of [
      'actions',
      'application',
      'boundary',
      'constants',
      'controllers',
      'core',
      'current',
      'domain',
      'events',
      'infra',
      'middleware',
      'observability',
      'public_contracts',
      'shared',
      'types',
      'validators',
    ]) {
      assert.isFalse(
        existsSync(join(organizationsRoot, forbiddenRoot)),
        `${forbiddenRoot} must live inside a feature module`
      )
    }

    for (const feature of ORGANIZATION_FEATURES) {
      const factoryRoot = join(organizationsRoot, feature, 'actions/factories')
      assert.deepEqual(
        existsSync(factoryRoot) ? collectTypeScriptFiles(factoryRoot) : [],
        [],
        `${feature} concrete action factories must live in the composition root`
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
