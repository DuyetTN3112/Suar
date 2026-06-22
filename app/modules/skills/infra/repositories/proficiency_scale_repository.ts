import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import ProficiencyLevel from '#modules/skills/infra/models/proficiency_level'
import ProficiencyScale from '#modules/skills/infra/models/proficiency_scale'

const resolveScaleQuery = (trx?: TransactionClientContract) =>
  trx ? ProficiencyScale.query({ client: trx }) : ProficiencyScale.query()

const resolveLevelQuery = (trx?: TransactionClientContract) =>
  trx ? ProficiencyLevel.query({ client: trx }) : ProficiencyLevel.query()

export const ProficiencyScaleRepository = {
  async getActiveScaleWithLevels(
    trx?: TransactionClientContract
  ): Promise<ProficiencyScale | null> {
    return resolveScaleQuery(trx)
      .where('is_active', true)
      .preload('levels', (query) => {
        void query.orderBy('ordinal', 'asc')
      })
      .first()
  },

  async findByCode(
    code: string,
    trx?: TransactionClientContract
  ): Promise<ProficiencyScale | null> {
    return resolveScaleQuery(trx).where('code', code).first()
  },

  async findLevelByCode(
    scaleId: string,
    code: string,
    trx?: TransactionClientContract
  ): Promise<ProficiencyLevel | null> {
    return resolveLevelQuery(trx).where('scale_id', scaleId).where('code', code).first()
  },

  async findLevelsByIds(
    ids: string[],
    trx?: TransactionClientContract
  ): Promise<ProficiencyLevel[]> {
    if (ids.length === 0) return []
    return resolveLevelQuery(trx).whereIn('id', ids)
  },

  async findLevelById(
    id: string,
    trx?: TransactionClientContract
  ): Promise<ProficiencyLevel | null> {
    return resolveLevelQuery(trx).where('id', id).first()
  },
}
