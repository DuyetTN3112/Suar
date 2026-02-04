const TEST_DATABASE_PATTERN = /(^test$|(^|[-_])test($|[-_])|_test$|-test$)/i

export function isSafeTestDatabaseName(value: string | undefined): boolean {
  return typeof value === 'string' && TEST_DATABASE_PATTERN.test(value)
}

export function shouldMountTestingRoutes(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env['NODE_ENV'] === 'test') {
    return true
  }

  const usesExplicitDevelopmentOverride =
    env['NODE_ENV'] === 'development' && env['ALLOW_DEV_TESTING_ROUTES'] === 'true'

  return usesExplicitDevelopmentOverride && isSafeTestDatabaseName(env['PG_DATABASE'])
}
