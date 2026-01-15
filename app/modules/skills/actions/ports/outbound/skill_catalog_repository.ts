import type { SkillTransaction } from './skill_transaction.js'

export interface SkillDateValue {
  toISO(): string | null
  toISODate(): string | null
}

export interface SkillRecord {
  id: string
  category_code: string
  display_type: string
  skill_code: string
  skill_name: string
  description: string | null
  icon_url: string | null
  is_active: boolean
  sort_order: number
}

export interface SkillWithPublishedRubricsRecord extends SkillRecord {
  rubric_versions: Array<{ id: string }>
}

export interface CreateCustomSkillRecord {
  id: string
  skill_code: string
  skill_name: string
  category_code: string
  display_type: string
  description: string | null
  icon_url: string | null
  is_active: boolean
  sort_order: number
}

export interface ReactivateCustomSkillRecord {
  skill_name: string
  category_code: string
  display_type: string
}

export interface SkillCatalogRepository {
  listActive(): Promise<SkillRecord[]>
  listActiveWithPublishedRubrics(): Promise<SkillWithPublishedRubricsRecord[]>
  searchActiveWithPublishedRubrics(
    keyword: string,
    limit?: number
  ): Promise<SkillWithPublishedRubricsRecord[]>
  findActiveSkillIdsByCategoryCodes(categoryCodes: string[]): Promise<Array<{ id: string }>>
  findSkillIdsByCategoryCodes(categoryCodes: string[]): Promise<Array<{ id: string }>>
  getSpiderChartSkillIds(transaction?: SkillTransaction): Promise<Array<{ id: string }>>
  findActiveByIds(ids: string[], transaction?: SkillTransaction): Promise<SkillRecord[]>
  findByIds(ids: string[], transaction?: SkillTransaction): Promise<SkillRecord[]>
  findActiveByIdsWithPublishedRubrics(
    ids: string[],
    transaction?: SkillTransaction
  ): Promise<SkillWithPublishedRubricsRecord[]>
  findActiveByNormalizedName(
    name: string,
    transaction?: SkillTransaction
  ): Promise<SkillRecord | null>
  findInactiveByNormalizedName(
    name: string,
    transaction?: SkillTransaction
  ): Promise<SkillRecord[]>
  findByCode(skillCode: string, transaction?: SkillTransaction): Promise<SkillRecord | null>
  lockCustomSkillCatalogMutation(transaction: SkillTransaction): Promise<void>
  reactivateCustomSkill(
    skill: SkillRecord,
    payload: ReactivateCustomSkillRecord,
    transaction: SkillTransaction
  ): Promise<SkillRecord>
  nextCustomSkillSortOrder(transaction: SkillTransaction): Promise<number>
  createCustomSkill(
    payload: CreateCustomSkillRecord,
    transaction: SkillTransaction
  ): Promise<SkillRecord>
}
