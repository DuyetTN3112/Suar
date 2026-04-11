const TEST_DATABASE_PATTERN = /(^test$|(^|[-_])test($|[-_])|_test$|-test$)/i

export type TestingSystemRole = 'registered_user' | 'system_admin' | 'superadmin'

export interface MainTestingAccountConfig {
  email: string
  primaryOrgName: string
  primaryOrgSlug: string
  secondaryOrgName: string
  secondaryOrgSlug: string
  secondaryOwnerEmail: string
  secondaryOwnerUsername: string
}

export function isSafeTestDatabaseName(value: string | undefined): boolean {
  return typeof value === 'string' && TEST_DATABASE_PATTERN.test(value)
}

function readNonEmptyEnv(env: NodeJS.ProcessEnv, key: string): string | undefined {
  const value = env[key]?.trim()
  return value && value.length > 0 ? value : undefined
}

export function getMainTestingAccountConfig(
  env: NodeJS.ProcessEnv = process.env
): MainTestingAccountConfig | null {
  const email = readNonEmptyEnv(env, 'SUAR_MAIN_TEST_EMAIL')
  const primaryOrgName = readNonEmptyEnv(env, 'SUAR_MAIN_TEST_PRIMARY_ORG_NAME')
  const primaryOrgSlug = readNonEmptyEnv(env, 'SUAR_MAIN_TEST_PRIMARY_ORG_SLUG')
  const secondaryOrgName = readNonEmptyEnv(env, 'SUAR_MAIN_TEST_SECONDARY_ORG_NAME')
  const secondaryOrgSlug = readNonEmptyEnv(env, 'SUAR_MAIN_TEST_SECONDARY_ORG_SLUG')
  const secondaryOwnerEmail = readNonEmptyEnv(env, 'SUAR_MAIN_TEST_SECONDARY_OWNER_EMAIL')
  const secondaryOwnerUsername = readNonEmptyEnv(
    env,
    'SUAR_MAIN_TEST_SECONDARY_OWNER_USERNAME'
  )

  if (
    !email ||
    !primaryOrgName ||
    !primaryOrgSlug ||
    !secondaryOrgName ||
    !secondaryOrgSlug ||
    !secondaryOwnerEmail ||
    !secondaryOwnerUsername
  ) {
    return null
  }

  return {
    email: email.toLowerCase(),
    primaryOrgName,
    primaryOrgSlug,
    secondaryOrgName,
    secondaryOrgSlug,
    secondaryOwnerEmail: secondaryOwnerEmail.toLowerCase(),
    secondaryOwnerUsername,
  }
}

export function isMainTestingAccountEmail(
  email: string | null,
  env: NodeJS.ProcessEnv = process.env
): boolean {
  const config = getMainTestingAccountConfig(env)
  return Boolean(config && email?.toLowerCase() === config.email)
}

export function resolveTestingSystemRole(
  email: string,
  requestedSystemRole?: string,
  env: NodeJS.ProcessEnv = process.env
): TestingSystemRole {
  const adminDomain = readNonEmptyEnv(env, 'SUAR_SYSTEM_ADMIN_EMAIL_DOMAIN')?.toLowerCase()
  if (adminDomain && email.toLowerCase().endsWith(`@${adminDomain}`)) {
    return 'superadmin'
  }

  if (
    requestedSystemRole === 'registered_user' ||
    requestedSystemRole === 'system_admin' ||
    requestedSystemRole === 'superadmin'
  ) {
    return requestedSystemRole
  }

  return 'registered_user'
}

export function shouldMountTestingRoutes(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env['NODE_ENV'] === 'test') {
    return true
  }

  return (
    env['NODE_ENV'] === 'development' &&
    env['ALLOW_DEV_TESTING_ROUTES'] === 'true' &&
    isSafeTestDatabaseName(env['PG_DATABASE'])
  )
}
