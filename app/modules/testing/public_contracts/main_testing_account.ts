import { readRequiredEnvironmentValues } from '#modules/testing/public_contracts/environment_values'

const MAIN_TESTING_ACCOUNT_ENV_KEYS = [
  'SUAR_MAIN_TEST_EMAIL',
  'SUAR_MAIN_TEST_PRIMARY_ORG_NAME',
  'SUAR_MAIN_TEST_PRIMARY_ORG_SLUG',
  'SUAR_MAIN_TEST_SECONDARY_ORG_NAME',
  'SUAR_MAIN_TEST_SECONDARY_ORG_SLUG',
  'SUAR_MAIN_TEST_SECONDARY_OWNER_EMAIL',
  'SUAR_MAIN_TEST_SECONDARY_OWNER_USERNAME',
] as const

export interface MainTestingAccountConfig {
  email: string
  primaryOrgName: string
  primaryOrgSlug: string
  secondaryOrgName: string
  secondaryOrgSlug: string
  secondaryOwnerEmail: string
  secondaryOwnerUsername: string
}

export function getMainTestingAccountConfig(
  env: NodeJS.ProcessEnv = process.env
): MainTestingAccountConfig | null {
  const values = readRequiredEnvironmentValues(env, MAIN_TESTING_ACCOUNT_ENV_KEYS)
  if (!values) {
    return null
  }

  const [
    email,
    primaryOrgName,
    primaryOrgSlug,
    secondaryOrgName,
    secondaryOrgSlug,
    secondaryOwnerEmail,
    secondaryOwnerUsername,
  ] = values

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
  if (!email) {
    return false
  }

  const config = getMainTestingAccountConfig(env)
  return config !== null && email.toLowerCase() === config.email
}
