import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '../..')

const matrix = JSON.parse(
  await readFile(join(root, 'docs/test/generated/module_suite_matrix.json'), 'utf8')
)
const packageJson = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'))
const generatedMd = await readFile(join(root, 'docs/test/generated/module_suite_matrix.md'), 'utf8')

const errors = []

const expectedE2eModules = [
  'admin',
  'auth',
  'marketplace',
  'organizations',
  'projects',
  'reviews',
  'tasks',
  'users',
]

if (matrix.migrationGuard?.missingMigratedE2eFiles?.length > 0) {
  for (const file of matrix.migrationGuard.missingMigratedE2eFiles) {
    errors.push(`Deleted tracked E2E file has no runnable inertia/apps replacement: ${file}`)
  }
}

for (const row of matrix.modules) {
  const needle = `| ${row.module} | ${row.codeFiles} | ${row.totals.unit} | ${row.totals.integration} | ${row.totals.contract} | ${row.totals.component} | ${row.totals.e2e} |`
  if (!generatedMd.includes(needle)) {
    errors.push(`Missing coverage row for ${row.module}`)
  }

  const splitNeedle = `| ${row.module} | ${row.moduleLocal.unit}/${row.legacyMapped.unit} | ${row.moduleLocal.integration}/${row.legacyMapped.integration} | ${row.moduleLocal.contract}/${row.legacyMapped.contract} | ${row.moduleLocal.component}/${row.legacyMapped.component} | ${row.moduleLocal.e2e}/${row.legacyMapped.e2e} |`
  if (!generatedMd.includes(splitNeedle)) {
    errors.push(`Missing source split row for ${row.module}`)
  }
}

for (const moduleName of expectedE2eModules) {
  const row = matrix.modules.find((entry) => entry.module === moduleName)
  if (!row) {
    errors.push(`Missing expected E2E module row for ${moduleName}`)
    continue
  }

  if (row.totals.e2e <= 0) {
    errors.push(`Expected ${moduleName} to include E2E specs in module inventory`)
  }
}

const scripts = packageJson.scripts ?? {}
if (!scripts['test:all:safe']?.includes('test:integration:safe')) {
  errors.push('test:all:safe must remain the explicit safe backend integration aggregate')
}

if (scripts['test:all:safe']?.includes('test:e2e')) {
  errors.push('test:all:safe must not imply E2E; use test:full-confidence for layered confidence')
}

if (!/test:(quality:critical|e2e)/.test(scripts['test:full-confidence'] ?? '')) {
  errors.push('test:full-confidence must include an E2E-bearing command')
}

if (!scripts['test:quality:critical']?.includes('test:inventory:modules')) {
  errors.push('test:quality:critical must include module inventory and E2E migration guard')
}

if (errors.length > 0) {
  for (const error of errors) {
    console.error('FAIL:', error)
  }
  process.exit(1)
}

console.log('PASS: module suite matrix markdown matches json')
