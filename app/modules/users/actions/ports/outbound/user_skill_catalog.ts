import type { UserTransaction } from './user_transaction.js'

export type ResolveUserSkillCatalogInput =
  | { skillId: string }
  | { customSkillName: string; categoryCode: string }

export interface ResolvedUserSkillCatalogEntry {
  id: string
  skill_name: string
  category_code: string
}

export interface UserSkillProfileFact {
  id: string
  skill_name: string
  skill_code: string
  category_code: string
  display_type: string
  is_active: boolean
}

/**
 * Users-owned consumer port for the Skills catalog.
 *
 * Canonical naming, code generation, activation, and ordering rules remain
 * owned by Skills. The transaction is forwarded so catalog and user-skill
 * writes commit atomically.
 */
export interface UserSkillCatalog {
  listActiveSkills(): Promise<UserSkillProfileFact[]>

  resolveUserDeclaredSkill(
    input: ResolveUserSkillCatalogInput,
    trx: UserTransaction
  ): Promise<ResolvedUserSkillCatalogEntry | null>

  findProfileFactsByIds(
    skillIds: string[],
    trx?: UserTransaction
  ): Promise<UserSkillProfileFact[]>

  resolveProficiencyLevelId(
    levelCode: string,
    trx?: UserTransaction
  ): Promise<string | null>
}
