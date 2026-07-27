import { BaseCommand } from '#modules/skills/actions/base_command'
import type ResolveCustomSkillCommand from '#modules/skills/actions/commands/skill-resolution/resolve_custom_skill_command'
import type { SkillCatalogRepository } from '#modules/skills/actions/ports/outbound/skill_catalog_repository'
import type { SkillTransaction } from '#modules/skills/actions/ports/outbound/skill_transaction'
import { CUSTOM_SKILL_CATALOG_SOURCES } from '#modules/skills/public_contracts/custom_skill_catalog'
import type {
  ResolvedUserDeclaredSkill,
  ResolveUserDeclaredSkillInput,
} from '#modules/skills/public_contracts/user_declared_skill_catalog'

function toResolvedSkill(skill: {
  id: string
  skill_name: string
  category_code: string
}): ResolvedUserDeclaredSkill {
  return {
    id: skill.id,
    skill_name: skill.skill_name,
    category_code: skill.category_code,
  }
}

export interface ResolveUserDeclaredSkillCommandInput {
  readonly input: ResolveUserDeclaredSkillInput
  readonly transaction: SkillTransaction
}

export default class ResolveUserDeclaredSkillCommand extends BaseCommand<
  ResolveUserDeclaredSkillCommandInput,
  ResolvedUserDeclaredSkill | null
> {
  constructor(
    private readonly repository: SkillCatalogRepository,
    private readonly resolveCustomSkill: Pick<ResolveCustomSkillCommand, 'execute'>
  ) {
    super()
  }

  execute(input: ResolveUserDeclaredSkillCommandInput): Promise<ResolvedUserDeclaredSkill | null>
  async execute(
    input: ResolveUserDeclaredSkillInput,
    transaction: SkillTransaction
  ): Promise<ResolvedUserDeclaredSkill | null>
  override async execute(
    inputOrCommandInput: ResolveUserDeclaredSkillInput | ResolveUserDeclaredSkillCommandInput,
    legacyTransaction?: SkillTransaction
  ): Promise<ResolvedUserDeclaredSkill | null> {
    let input: ResolveUserDeclaredSkillInput
    let transaction: SkillTransaction
    if ('input' in inputOrCommandInput) {
      input = inputOrCommandInput.input
      transaction = inputOrCommandInput.transaction
    } else {
      if (!legacyTransaction) {
        throw new TypeError('User-declared skill resolution requires a transaction')
      }
      input = inputOrCommandInput
      transaction = legacyTransaction
    }

    if ('skillId' in input) {
      const [skill] = await this.repository.findActiveByIds([input.skillId], transaction)
      return skill ? toResolvedSkill(skill) : null
    }

    return this.resolveCustomSkill.execute(
      {
        name: input.customSkillName,
        categoryCode: input.categoryCode,
        source: CUSTOM_SKILL_CATALOG_SOURCES.USER_PROFILE,
      },
      transaction
    )
  }
}
