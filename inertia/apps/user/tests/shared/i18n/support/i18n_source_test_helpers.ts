import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

export function readSource(sourcePath: string): string {
  return readFileSync(resolve(process.cwd(), sourcePath), 'utf8')
}

export function readJson(path: string): unknown {
  return JSON.parse(readSource(path)) as unknown
}

export function flattenKeys(value: unknown, prefix = ''): string[] {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return prefix ? [prefix] : []
  }

  return Object.entries(value).flatMap(([key, child]) => {
    const nextPrefix = prefix ? `${prefix}.${key}` : key
    return flattenKeys(child, nextPrefix)
  })
}
