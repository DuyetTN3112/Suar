import { readFile, readdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join, relative } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '../..')

async function walkFiles(dir, results = []) {
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return results
  }

  for (const entry of entries) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      await walkFiles(fullPath, results)
      continue
    }

    if (entry.isFile()) {
      results.push(relative(root, fullPath).replaceAll('\\', '/'))
    }
  }

  return results
}

function globToRegExp(glob) {
  const escaped = glob
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replaceAll('**/', '(?:.*/)?')
    .replaceAll('*', '[^/]*')

  return new RegExp(`^${escaped}$`)
}

async function expandGlob(glob) {
  const firstWildcard = glob.search(/[*]/)
  const basePrefix = firstWildcard === -1 ? glob : glob.slice(0, firstWildcard)
  const baseDir = basePrefix.includes('/')
    ? basePrefix.slice(0, basePrefix.lastIndexOf('/'))
    : '.'
  const matcher = globToRegExp(glob)
  const files = await walkFiles(join(root, baseDir || '.'))

  return files.filter((file) => matcher.test(file)).sort()
}

async function policyFiles(policy) {
  const files = new Set(policy.criticalSpecs ?? [])

  for (const glob of policy.includeGlobs ?? []) {
    for (const file of await expandGlob(glob)) {
      files.add(file)
    }
  }

  for (const file of policy.excludeFiles ?? []) {
    files.delete(file)
  }

  return [...files].sort()
}

function isAllowed(policy, offender) {
  if (
    (policy.allowedDebtFiles ?? []).some((allowed) => {
      return allowed.file === offender.file
    })
  ) {
    return true
  }

  return (policy.allowedOffenders ?? []).some((allowed) => {
    return allowed.file === offender.file && allowed.pattern === offender.pattern
  })
}

export async function scanFalsePassPatterns(policyPath) {
  const policy = JSON.parse(await readFile(join(root, policyPath), 'utf8'))
  const offenders = []

  for (const file of await policyFiles(policy)) {
    let content
    try {
      content = await readFile(join(root, file), 'utf8')
    } catch {
      const offender = { file, pattern: '<FILE_NOT_FOUND>' }
      if (!isAllowed(policy, offender)) {
        offenders.push(offender)
      }
      continue
    }
    for (const pattern of policy.forbiddenPatterns ?? []) {
      if (content.includes(pattern)) {
        const offender = { file, pattern }
        if (!isAllowed(policy, offender)) {
          offenders.push(offender)
        }
      }
    }
    for (const { id, regex } of policy.forbiddenRegexPatterns ?? []) {
      const matcher = new RegExp(regex, 'm')
      if (matcher.test(content)) {
        const offender = { file, pattern: id }
        if (!isAllowed(policy, offender)) {
          offenders.push(offender)
        }
      }
    }
  }

  return offenders
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const offenders = await scanFalsePassPatterns('scripts/tests/critical_e2e_policy.json')
  if (offenders.length === 0) {
    console.log('PASS: no false-pass patterns found in critical E2E specs')
  } else {
    console.log('FAIL: false-pass patterns detected:')
    for (const { file, pattern } of offenders) {
      console.log(`  ${file}: contains "${pattern}"`)
    }
    process.exit(1)
  }
}
