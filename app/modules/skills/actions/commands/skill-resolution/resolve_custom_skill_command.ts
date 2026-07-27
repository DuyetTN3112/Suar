import { BaseCommand } from '#modules/skills/actions/base_command'
import type { SkillCatalogRepository } from '#modules/skills/actions/ports/outbound/skill_catalog_repository'
import type { SkillCryptography } from '#modules/skills/actions/ports/outbound/skill_cryptography'
import type { SkillTransaction } from '#modules/skills/actions/ports/outbound/skill_transaction'
import {
  buildCustomSkillCode,
  customSkillDescriptionSuffix,
  isHistoricalCustomSkillDescription,
  normalizeCustomSkillName,
} from '#modules/skills/domain/skill-catalog/custom_skill_catalog_policy'
import {
  type ResolvedCustomSkill,
  type ResolveCustomSkillInput,
} from '#modules/skills/public_contracts/custom_skill_catalog'
import { SKILL_DISPLAY_TYPES } from '#modules/skills/public_contracts/skill_constants'

function toResolvedSkill(skill: {
  id: string
  skill_name: string
  category_code: string
}): ResolvedCustomSkill {
  return {
    id: skill.id,
    skill_name: skill.skill_name,
    category_code: skill.category_code,
  }
}

export interface ResolveCustomSkillCommandInput {
  readonly input: ResolveCustomSkillInput
  readonly transaction: SkillTransaction
}

export default class ResolveCustomSkillCommand extends BaseCommand<
  ResolveCustomSkillCommandInput,
  ResolvedCustomSkill | null
> {
  constructor(
    private readonly repository: SkillCatalogRepository,
    private readonly cryptography: SkillCryptography
  ) {
    super()
  }

  execute(input: ResolveCustomSkillCommandInput): Promise<ResolvedCustomSkill | null>
  async execute(
    input: ResolveCustomSkillInput,
    transaction: SkillTransaction
  ): Promise<ResolvedCustomSkill | null>
  override async execute(
    inputOrCommandInput: ResolveCustomSkillInput | ResolveCustomSkillCommandInput,
    legacyTransaction?: SkillTransaction
  ): Promise<ResolvedCustomSkill | null> {
    let input: ResolveCustomSkillInput
    let transaction: SkillTransaction
    if ('input' in inputOrCommandInput) {
      input = inputOrCommandInput.input
      transaction = inputOrCommandInput.transaction
    } else {
      if (!legacyTransaction) {
        throw new TypeError('Custom skill resolution requires a transaction')
      }
      input = inputOrCommandInput
      transaction = legacyTransaction
    }

    const skillName = normalizeCustomSkillName(input.name)
    if (!skillName) {
      return null
    }

    const skillCode = buildCustomSkillCode(skillName, (value) => this.cryptography.digest(value))

    // The command owns catalog mutation ordering inside the caller's transaction.
    await this.repository.lockCustomSkillCatalogMutation(transaction)

    const deterministicCodeMatch = await this.repository.findByCode(skillCode, transaction)
    if (deterministicCodeMatch?.is_active) {
      return toResolvedSkill(deterministicCodeMatch)
    }

    const activeNameMatch = await this.repository.findActiveByNormalizedName(skillName, transaction)
    if (activeNameMatch) {
      return toResolvedSkill(activeNameMatch)
    }

    if (deterministicCodeMatch) {
      return this.reactivateHistoricalCustomSkill(
        deterministicCodeMatch,
        input,
        skillName,
        transaction
      )
    }

    const inactiveNameMatches = await this.repository.findInactiveByNormalizedName(
      skillName,
      transaction
    )
    if (
      inactiveNameMatches.some((skill) => !isHistoricalCustomSkillDescription(skill.description))
    ) {
      return null
    }

    const historicalNameMatch = inactiveNameMatches.find((skill) =>
      isHistoricalCustomSkillDescription(skill.description)
    )
    if (historicalNameMatch) {
      return this.reactivateHistoricalCustomSkill(
        historicalNameMatch,
        input,
        skillName,
        transaction
      )
    }

    const descriptionSuffix = customSkillDescriptionSuffix(input.source)
    const created = await this.repository.createCustomSkill(
      {
        id: this.cryptography.nextId(),
        skill_code: skillCode,
        skill_name: skillName,
        category_code: input.categoryCode,
        display_type: SKILL_DISPLAY_TYPES.SPIDER_CHART,
        description: `${skillName}${descriptionSuffix}`,
        icon_url: null,
        is_active: true,
        sort_order: await this.repository.nextCustomSkillSortOrder(transaction),
      },
      transaction
    )

    return toResolvedSkill(created)
  }

  private async reactivateHistoricalCustomSkill(
    skill: Parameters<SkillCatalogRepository['reactivateCustomSkill']>[0],
    input: ResolveCustomSkillInput,
    skillName: string,
    transaction: SkillTransaction
  ): Promise<ResolvedCustomSkill | null> {
    if (!isHistoricalCustomSkillDescription(skill.description)) {
      return null
    }

    const reactivated = await this.repository.reactivateCustomSkill(
      skill,
      {
        skill_name: skillName,
        category_code: input.categoryCode,
        display_type: SKILL_DISPLAY_TYPES.SPIDER_CHART,
      },
      transaction
    )

    return toResolvedSkill(reactivated)
  }
}
