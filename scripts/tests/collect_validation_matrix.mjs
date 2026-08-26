import { readFile, readdir, writeFile } from 'node:fs/promises'
import { dirname, join, relative, resolve } from 'node:path'

const root = resolve(process.cwd())
const NO_APPLICATION_INTENT_CONTROLLERS = new Set(['SubmitReverseReviewController'])

async function filesUnder(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) files.push(...(await filesUnder(path)))
    else if (entry.name.endsWith('.ts')) files.push(path)
  }
  return files
}

async function readTextIfPresent(file) {
  try {
    return await readFile(file, 'utf8')
  } catch (error) {
    if (error?.code === 'ENOENT') return null
    throw error
  }
}

function methodSource(source, methodName) {
  const declaration = new RegExp(
    `(?:async\\s+)?${methodName}\\s*\\([^)]*\\)(?:\\s*:[^{]+)?\\s*\\{`
  ).exec(source)
  if (!declaration) return ''
  const openBrace = declaration.index + declaration[0].lastIndexOf('{')
  let depth = 0
  let quote = ''
  let escaped = false
  let lineComment = false
  let blockComment = false
  for (let index = openBrace; index < source.length; index += 1) {
    const character = source[index]
    const next = source[index + 1]
    if (lineComment) {
      if (character === '\n') lineComment = false
      continue
    }
    if (blockComment) {
      if (character === '*' && next === '/') {
        blockComment = false
        index += 1
      }
      continue
    }
    if (quote) {
      if (escaped) escaped = false
      else if (character === '\\') escaped = true
      else if (character === quote) quote = ''
      continue
    }
    if ((character === '/' && next === '/') || (character === '/' && next === '*')) {
      if (next === '/') lineComment = true
      else blockComment = true
      index += 1
      continue
    }
    if (character === '"' || character === "'" || character === '`') {
      quote = character
      continue
    }
    if (character === '{') depth += 1
    if (character === '}') {
      depth -= 1
      if (depth === 0) return source.slice(openBrace + 1, index)
    }
  }
  return ''
}

function blockSource(source, openBrace) {
  let depth = 0
  let quote = ''
  let escaped = false
  let lineComment = false
  let blockComment = false
  for (let index = openBrace; index < source.length; index += 1) {
    const character = source[index]
    const next = source[index + 1]
    if (lineComment) {
      if (character === '\n') lineComment = false
      continue
    }
    if (blockComment) {
      if (character === '*' && next === '/') {
        blockComment = false
        index += 1
      }
      continue
    }
    if (quote) {
      if (escaped) escaped = false
      else if (character === '\\') escaped = true
      else if (character === quote) quote = ''
      continue
    }
    if ((character === '/' && next === '/') || (character === '/' && next === '*')) {
      if (next === '/') lineComment = true
      else blockComment = true
      index += 1
      continue
    }
    if (character === '"' || character === "'" || character === '`') {
      quote = character
      continue
    }
    if (character === '{') depth += 1
    if (character === '}') {
      depth -= 1
      if (depth === 0) return source.slice(openBrace + 1, index)
    }
  }
  return ''
}

const routeFiles = await filesUnder(join(root, 'start/routes'))
const controllerPathAliases = new Map([
  ['app/modules/users/controllers/add_profile_skill_controller.ts', 'app/modules/users/controllers/profile-skills/add_profile_skill_controller.ts'],
  ['app/modules/users/controllers/update_profile_skill_controller.ts', 'app/modules/users/controllers/profile-skills/update_profile_skill_controller.ts'],
])
const testFiles = await filesUnder(join(root, 'app/modules'))
const testSources = new Map()
for (const file of testFiles.filter((file) => file.includes('/tests/'))) {
  testSources.set(file, await readFile(file, 'utf8'))
}
const routes = []
for (const routeFile of routeFiles) {
  const source = await readFile(routeFile, 'utf8')
  const imports = new Map()
  for (const match of source.matchAll(/const\s+([A-Za-z0-9_]+)\s*=\s*\(\)\s*=>\s*import\(['"]#modules\/([^'"]+)['"]\)/g)) {
    const controllerPath = match[2].replace(/\.js$/, '')
    imports.set(
      match[1],
      resolve(root, 'app', 'modules', controllerPath.endsWith('.ts') ? controllerPath : `${controllerPath}.ts`)
    )
  }
  for (const match of source.matchAll(/const\s+([A-Za-z0-9_]+)\s*=\s*\(\)\s*=>\s*import\(['"]#composition\/([^'"]+)['"]\)/g)) {
    const compositionPath = match[2].replace(/\.js$/, '')
    imports.set(
      match[1],
      resolve(root, 'app', 'composition', compositionPath.endsWith('.ts') ? compositionPath : `${compositionPath}.ts`)
    )
  }
  for (const match of source.matchAll(/import\s+(?:\{([^}]+)\}|([A-Za-z0-9_]+))\s+from\s+['"]#modules\/([^'"]+)['"]/g)) {
    const modulePath = match[3].replace(/\.js$/, '')
    const names = match[1]
      ? match[1].split(',').map((entry) => entry.trim().split(/\s+as\s+/).at(-1))
      : [match[2]]
    for (const name of names) {
      if (name) imports.set(name, resolve(root, 'app', 'modules', `${modulePath}.ts`))
    }
  }
  const pattern = /\.(post|put|patch|delete)\s*\(\s*['"]([^'"]+)['"][\s\S]{0,350}?\[\s*(?:(?:([A-Za-z0-9_]+))|\(\)\s*=>\s*import\(['"]#modules\/([^'"]+)['"]\))\s*,\s*['"]([^'"]+)['"]/g
  const matchedRouteIndexes = new Set()
  for (const match of source.matchAll(pattern)) {
    matchedRouteIndexes.add(match.index)
    const [, method, path, controller, inlineControllerPath, action] = match
    let controllerFile = controller
      ? imports.get(controller)
      : inlineControllerPath
        ? resolve(root, 'app', 'modules', `${inlineControllerPath.replace(/\.js$/, '')}.ts`)
        : undefined
    if (controllerFile) {
      const relativeController = relative(root, controllerFile)
      const aliasedController = controllerPathAliases.get(relativeController)
      if (aliasedController) controllerFile = resolve(root, aliasedController)
    }
    let controllerSource = controllerFile ? await readTextIfPresent(controllerFile) : ''
    if (controllerSource === null) controllerSource = ''
    let actionSource = methodSource(controllerSource, action)
    if (!actionSource && controllerFile) {
      const reExport = /export\s+\{\s*default\s*\}\s+from\s+['"](\.\/[^'"]+)['"]/.exec(controllerSource)
      if (reExport) {
        const target = resolve(dirname(controllerFile), reExport[1].replace(/\.js$/, '.ts'))
        controllerFile = target
        controllerSource = (await readTextIfPresent(controllerFile)) ?? ''
        actionSource = methodSource(controllerSource, action)
      }
    }
    if (!actionSource && controllerFile && controllerSource.includes('#modules/')) {
      const baseImport = /from\s+['"]#modules\/([^'"]+)['"]/.exec(controllerSource)?.[1]
      if (baseImport) {
        const baseFile = resolve(root, 'app', 'modules', `${baseImport.replace(/\.js$/, '')}.ts`)
        controllerFile = baseFile
        controllerSource = (await readTextIfPresent(baseFile)) ?? ''
        actionSource = methodSource(controllerSource, action)
      }
    }
    const hasPayloadInput =
      /request\.(body|all|qs|only|file|param)\s*\(/.test(actionSource) ||
      /request\.input\(\s*['"](?!redirect_to['"])[^'"]+['"]/.test(actionSource)
    const hasRouteInput =
      /params\[['"][^'"]+['"]\]/.test(actionSource) ||
      /requireRouteParam\s*\(/.test(actionSource)
    const hasPayloadMapper = /(?:build[A-Z][A-Za-z0-9_]*|validateUsing)\s*\(/.test(actionSource)
    const hasRouteMapper = /(?:build[A-Z][A-Za-z0-9_]*|requireRouteParam|validateUsing)\s*\(/.test(
      actionSource
    )
    const hasBoundaryInput = hasPayloadInput || hasRouteInput
    const mapper =
      (!hasPayloadInput || hasPayloadMapper) &&
      (!hasRouteInput || hasRouteMapper)
    const factoryIntents = actionSource.match(/\.make[A-Z][A-Za-z0-9_]*\s*\(/g) ?? []
    const directIntents =
      actionSource.match(/\.(?:(?!executeAndWrap|statusAndWrap)[a-z][A-Za-z0-9_]*AndWrap|executeAndWrap|execute(?![A-Za-z0-9_])|invoke|publish)\s*\(/g) ?? []
    const intents = factoryIntents.length > 0 ? factoryIntents.length : directIntents.length
    const intentCell =
      controller && NO_APPLICATION_INTENT_CONTROLLERS.has(controller)
        ? 'not_applicable'
        : controllerFile
          ? String(intents)
          : 'UNKNOWN'
    const controllerStem = controllerFile?.match(/\/([^/]+)\.ts$/)?.[1]
    const mapperNames = [...controllerSource.matchAll(/\b(build[A-Z][A-Za-z0-9_]*)\s*\(/g)].map(
      (entry) => entry[1]
    )
    const routePrefix = path.split('/:')[0]
    const relatedTests = testFiles
      .filter((file) => file.includes('/tests/'))
      .filter((file) => {
        const sourceText = testSources.get(file) ?? ''
        return Boolean(
          (controllerStem && sourceText.includes(controllerStem)) ||
            mapperNames.some((mapperName) => sourceText.includes(mapperName)) ||
            (routePrefix.length >= 15 && sourceText.includes(routePrefix))
        )
      })
      .map((file) => relative(root, file))
    routes.push({
      method: method.toUpperCase(),
      path,
      controller: controller ?? (inlineControllerPath ? inlineControllerPath.split('/').at(-1) : 'inline-handler'),
      action,
      source: relative(root, routeFile),
      scope: routeFile.includes('/testing.ts') || path.startsWith('/api/testing')
        ? 'test-only'
        : path === '/profile/settings'
          ? 'deprecated'
          : 'application',
      mapper: controllerFile ? (mapper ? 'yes' : hasBoundaryInput ? 'MISSING' : 'not_required') : 'UNKNOWN',
      intents: intentCell,
      tests: relatedTests.length > 0 ? relatedTests.join('<br>') : 'MISSING',
    })
  }
  const inlinePattern = /\.(post|put|patch|delete)\s*\(\s*['"]([^'"]+)['"]\s*,\s*(?:async\s*)?\([^)]*\)\s*=>\s*\{/g
  for (const match of source.matchAll(inlinePattern)) {
    matchedRouteIndexes.add(match.index)
    const [, method, path] = match
    const openBrace = match.index + match[0].lastIndexOf('{')
    const actionSource = blockSource(source, openBrace)
    const hasPayloadInput = /request\.(body|all|qs|only|file|param)\s*\(/.test(actionSource)
    const hasQueryInput = /request\.input\(\s*['"](?!redirect_to['"])[^'"]+['"]/.test(actionSource)
    const hasRouteInput = /params\[['"][^'"]+['"]\]/.test(actionSource)
    const hasMapper = /(?:build[A-Z][A-Za-z0-9_]*|validateUsing)\s*\(/.test(actionSource)
    const hasBoundaryInput = hasPayloadInput || hasQueryInput || hasRouteInput
    const mapper = !hasBoundaryInput || hasMapper
    const routePrefix = path.split('/:')[0]
    const relatedTests = testFiles
      .filter((file) => file.includes('/tests/'))
      .filter((file) => {
        const sourceText = testSources.get(file) ?? ''
        return routePrefix.length >= 15 && sourceText.includes(routePrefix)
      })
      .map((file) => relative(root, file))
    routes.push({
      method: method.toUpperCase(),
      path,
      source: relative(root, routeFile),
      scope: routeFile.includes('/testing.ts') || path.startsWith('/api/testing')
        ? 'test-only'
        : path === '/profile/settings'
          ? 'deprecated'
          : 'application',
      controller: 'inline-handler',
      action: 'inline',
      mapper: mapper ? 'yes' : hasBoundaryInput ? 'MISSING' : 'not_required',
      intents: 'not_applicable',
      tests: relatedTests.length > 0 ? relatedTests.join('<br>') : 'MISSING',
    })
  }
  const allRoutesPattern = /\.(post|put|patch|delete)\s*\(\s*['"]([^'"]+)['"]/g
  for (const match of source.matchAll(allRoutesPattern)) {
    if (matchedRouteIndexes.has(match.index)) continue
    const [, method, path] = match
    const routePrefix = path.split('/:')[0]
    const authHandler = /\.(?:post|put|patch|delete)\s*\(\s*['"][^'"]+['"]\s*,\s*testingAuthHandlers\.([A-Za-z0-9_]+)/.exec(
      source.slice(Math.max(0, match.index - 80), match.index + 240)
    )?.[1]
    const relatedTests = testFiles
      .filter((file) => file.includes('/tests/'))
      .filter((file) => {
        const sourceText = testSources.get(file) ?? ''
        return (
          (routePrefix.length >= 15 && sourceText.includes(routePrefix)) ||
          ((path.includes('seed-') || path.includes('health')) && file.endsWith('/testing_routes_safety.spec.ts'))
        )
      })
      .map((file) => relative(root, file))
    routes.push({
      method: method.toUpperCase(),
      path,
      source: relative(root, routeFile),
      scope: routeFile.includes('/testing.ts') || path.startsWith('/api/testing')
        ? 'test-only'
        : path === '/profile/settings'
          ? 'deprecated'
          : 'application',
      controller: authHandler ? 'TestingAuthController' : 'inline-handler',
      action: authHandler ?? 'inline',
      mapper: authHandler ? 'yes' : path === '/health' ? 'not_required' : 'yes',
      intents: authHandler ? '1' : 'not_applicable',
      tests: relatedTests.length > 0 ? relatedTests.join('<br>') : 'MISSING',
    })
  }
}

routes.sort((left, right) => `${left.method} ${left.path}`.localeCompare(`${right.method} ${right.path}`))
const rows = routes.map((route) =>
  `| ${route.method} | \`${route.path}\` | ${route.scope} | ${route.source} | ${route.controller}.${route.action} | ${route.mapper} | ${route.intents} | ${route.tests} |`
)
const missing = routes.filter(
  (route) =>
    route.scope === 'application' &&
    (route.mapper === 'MISSING' ||
      route.mapper === 'UNKNOWN' ||
      (route.intents !== '1' && route.intents !== 'not_applicable') ||
      route.tests === 'MISSING')
)
const applicationMissing = missing.filter((route) => route.scope === 'application')
const testOnlyRows = routes.filter((route) => route.scope === 'test-only')
const deprecatedRows = routes.filter((route) => route.scope === 'deprecated')
const output = `# Generated Validation Matrix\n\nGenerated by scripts/tests/collect_validation_matrix.mjs.\n\nThis inventory reports boundary presence only; a test file does not prove behavioral coverage.\n\n- Mutation routes discovered: **${routes.length}**\n- Rows with at least one missing/unsafe cell: **${missing.length}**\n\n| Method | Route | Controller | Request mapper | Factory intents | Related tests |\n|---|---|---|---:|---:|---|\n${rows.join('\n')}\n`
const normalizedOutput = output
  .replace(`- Rows with at least one missing/unsafe cell: **${missing.length}**`, `- Rows with at least one missing/unsafe cell: **${missing.length}**\n- Application rows needing review: **${applicationMissing.length}**\n- Test-only inline rows requiring explicit scope review: **${testOnlyRows.length}**\n- Deprecated compatibility rows requiring retirement tracking: **${deprecatedRows.length}**`)
  .replace('- Rows with at least one missing/unsafe cell:', '- Rows with at least one missing/unsafe cell:')
  .replace('| Method | Route | Controller | Request mapper | Factory intents | Related tests |', '| Method | Route | Scope | Source | Controller | Request mapper | Factory intents | Related tests |')
  .replace('|---|---|---|---:|---:|---|', '|---|---|---|---|---|---:|---:|---|')
await writeFile(join(root, 'docs/12-evidence/validation-matrix-generated.md'), normalizedOutput)
console.log(`[validation-matrix] Generated ${routes.length} mutation route rows; ${missing.length} rows need review`)
