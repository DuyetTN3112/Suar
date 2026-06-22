import { randomUUID } from 'node:crypto'

import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'

export type TestingOrganizationRoleV1 = 'org_owner' | 'org_admin' | 'org_member'

export interface EnsureTestingOrganizationV1Input {
  slug: string
  name: string
  description?: string | null
  ownerId: string
  plan: string | null
}

export interface EnsureApprovedMembershipV1Input {
  organizationId: string
  userId: string
  role: TestingOrganizationRoleV1
  invitedBy?: string | null
}

export interface TestingOrganizationV1 {
  id: string
  slug: string
  ownerId: string
  plan: string | null
}

export interface TestingOrganizationMembershipV1 {
  organizationId: string
  userId: string
  role: TestingOrganizationRoleV1
  status: 'approved'
  invitedBy: string | null
}

export interface TestingApprovedMembershipReferenceV1 {
  organizationId: string
}

interface TestingOrganizationRow {
  id: string
  slug: string
  owner_id: string
  plan: string | null
}

interface TestingOrganizationMembershipRow {
  organization_id: string
  user_id: string
  org_role: TestingOrganizationRoleV1
  status: 'approved'
  invited_by: string | null
}

function toOrganization(row: TestingOrganizationRow): TestingOrganizationV1 {
  return {
    id: row.id,
    slug: row.slug,
    ownerId: row.owner_id,
    plan: row.plan,
  }
}

function toMembership(row: TestingOrganizationMembershipRow): TestingOrganizationMembershipV1 {
  return {
    organizationId: row.organization_id,
    userId: row.user_id,
    role: row.org_role,
    status: row.status,
    invitedBy: row.invited_by,
  }
}

/**
 * Organizations-owned persistence adapter for test-environment orchestration.
 *
 * It intentionally does not implement or import a Testing-module port. The
 * composition root can bind it structurally to the consumer-owned contract.
 */
export class TestingOrganizationGateway {
  async ensureTestingOrganizationV1(
    input: EnsureTestingOrganizationV1Input,
    trx?: TransactionClientContract
  ): Promise<TestingOrganizationV1> {
    const client = trx ?? db
    await client
      .table('organizations')
      .insert({
        id: randomUUID(),
        slug: input.slug,
        name: input.name,
        description: input.description ?? null,
        owner_id: input.ownerId,
        plan: input.plan,
      })
      .onConflict('slug')
      .ignore()

    const updates = {
      name: input.name,
      owner_id: input.ownerId,
      plan: input.plan,
      deleted_at: null,
      updated_at: new Date(),
      ...(input.description !== undefined ? { description: input.description } : {}),
    }
    const [row] = (await client
      .from('organizations')
      .where('slug', input.slug)
      .update(updates)
      .returning(['id', 'slug', 'owner_id', 'plan'])) as TestingOrganizationRow[]

    if (!row) {
      throw new InvariantViolationException('Testing organization could not be ensured')
    }

    return toOrganization(row)
  }

  async ensureApprovedMembershipV1(
    input: EnsureApprovedMembershipV1Input,
    trx?: TransactionClientContract
  ): Promise<TestingOrganizationMembershipV1> {
    const client = trx ?? db
    const invitedBy = input.invitedBy ?? null

    const approvedValues = {
      org_role: input.role,
      status: 'approved' as const,
      invited_by: invitedBy,
      updated_at: new Date(),
    }

    // The application owns the membership transition. Update first so an
    // existing pending row is promoted without relying on a status-bearing
    // database uniqueness index as a business rule. A concurrent creator may
    // still win the insert race; its unique violation is safely re-read below.
    const updated = await client
      .from('organization_users')
      .where('organization_id', input.organizationId)
      .where('user_id', input.userId)
      .update(approvedValues)

    if (Number(updated) === 0) {
      try {
        await client.table('organization_users').insert({
          organization_id: input.organizationId,
          user_id: input.userId,
          ...approvedValues,
        })
      } catch (error) {
        const code = (error as { code?: unknown } | null)?.code
        if (code !== '23505') throw error
      }
    }

    const row = (await client
      .from('organization_users')
      .where('organization_id', input.organizationId)
      .where('user_id', input.userId)
      .select(['organization_id', 'user_id', 'org_role', 'status', 'invited_by'])
      .first()) as TestingOrganizationMembershipRow | undefined

    if (!row) {
      throw new InvariantViolationException('Testing organization membership could not be ensured')
    }

    return toMembership(row)
  }

  async findTestingOrganizationByIdV1(
    organizationId: string,
    trx?: TransactionClientContract
  ): Promise<TestingOrganizationV1 | null> {
    const client = trx ?? db
    const row = (await client
      .from('organizations')
      .where('id', organizationId)
      .whereNull('deleted_at')
      .select(['id', 'slug', 'owner_id', 'plan'])
      .first()) as TestingOrganizationRow | undefined

    return row ? toOrganization(row) : null
  }

  async findTestingOrganizationBySlugV1(
    slug: string,
    trx?: TransactionClientContract
  ): Promise<TestingOrganizationV1 | null> {
    const client = trx ?? db
    const row = (await client
      .from('organizations')
      .where('slug', slug)
      .whereNull('deleted_at')
      .select(['id', 'slug', 'owner_id', 'plan'])
      .first()) as TestingOrganizationRow | undefined

    return row ? toOrganization(row) : null
  }

  async findFirstApprovedMembershipV1(
    userId: string,
    trx?: TransactionClientContract
  ): Promise<TestingApprovedMembershipReferenceV1 | null> {
    const client = trx ?? db
    const row = (await client
      .from('organization_users as ou')
      .join('organizations as o', 'o.id', 'ou.organization_id')
      .where('ou.user_id', userId)
      .where('ou.status', 'approved')
      .whereNull('o.deleted_at')
      .orderBy('ou.created_at', 'asc')
      .orderBy('ou.organization_id', 'asc')
      .select('ou.organization_id')
      .first()) as { organization_id: string } | undefined

    return row ? { organizationId: row.organization_id } : null
  }

  async isApprovedMemberV1(
    organizationId: string,
    userId: string,
    trx?: TransactionClientContract
  ): Promise<boolean> {
    const client = trx ?? db
    const row = (await client
      .from('organization_users as ou')
      .join('organizations as o', 'o.id', 'ou.organization_id')
      .where('ou.organization_id', organizationId)
      .where('ou.user_id', userId)
      .where('ou.status', 'approved')
      .whereNull('o.deleted_at')
      .select('ou.organization_id')
      .first()) as { organization_id: string } | undefined

    return row !== undefined
  }
}
