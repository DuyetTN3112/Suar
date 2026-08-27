import { randomUUID } from 'node:crypto'

import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import User from '#modules/users/infra/models/profile/user'

export interface EnsureTestingAccountV1Input {
  email: string
  username: string
  systemRole: 'registered_user' | 'system_admin' | 'superadmin'
  defaultAuthMethod: 'google' | 'github'
  requestedAuthMethod?: 'google' | 'github'
}

export interface TestingUserAccountV1 {
  id: string
  username: string
  email: string
  systemRole: string
  currentOrganizationId: string | null
}

interface TestingUserRow {
  id: string
  username: string
  email: string
  system_role: string
  current_organization_id: string | null
}

function toAccount(row: TestingUserRow): TestingUserAccountV1 {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    systemRole: row.system_role,
    currentOrganizationId: row.current_organization_id,
  }
}

export class TestingUserAccountGateway {
  async ensureTestingAccountV1(
    input: EnsureTestingAccountV1Input,
    trx?: TransactionClientContract
  ): Promise<TestingUserAccountV1> {
    const client = trx ?? db
    await client
      .table('users')
      .insert({
        id: randomUUID(),
        email: input.email,
        username: input.username,
        status: 'active',
        system_role: input.systemRole,
        auth_method: input.requestedAuthMethod ?? input.defaultAuthMethod,
      })
      .onConflict()
      .ignore()

    const updates = {
      system_role: input.systemRole,
      ...(input.requestedAuthMethod ? { auth_method: input.requestedAuthMethod } : {}),
      updated_at: new Date(),
    }
    const [row] = (await client
      .from('users')
      .where('email', input.email)
      .whereNull('deleted_at')
      .update(updates)
      .returning([
        'id',
        'username',
        'email',
        'system_role',
        'current_organization_id',
      ])) as TestingUserRow[]

    if (!row) {
      throw new InvariantViolationException('Testing user account could not be ensured')
    }
    return toAccount(row)
  }

  async setCurrentOrganization(
    userId: string,
    organizationId: string | null,
    trx?: TransactionClientContract
  ): Promise<void> {
    const client = trx ?? db
    await client.from('users').where('id', userId).whereNull('deleted_at').update({
      current_organization_id: organizationId,
      updated_at: new Date(),
    })
  }

  async findTestingAccountV1(
    userId: string,
    trx?: TransactionClientContract
  ): Promise<TestingUserAccountV1 | null> {
    const client = trx ?? db
    const row = (await client
      .from('users')
      .where('id', userId)
      .whereNull('deleted_at')
      .select(['id', 'username', 'email', 'system_role', 'current_organization_id'])
      .first()) as TestingUserRow | undefined

    return row ? toAccount(row) : null
  }

  async findAuthUserModel(userId: string): Promise<User | null> {
    return User.query().where('id', userId).whereNull('deleted_at').first()
  }
}
