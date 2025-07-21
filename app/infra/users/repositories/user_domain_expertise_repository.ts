import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import UserDomainExpertise from '#models/user_domain_expertise'
import type { DatabaseId } from '#types/database'

export default class UserDomainExpertiseRepository {
  private readonly __instanceMarker = true

  static {
    void new UserDomainExpertiseRepository().__instanceMarker
  }

  private static baseQuery(trx?: TransactionClientContract) {
    return trx ? UserDomainExpertise.query({ client: trx }) : UserDomainExpertise.query()
  }

  static async findByUser(
    userId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<UserDomainExpertise | null> {
    return this.baseQuery(trx).where('user_id', userId).first()
  }

  static async create(
    data: Partial<UserDomainExpertise>,
    trx?: TransactionClientContract
  ): Promise<UserDomainExpertise> {
    return UserDomainExpertise.create(data, trx ? { client: trx } : undefined)
  }

  static async save(
    expertise: UserDomainExpertise,
    trx?: TransactionClientContract
  ): Promise<UserDomainExpertise> {
    if (trx) {
      expertise.useTransaction(trx)
    }
    await expertise.save()
    return expertise
  }
}
