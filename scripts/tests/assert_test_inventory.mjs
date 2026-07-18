import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '../..')

const inventory = JSON.parse(
  await readFile(join(root, 'docs/test/generated/runnable_inventory.json'), 'utf8')
)

const errors = []
const generatedMd = await readFile(join(root, 'docs/test/generated/runnable_inventory.md'), 'utf8')

const checks = [
  { label: 'Component (Vitest runnable)', count: inventory.counts.componentRunnable },
  { label: 'Wrapper fixtures (non-runnable)', count: inventory.counts.wrapperFixtures },
  { label: 'E2E (Playwright specs)', count: inventory.counts.e2eFiles },
  { label: 'Unit (Japa specs)', count: inventory.counts.unitFiles },
  { label: 'Integration (Japa specs)', count: inventory.counts.integrationFiles },
  { label: 'Contract', count: inventory.counts.contractFiles },
]

for (const { label, count } of checks) {
  const needle = `| ${label} | ${count} |`
  if (!generatedMd.includes(needle)) {
    errors.push(`Drift in runnable_inventory.md: missing "${needle}"`)
  }
}

// Verify total
const totalNeedle = `| **Total test files** | **${inventory.counts.totalTestFiles}** |`
if (!generatedMd.includes(totalNeedle)) {
  errors.push(`Drift in runnable_inventory.md: missing "${totalNeedle}"`)
}

if (errors.length > 0) {
  for (const e of errors) console.error('FAIL:', e)
  process.exit(1)
} else {
  console.log('PASS: all counts match between inventory and docs')
}
