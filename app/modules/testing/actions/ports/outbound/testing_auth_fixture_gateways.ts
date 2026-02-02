import type { TestingSystemRole } from '#modules/testing/public_contracts/testing_system_role'

export type TestingAuthProvider = 'google' | 'github'
export type TestingOrganizationRole = 'org_owner' | 'org_admin' | 'org_member'

export interface TestingAccountV1 {
  id: string
  username: string
  email: string
  systemRole: string
  currentOrganizationId: string | null
}

export interface TestingUserAccountGateway {
  ensureTestingAccountV1(input: {
    email: string
    username: string
    systemRole: TestingSystemRole
    defaultAuthMethod: TestingAuthProvider
    requestedAuthMethod?: TestingAuthProvider
  }): Promise<TestingAccountV1>

  setCurrentOrganization(userId: string, organizationId: string | null): Promise<void>

  findTestingAccountV1(userId: string): Promise<TestingAccountV1 | null>
}

export interface TestingOAuthIdentityGateway {
  ensureTestingOAuthIdentityV1(input: {
    userId: string
    provider: TestingAuthProvider
    providerId: string
    email: string
  }): Promise<void>
}

export interface TestingOrganizationFixtureV1 {
  id: string
  slug: string
  ownerId: string
  plan: string | null
}

export interface TestingOrganizationFixtureGateway {
  ensureTestingOrganizationV1(input: {
    slug: string
    name: string
    description?: string
    ownerId: string
    plan: string
  }): Promise<TestingOrganizationFixtureV1>

  ensureApprovedMembershipV1(input: {
    organizationId: string
    userId: string
    role: TestingOrganizationRole
    invitedBy?: string | null
  }): Promise<unknown>

  findTestingOrganizationByIdV1(
    organizationId: string
  ): Promise<TestingOrganizationFixtureV1 | null>

  findFirstApprovedMembershipV1(userId: string): Promise<{ organizationId: string } | null>

  isApprovedMemberV1(organizationId: string, userId: string): Promise<boolean>
}

export interface TestingAuthFixtureGateways {
  user: TestingUserAccountGateway
  oauth: TestingOAuthIdentityGateway
  organization: TestingOrganizationFixtureGateway
}
