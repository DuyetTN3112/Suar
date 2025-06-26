const TEST_NAME_PATTERN = /(^test$|(^|[-_])test($|[-_])|_test$|-test$)/i

const isSafeTestName = (value: string | undefined): boolean => {
  return typeof value === 'string' && TEST_NAME_PATTERN.test(value)
}

const isUnsafeTestDatastoreAllowed = (): boolean => {
  return process.env.ALLOW_UNSAFE_TEST_DATASTORES === 'true'
}

const getMongoDatabaseName = (mongoUrl: string | undefined): string | null => {
  if (!mongoUrl) {
    return null
  }

  try {
    const parsed = new URL(mongoUrl)
    const pathname = parsed.pathname.replace(/^\/+/, '')
    return pathname || null
  } catch {
    return null
  }
}

export const applyTestDatastoreOverrides = (): void => {
  if (process.env.PG_TEST_DATABASE) {
    process.env.PG_DATABASE = process.env.PG_TEST_DATABASE
  }

  if (process.env.MONGODB_TEST_URL) {
    process.env.MONGODB_URL = process.env.MONGODB_TEST_URL
  }
}

export const assertSafeTestDatastores = async (): Promise<void> => {
  if (isUnsafeTestDatastoreAllowed()) {
    return
  }

  const envModule = await import('#start/env')
  const env = envModule.default

  const pgDatabase = env.get('PG_DATABASE', '')
  const mongoUrl = env.get('MONGODB_URL', '')
  const mongoDatabaseName = getMongoDatabaseName(mongoUrl)
  const issues: string[] = []

  if (!isSafeTestName(pgDatabase)) {
    issues.push(`PG_DATABASE="${pgDatabase}" is not a dedicated test database`)
  }

  if (mongoUrl && !isSafeTestName(mongoDatabaseName ?? undefined)) {
    issues.push(
      `MONGODB_URL points to "${mongoDatabaseName ?? 'unknown'}", not a dedicated test database`
    )
  }

  if (issues.length > 0) {
    throw new Error(
      [
        'Unsafe integration test datastore configuration detected.',
        ...issues,
        'Set PG_TEST_DATABASE and MONGODB_TEST_URL to dedicated test datastores before running integration tests.',
        'Or set ALLOW_UNSAFE_TEST_DATASTORES=true to intentionally run against the current configured datastores.',
      ].join(' ')
    )
  }
}
