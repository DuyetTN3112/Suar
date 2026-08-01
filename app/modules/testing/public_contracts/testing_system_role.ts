import { readNonEmptyEnvironmentValue } from '#modules/testing/public_contracts/environment_values'

const TESTING_SYSTEM_ROLES = new Set<TestingSystemRole>([
  'registered_user',
  'system_admin',
  'superadmin',
])

export type TestingSystemRole = 'registered_user' | 'system_admin' | 'superadmin'

export function resolveTestingSystemRole(
  email: string,
  requestedSystemRole?: string,
  env: NodeJS.ProcessEnv = process.env
): TestingSystemRole {
  if (belongsToConfiguredAdminDomain(email, env)) {
    return 'superadmin'
  }

  return isTestingSystemRole(requestedSystemRole) ? requestedSystemRole : 'registered_user'
}

function belongsToConfiguredAdminDomain(email: string, env: NodeJS.ProcessEnv): boolean {
  const adminDomain = readNonEmptyEnvironmentValue(
    env,
    'SUAR_SYSTEM_ADMIN_EMAIL_DOMAIN'
  )?.toLowerCase()

  return Boolean(adminDomain && email.toLowerCase().endsWith(`@${adminDomain}`))
}

function isTestingSystemRole(value: string | undefined): value is TestingSystemRole {
  return value !== undefined && TESTING_SYSTEM_ROLES.has(value as TestingSystemRole)
}
