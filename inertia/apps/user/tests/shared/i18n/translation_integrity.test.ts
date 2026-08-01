import { readdirSync, readFileSync } from 'node:fs'
import { basename, extname, join, relative, resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const projectRoot = process.cwd()
const languageRoot = resolve(projectRoot, 'resources/lang')
const productionRoot = resolve(projectRoot, 'inertia/apps')
const locales = ['en', 'vi'] as const
const productionExtensions = new Set(['.js', '.svelte', '.ts'])

type TranslationTree = Record<string, unknown>

interface LiteralTranslationCall {
  key: string
  line: number
  sourcePath: string
}

function isRecord(value: unknown): value is TranslationTree {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function getNestedValue(source: unknown, keys: string[]): unknown {
  let current = source

  for (const key of keys) {
    if (!isRecord(current) || !(key in current)) {
      return undefined
    }

    current = current[key]
  }

  return current
}

// Keep this resolution order aligned with the browser translation stores.
function resolveModuleValue(source: unknown, moduleName: string, restKeys: string[]): unknown {
  const wrappedSource = { [moduleName]: source }
  const directValue = getNestedValue(wrappedSource, [moduleName, ...restKeys])
  if (directValue !== undefined) return directValue

  const moduleTree = getNestedValue(wrappedSource, [moduleName])
  if (!isRecord(moduleTree)) return undefined

  const flatValue = restKeys.length > 0 ? getNestedValue(moduleTree, restKeys) : moduleTree
  if (flatValue !== undefined) return flatValue

  const doubleWrappedTree = getNestedValue(moduleTree, [moduleName])
  if (!isRecord(doubleWrappedTree)) return undefined

  return restKeys.length > 0 ? getNestedValue(doubleWrappedTree, restKeys) : doubleWrappedTree
}

function languageFiles(locale: (typeof locales)[number]): string[] {
  return readdirSync(join(languageRoot, locale))
    .filter((fileName) => fileName.endsWith('.json'))
    .sort()
}

function readLanguageModules(locale: (typeof locales)[number]): Map<string, TranslationTree> {
  return new Map(
    languageFiles(locale).map((fileName) => {
      const source = readFileSync(join(languageRoot, locale, fileName), 'utf8')
      const parsed = JSON.parse(source) as unknown

      if (!isRecord(parsed)) {
        throw new Error(`${locale}/${fileName} must contain a JSON object`)
      }

      return [basename(fileName, '.json'), parsed]
    })
  )
}

function listProductionSources(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = join(directory, entry.name)

    if (entry.isDirectory()) {
      return entry.name === 'tests' ? [] : listProductionSources(absolutePath)
    }

    if (
      !entry.isFile() ||
      !productionExtensions.has(extname(entry.name)) ||
      /\.(?:spec|test)\.[jt]s$/.test(entry.name)
    ) {
      return []
    }

    return [absolutePath]
  })
}

function literalTranslationCalls(): LiteralTranslationCall[] {
  const literalCallPattern = /\bt\s*\(\s*(['"])([A-Za-z0-9_.:-]+)\1/g

  return listProductionSources(productionRoot).flatMap((absolutePath) => {
    const source = readFileSync(absolutePath, 'utf8')
    const calls: LiteralTranslationCall[] = []
    let match: RegExpExecArray | null

    while ((match = literalCallPattern.exec(source)) !== null) {
      const key = match[2]
      if (!key) continue

      calls.push({
        key,
        line: source.slice(0, match.index).split('\n').length,
        sourcePath: relative(projectRoot, absolutePath),
      })
    }

    return calls
  })
}

function flattenLeaves(
  value: unknown,
  prefix = '',
  leaves = new Map<string, unknown>()
): Map<string, unknown> {
  if (isRecord(value)) {
    for (const [key, child] of Object.entries(value)) {
      flattenLeaves(child, prefix ? `${prefix}.${key}` : key, leaves)
    }
  } else if (prefix) {
    leaves.set(prefix, value)
  }

  return leaves
}

function placeholders(value: string): string[] {
  return Array.from(
    value.matchAll(/:([A-Za-z_][A-Za-z0-9_]*)|\{([A-Za-z_][A-Za-z0-9_]*)\}/g),
    (match) => match[0]
  ).sort()
}

function duplicateJsonKeys(source: string): string[] {
  let cursor = 0
  const duplicates: string[] = []

  const skipWhitespace = (): void => {
    while (/\s/.test(source[cursor] ?? '')) cursor += 1
  }

  const fail = (message: string): never => {
    throw new Error(`${message} at character ${cursor}`)
  }

  const parseString = (): string => {
    skipWhitespace()
    if (source[cursor] !== '"') fail('Expected JSON string')

    const start = cursor
    cursor += 1

    while (cursor < source.length) {
      if (source[cursor] === '\\') {
        cursor += 2
        continue
      }

      if (source[cursor] === '"') {
        cursor += 1
        return JSON.parse(source.slice(start, cursor)) as string
      }

      cursor += 1
    }

    return fail('Unterminated JSON string')
  }

  const parseValue = (path: string[]): void => {
    skipWhitespace()

    if (source[cursor] === '{') {
      parseObject(path)
      return
    }

    if (source[cursor] === '[') {
      parseArray(path)
      return
    }

    if (source[cursor] === '"') {
      parseString()
      return
    }

    const start = cursor
    while (cursor < source.length && !/[,}\]]/.test(source[cursor] ?? '')) cursor += 1
    if (source.slice(start, cursor).trim().length === 0) fail('Expected JSON value')
  }

  const parseObject = (path: string[]): void => {
    cursor += 1
    skipWhitespace()

    const seenKeys = new Set<string>()
    if (source[cursor] === '}') {
      cursor += 1
      return
    }

    while (cursor < source.length) {
      const key = parseString()
      const keyPath = [...path, key]

      if (seenKeys.has(key)) duplicates.push(keyPath.join('.'))
      seenKeys.add(key)

      skipWhitespace()
      if (source[cursor] !== ':') fail('Expected colon after JSON key')
      cursor += 1
      parseValue(keyPath)
      skipWhitespace()

      if (source[cursor] === '}') {
        cursor += 1
        return
      }

      if (source[cursor] !== ',') fail('Expected comma between JSON properties')
      cursor += 1
    }

    fail('Unterminated JSON object')
  }

  const parseArray = (path: string[]): void => {
    cursor += 1
    skipWhitespace()

    if (source[cursor] === ']') {
      cursor += 1
      return
    }

    let index = 0
    while (cursor < source.length) {
      parseValue([...path, `[${index}]`])
      skipWhitespace()

      if (source[cursor] === ']') {
        cursor += 1
        return
      }

      if (source[cursor] !== ',') fail('Expected comma between JSON array values')
      cursor += 1
      index += 1
    }

    fail('Unterminated JSON array')
  }

  parseValue([])
  skipWhitespace()
  if (cursor !== source.length) fail('Unexpected trailing JSON content')

  return duplicates
}

describe('translation resource integrity', () => {
  it('resolves every literal production translation key in every locale', () => {
    const modulesByLocale = new Map(locales.map((locale) => [locale, readLanguageModules(locale)]))
    const missing = new Map<string, string>()

    for (const call of literalTranslationCalls()) {
      const [moduleName, ...restKeys] = call.key.split('.')
      if (!moduleName) continue

      for (const locale of locales) {
        const moduleTree = modulesByLocale.get(locale)?.get(moduleName)
        const resolvedValue = moduleTree
          ? resolveModuleValue(moduleTree, moduleName, restKeys)
          : undefined

        if (typeof resolvedValue !== 'string') {
          const localeKey = `${locale}: ${call.key}`
          if (!missing.has(localeKey)) {
            missing.set(localeKey, `${localeKey} (${call.sourcePath}:${call.line})`)
          }
        }
      }
    }

    const missingKeys = [...missing.values()]
    expect(missingKeys, missingKeys.join('\n')).toEqual([])
  })

  it('keeps locale files, leaf keys, value types, and placeholders in parity', () => {
    const englishFiles = languageFiles('en')
    const vietnameseFiles = languageFiles('vi')
    expect(englishFiles).toEqual(vietnameseFiles)

    const mismatches: string[] = []

    for (const fileName of englishFiles) {
      const english = flattenLeaves(
        JSON.parse(readFileSync(join(languageRoot, 'en', fileName), 'utf8')) as unknown
      )
      const vietnamese = flattenLeaves(
        JSON.parse(readFileSync(join(languageRoot, 'vi', fileName), 'utf8')) as unknown
      )

      const englishKeys = [...english.keys()].sort()
      const vietnameseKeys = [...vietnamese.keys()].sort()

      if (englishKeys.join('\n') !== vietnameseKeys.join('\n')) {
        for (const key of englishKeys.filter((candidateKey) => !vietnamese.has(candidateKey))) {
          mismatches.push(`${fileName}: missing vi key ${key}`)
        }
        for (const key of vietnameseKeys.filter((candidateKey) => !english.has(candidateKey))) {
          mismatches.push(`${fileName}: missing en key ${key}`)
        }
      }

      for (const key of englishKeys.filter((candidateKey) => vietnamese.has(candidateKey))) {
        const englishValue = english.get(key)
        const vietnameseValue = vietnamese.get(key)

        if (typeof englishValue !== typeof vietnameseValue) {
          mismatches.push(`${fileName}:${key}: value type mismatch`)
          continue
        }

        if (
          typeof englishValue === 'string' &&
          typeof vietnameseValue === 'string' &&
          placeholders(englishValue).join('\n') !== placeholders(vietnameseValue).join('\n')
        ) {
          mismatches.push(
            `${fileName}:${key}: en [${placeholders(englishValue).join(', ')}] != vi [${placeholders(vietnameseValue).join(', ')}]`
          )
        }
      }
    }

    expect(mismatches, mismatches.join('\n')).toEqual([])
  })

  it('rejects duplicate keys before JSON parsing can overwrite them', () => {
    const duplicates = locales.flatMap((locale) =>
      languageFiles(locale).flatMap((fileName) => {
        const source = readFileSync(join(languageRoot, locale, fileName), 'utf8')

        // Keep normal JSON syntax validation alongside the duplicate-aware scan.
        JSON.parse(source)

        return duplicateJsonKeys(source).map((key) => `${locale}/${fileName}: ${key}`)
      })
    )

    expect(duplicates, duplicates.join('\n')).toEqual([])
  })
})
