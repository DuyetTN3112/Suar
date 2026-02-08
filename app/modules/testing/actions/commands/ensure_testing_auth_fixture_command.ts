import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import type {
  TestingAccountV1,
  TestingAuthFixtureGateways,
  TestingAuthProvider,
} from '#modules/testing/actions/ports/outbound/testing_auth_fixture_gateways'
import type { TestingIdentityGenerator } from '#modules/testing/actions/ports/outbound/testing_identity_generator'
import {
  getMainTestingAccountConfig,
  isMainTestingAccountEmail,
  resolveTestingSystemRole,
} from '#modules/testing/public_contracts/test_database_safety'

export interface EnsureTestingAuthFixtureInput {
  email: string
  provider?: TestingAuthProvider
  requestedOrganizationId?: string
  requestedSystemRole?: string
}

export interface TestingAuthFixtureResult {
  account: TestingAccountV1
  organizationId: string | null
}

export class EnsureTestingAuthFixtureCommand {
  constructor(
    private readonly gateways: TestingAuthFixtureGateways,
    private readonly identityGenerator: TestingIdentityGenerator
  ) {}

  async execute(input: EnsureTestingAuthFixtureInput): Promise<TestingAuthFixtureResult> {
    const provider = input.provider ?? 'google'
    const systemRole = resolveTestingSystemRole(input.email, input.requestedSystemRole)
    let account = await this.gateways.user.ensureTestingAccountV1({
      email: input.email,
      username: input.email.split('@')[0] ?? input.email,
      systemRole,
      defaultAuthMethod: provider,
      ...(input.provider ? { requestedAuthMethod: input.provider } : {}),
    })

    await this.gateways.oauth.ensureTestingOAuthIdentityV1({
      userId: account.id,
      provider,
      providerId: `test-${account.id}`,
      email: account.email,
    })

    if (account.systemRole === 'registered_user') {
      account = await this.ensureRegisteredUserOrganization(account)
    }

    if (input.requestedOrganizationId) {
      await this.selectRequestedOrganization(account.id, input.requestedOrganizationId)
      account = {
        ...account,
        currentOrganizationId: input.requestedOrganizationId,
      }
    }

    return {
      account,
      organizationId: account.currentOrganizationId,
    }
  }

  private async ensureRegisteredUserOrganization(
    account: TestingAccountV1
  ): Promise<TestingAccountV1> {
    const mainTestingConfig = getMainTestingAccountConfig()
    if (mainTestingConfig && isMainTestingAccountEmail(account.email)) {
      account = await this.ensureCanonicalMainAccountOrganizations(account, mainTestingConfig)
    }

    const currentOrganization = account.currentOrganizationId
      ? await this.gateways.organization.findTestingOrganizationByIdV1(
          account.currentOrganizationId
        )
      : null
    if (currentOrganization) {
      return account
    }

    const firstMembership = await this.gateways.organization.findFirstApprovedMembershipV1(
      account.id
    )
    const organizationId =
      firstMembership?.organizationId ?? (await this.createFallbackWorkspace(account))
    await this.gateways.user.setCurrentOrganization(account.id, organizationId)

    return {
      ...account,
      currentOrganizationId: organizationId,
    }
  }

  private async ensureCanonicalMainAccountOrganizations(
    account: TestingAccountV1,
    config: NonNullable<ReturnType<typeof getMainTestingAccountConfig>>
  ): Promise<TestingAccountV1> {
    const primary = await this.gateways.organization.ensureTestingOrganizationV1({
      slug: config.primaryOrgSlug,
      name: config.primaryOrgName,
      description:
        'Canonical organization owned by the main test account for local and E2E testing.',
      ownerId: account.id,
      plan: 'professional',
    })
    const secondaryOwner = await this.gateways.user.ensureTestingAccountV1({
      email: config.secondaryOwnerEmail,
      username: config.secondaryOwnerUsername,
      systemRole: 'registered_user',
      defaultAuthMethod: 'google',
    })
    const secondary = await this.gateways.organization.ensureTestingOrganizationV1({
      slug: config.secondaryOrgSlug,
      name: config.secondaryOrgName,
      description: 'Canonical secondary organization where the main test account is a member.',
      ownerId: secondaryOwner.id,
      plan: 'starter',
    })

    await Promise.all([
      this.gateways.organization.ensureApprovedMembershipV1({
        organizationId: primary.id,
        userId: account.id,
        role: 'org_owner',
      }),
      this.gateways.organization.ensureApprovedMembershipV1({
        organizationId: secondary.id,
        userId: secondaryOwner.id,
        role: 'org_owner',
      }),
      this.gateways.organization.ensureApprovedMembershipV1({
        organizationId: secondary.id,
        userId: account.id,
        role: 'org_member',
        invitedBy: secondaryOwner.id,
      }),
    ])
    await this.gateways.user.setCurrentOrganization(account.id, primary.id)

    return {
      ...account,
      currentOrganizationId: primary.id,
    }
  }

  private async createFallbackWorkspace(account: TestingAccountV1): Promise<string> {
    const organization = await this.gateways.organization.ensureTestingOrganizationV1({
      slug: `org-${account.username}-${this.identityGenerator.newId().slice(0, 8)}`,
      name: `${account.username}'s Workspace`,
      ownerId: account.id,
      plan: 'starter',
    })
    await this.gateways.organization.ensureApprovedMembershipV1({
      organizationId: organization.id,
      userId: account.id,
      role: 'org_owner',
    })
    return organization.id
  }

  private async selectRequestedOrganization(userId: string, organizationId: string): Promise<void> {
    const organization =
      await this.gateways.organization.findTestingOrganizationByIdV1(organizationId)
    if (!organization) {
      throw new NotFoundException('Organization not found')
    }
    if (!(await this.gateways.organization.isApprovedMemberV1(organizationId, userId))) {
      throw new ForbiddenException('User is not an approved member of the requested organization')
    }
    await this.gateways.user.setCurrentOrganization(userId, organizationId)
  }
}
