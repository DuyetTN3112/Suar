import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const TEST_NAME_PATTERN = /(^test$|(^|[-_])test($|[-_])|_test$|-test$)/i

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

const readDotEnvValue = (key: string): string | undefined => {
  const envPath = path.join(PROJECT_ROOT, '.env')
  if (!fs.existsSync(envPath)) {
    return undefined
  }

  const content = fs.readFileSync(envPath, 'utf8')
  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) {
      continue
    }

    const separatorIndex = line.indexOf('=')
    if (separatorIndex <= 0) {
      continue
    }

    const parsedKey = line.slice(0, separatorIndex).trim()
    if (parsedKey !== key) {
      continue
    }

    const parsedValue = line.slice(separatorIndex + 1).trim()
    if (!parsedValue) {
      return undefined
    }

    if (
      (parsedValue.startsWith('"') && parsedValue.endsWith('"')) ||
      (parsedValue.startsWith("'") && parsedValue.endsWith("'"))
    ) {
      return parsedValue.slice(1, -1)
    }

    return parsedValue
  }

  return undefined
}

const isSafeTestName = (value: string | undefined): boolean => {
  return typeof value === 'string' && TEST_NAME_PATTERN.test(value)
}

const isUnsafeTestDatastoreAllowed = (): boolean => {
  return process.env.ALLOW_UNSAFE_TEST_DATASTORES === 'true'
}

export const applyTestDatastoreOverrides = (): void => {
  const pgTestDatabase = process.env.PG_TEST_DATABASE ?? readDotEnvValue('PG_TEST_DATABASE')

  if (pgTestDatabase) {
    process.env.PG_TEST_DATABASE = pgTestDatabase
    process.env.PG_DATABASE = pgTestDatabase
  }
}

export const assertSafeTestDatastores = async (): Promise<void> => {
  if (isUnsafeTestDatastoreAllowed()) {
    return
  }

  const envModule = await import('#start/env')
  const env = envModule.default

  const pgDatabase = process.env.PG_DATABASE ?? env.get('PG_DATABASE', '')
  const issues: string[] = []

  if (!isSafeTestName(pgDatabase)) {
    issues.push(`PG_DATABASE="${pgDatabase}" is not a dedicated test database`)
  }

  if (issues.length > 0) {
    throw new Error(
      [
        'Unsafe integration test datastore configuration detected.',
        ...issues,
        'Set PG_TEST_DATABASE to a dedicated test datastore before running integration tests.',
        'Or set ALLOW_UNSAFE_TEST_DATASTORES=true to intentionally run against the current configured datastores.',
      ].join(' ')
    )
  }
}
