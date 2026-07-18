import { execFile } from 'node:child_process'
import { mkdir, readdir, writeFile } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '../..')
const modulesRoot = join(root, 'app/modules')
const execFileAsync = promisify(execFile)

const SUITE_LABELS = ['unit', 'integration', 'contract', 'component', 'e2e']
const LEGACY_ROOTS = {
  unit: [],
  integration: [],
  contract: [],
  component: [],
  e2e: [],
}
const MODULE_LOCAL_PATTERNS = {
  unit: /app\/modules\/[^/]+\/tests\/unit\/.+\.spec\.ts$/,
  backendUnit: /app\/modules\/[^/]+\/tests\/backend\/unit\/.+\.spec\.ts$/,
  integration: /app\/modules\/[^/]+\/tests\/integration\/.+\.spec\.ts$/,
  backendIntegration: /app\/modules\/[^/]+\/tests\/backend\/integration\/.+\.spec\.ts$/,
  contract: /app\/modules\/[^/]+\/tests\/contract\/.+\.spec\.ts$/,
  backendContract: /app\/modules\/[^/]+\/tests\/backend\/contract\/.+\.spec\.ts$/,
  component: /inertia\/apps\/[^/]+\/tests\/(?:modules|shared)\/.+\.(test|spec)\.ts$/,
  e2e: /inertia\/apps\/[^/]+\/tests\/e2e\/.+\.spec\.ts$/,
}
const E2E_FLOW_MODULES = {
  admin: ['admin'],
  auth: ['auth'],
  marketplace: ['marketplace'],
  org: ['organizations', 'users'],
  profile: ['users'],
  projects: ['projects'],
  reviews: ['reviews'],
  tasks: ['tasks'],
}

async function walkFiles(dir, matcher, results = []) {
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return results
  }

  for (const entry of entries) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      await walkFiles(fullPath, matcher, results)
      continue
    }

    if (entry.isFile() && matcher.test(entry.name)) {
      results.push(relative(root, fullPath).replaceAll('\\', '/'))
    }
  }

  return results
}

function uniqueSorted(values) {
  return [...new Set(values)].sort()
}

function inferLegacyModule(filePath, moduleNames) {
  for (const moduleName of moduleNames) {
    if (
      filePath.includes(`/${moduleName}/`) ||
      filePath.includes(`${moduleName}_`) ||
      filePath.includes(`${moduleName}.`)
    ) {
      return moduleName
    }
  }

  return null
}

function inferComponentModule(filePath) {
  const match = filePath.match(/^inertia\/apps\/([^/]+)\/tests\/(?:modules|shared)\/([^/]+)\//)
  if (!match) {
    return null
  }

  const appSegment = match[1]
  const moduleSegment = match[2]
  if (appSegment === 'admin') {
    return 'admin'
  }

  if (moduleSegment === 'bookmarks' || moduleSegment === 'invitations' || moduleSegment === 'members' || moduleSegment === 'talents') {
    return 'users'
  }

  if (moduleSegment === 'disputes') {
    return 'reviews'
  }

  return moduleSegment
}

function inferE2eModules(filePath) {
  const match = filePath.match(/^inertia\/apps\/[^/]+\/tests\/e2e\/([^/]+)\//)
  if (!match) {
    return []
  }

  return E2E_FLOW_MODULES[match[1]] ?? []
}

async function listDeletedTrackedE2eFiles() {
  try {
    const { stdout } = await execFileAsync('git', [
      'diff',
      '--name-only',
      '--diff-filter=D',
      '--',
      'tests/e2e',
      'inertia/tests/e2e',
    ], { cwd: root })
    return stdout.trim().split('\n').filter(Boolean)
  } catch {
    return []
  }
}

const moduleDirs = (await readdir(modulesRoot, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort()

const suiteFiles = {
  unit: uniqueSorted(
    [
      ...(await walkFiles(modulesRoot, /\.spec\.ts$/)),
    ].filter((file) => {
      return MODULE_LOCAL_PATTERNS.unit.test(file) ||
        MODULE_LOCAL_PATTERNS.backendUnit.test(file)
    })
  ),
  integration: uniqueSorted(
    [
      ...(await walkFiles(modulesRoot, /\.spec\.ts$/)),
    ].filter((file) => {
      return MODULE_LOCAL_PATTERNS.integration.test(file) ||
        MODULE_LOCAL_PATTERNS.backendIntegration.test(file)
    })
  ),
  contract: uniqueSorted(
    [
      ...(await walkFiles(modulesRoot, /\.spec\.ts$/)),
    ].filter((file) => {
      return MODULE_LOCAL_PATTERNS.contract.test(file) ||
        MODULE_LOCAL_PATTERNS.backendContract.test(file)
    })
  ),
  component: uniqueSorted(
    [
      ...(await walkFiles(join(root, 'inertia/apps'), /\.(test|spec)\.ts$/)),
    ].filter((file) => {
      return MODULE_LOCAL_PATTERNS.component.test(file)
    })
  ),
  e2e: uniqueSorted(
    [
      ...(await walkFiles(join(root, 'inertia/apps'), /\.spec\.ts$/)),
    ].filter((file) => {
      return MODULE_LOCAL_PATTERNS.e2e.test(file)
    })
  ),
}

const deletedTrackedE2eFiles = await listDeletedTrackedE2eFiles()
const runnableE2eBasenames = new Set(suiteFiles.e2e.map((file) => file.split('/').at(-1)))
const missingMigratedE2eFiles = deletedTrackedE2eFiles.filter((file) => {
  return !runnableE2eBasenames.has(file.split('/').at(-1))
})

const matrix = []

for (const moduleName of moduleDirs) {
  const codeFiles = (
    await walkFiles(join(modulesRoot, moduleName), /\.ts$/)
  ).filter((file) => !/\/README\.md$|\/INDEX\.md$/.test(file)).length

  const row = {
    module: moduleName,
    codeFiles,
    totals: {
      unit: 0,
      integration: 0,
      contract: 0,
      component: 0,
      e2e: 0,
    },
    moduleLocal: {
      unit: 0,
      integration: 0,
      contract: 0,
      component: 0,
      e2e: 0,
    },
    legacyMapped: {
      unit: 0,
      integration: 0,
      contract: 0,
      component: 0,
      e2e: 0,
    },
  }

  for (const suite of SUITE_LABELS) {
    for (const file of suiteFiles[suite]) {
      const isModuleOwned = suite === 'unit'
        ? MODULE_LOCAL_PATTERNS.unit.test(file) || MODULE_LOCAL_PATTERNS.backendUnit.test(file)
        : suite === 'integration'
          ? MODULE_LOCAL_PATTERNS.integration.test(file) || MODULE_LOCAL_PATTERNS.backendIntegration.test(file)
          : suite === 'contract'
            ? MODULE_LOCAL_PATTERNS.contract.test(file) || MODULE_LOCAL_PATTERNS.backendContract.test(file)
            : suite === 'component'
              ? MODULE_LOCAL_PATTERNS.component.test(file)
              : MODULE_LOCAL_PATTERNS.e2e.test(file)

      if (
        isModuleOwned &&
        (
          file.startsWith(`app/modules/${moduleName}/`) ||
          inferComponentModule(file) === moduleName ||
          inferE2eModules(file).includes(moduleName)
        )
      ) {
        row.moduleLocal[suite] += 1
        row.totals[suite] += 1
        continue
      }

      if (!LEGACY_ROOTS[suite].some((prefix) => file.startsWith(`${prefix}/`))) {
        continue
      }

      if (inferLegacyModule(file, [moduleName]) === moduleName) {
        row.legacyMapped[suite] += 1
        row.totals[suite] += 1
      }
    }
  }

  matrix.push(row)
}

const summary = {
  generatedAt: new Date().toISOString(),
  suites: SUITE_LABELS,
  migrationGuard: {
    deletedTrackedE2eFiles,
    missingMigratedE2eFiles,
  },
  modules: matrix,
}

const outJson = join(root, 'docs/test/generated/module_suite_matrix.json')
const outMd = join(root, 'docs/test/generated/module_suite_matrix.md')

await mkdir(dirname(outJson), { recursive: true })
await writeFile(outJson, JSON.stringify(summary, null, 2))
await writeFile(
  outMd,
  [
    '# Module Suite Inventory Matrix',
    '',
    '> Generated by `scripts/tests/collect_module_suite_matrix.mjs`.',
    '> During migration, totals = module-local tests + legacy tests heuristically mapped to module names.',
    '> Frontend component/E2E paths are mapped by business-flow folder, not by app shell (`user`, `org`, `admin`) alone.',
    '> Counts prove test-file presence only; they do not prove behavior, scenario, or atomic test-case coverage.',
    '> Migration guard: deleted tracked E2E basenames under old roots must exist under runnable `inertia/apps/*/tests/e2e` paths.',
    '',
    '## Inventory Matrix',
    '',
    '| Module | Code files | Unit | Integration | Contract | Component | E2E |',
    '|---|---:|---:|---:|---:|---:|---:|',
    ...matrix.map((row) => {
      return `| ${row.module} | ${row.codeFiles} | ${row.totals.unit} | ${row.totals.integration} | ${row.totals.contract} | ${row.totals.component} | ${row.totals.e2e} |`
    }),
    '',
    '## Source Split',
    '',
    '| Module | Unit local/legacy | Integration local/legacy | Contract local/legacy | Component local/legacy | E2E local/legacy |',
    '|---|---:|---:|---:|---:|---:|',
    ...matrix.map((row) => {
      return `| ${row.module} | ${row.moduleLocal.unit}/${row.legacyMapped.unit} | ${row.moduleLocal.integration}/${row.legacyMapped.integration} | ${row.moduleLocal.contract}/${row.legacyMapped.contract} | ${row.moduleLocal.component}/${row.legacyMapped.component} | ${row.moduleLocal.e2e}/${row.legacyMapped.e2e} |`
    }),
    '',
  ].join('\n')
)

console.log('Module matrix written to')
console.log('  ', outJson)
console.log('  ', outMd)
console.log('Modules:', matrix.length)
