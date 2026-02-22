import { randomUUID } from 'node:crypto'

import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'

export interface EnsureTestingOAuthIdentityV1Input {
  userId: string
  provider: 'google' | 'github'
  providerId: string
  email: string
}

interface TestingOAuthIdentityRow {
  id: string
}

export class TestingOAuthIdentityGateway {
  async ensureTestingOAuthIdentityV1(
    input: EnsureTestingOAuthIdentityV1Input,
    trx?: TransactionClientContract
  ): Promise<void> {
    if (trx) {
      return this.ensureWithinTransaction(input, trx)
    }

    await db.transaction((writeTrx) => this.ensureWithinTransaction(input, writeTrx))
  }

  private async ensureWithinTransaction(
    input: EnsureTestingOAuthIdentityV1Input,
    trx: TransactionClientContract
  ): Promise<void> {
    await trx.rawQuery('SELECT pg_advisory_xact_lock(hashtext(?))', [
      `testing-oauth-identity:${input.userId}:${input.provider}`,
    ])

    const existing = (await trx
      .from('user_oauth_providers')
      .where('user_id', input.userId)
      .where('provider', input.provider)
      .orderBy('created_at', 'asc')
      .orderBy('id', 'asc')
      .first()) as TestingOAuthIdentityRow | undefined

    if (existing) {
      const [updated] = (await trx
        .from('user_oauth_providers')
        .where('id', existing.id)
        .update({
          email: input.email,
          access_token: null,
          refresh_token: null,
          updated_at: new Date(),
        })
        .returning(['id'])) as TestingOAuthIdentityRow[]

      if (!updated) {
        throw new InvariantViolationException('Testing OAuth identity could not be updated')
      }
      return
    }

    const [created] = (await trx
      .table('user_oauth_providers')
      .insert({
        id: randomUUID(),
        user_id: input.userId,
        provider: input.provider,
        provider_id: input.providerId,
        email: input.email,
        access_token: null,
        refresh_token: null,
      })
      .returning(['id'])) as TestingOAuthIdentityRow[]

    if (!created) {
      throw new InvariantViolationException('Testing OAuth identity could not be created')
    }
  }
}
