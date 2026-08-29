import { readFile } from 'node:fs/promises'

const manifestPath = new URL('../build/public/assets/.vite/manifest.json', import.meta.url)
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))

const requiredEntrypoints = [
  'inertia/apps/user/app.ts',
  'inertia/apps/org/app.ts',
  'inertia/apps/admin/app.ts',
]

const missingEntrypoints = requiredEntrypoints.filter((entrypoint) => !manifest[entrypoint])
if (missingEntrypoints.length > 0) {
  throw new Error(`Missing Inertia entrypoints in production manifest: ${missingEntrypoints.join(', ')}`)
}

if (manifest['inertia/app.ts']) {
  throw new Error('Legacy Inertia entrypoint inertia/app.ts is still present in the production manifest')
}

console.log(`Verified ${requiredEntrypoints.length} Inertia production entrypoints`)
