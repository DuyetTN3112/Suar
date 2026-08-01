import ConflictException from '#modules/errors/public_contracts/conflict_exception'
import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import ValidationException from '#modules/errors/public_contracts/validation_exception'
import type { ProficiencyScaleRepository } from '#modules/skills/actions/ports/outbound/proficiency_scale_repository'
import type {
  SkillRubricRepository,
  SkillRubricVersionRecord,
} from '#modules/skills/actions/ports/outbound/skill_rubric_repository'
import type { SkillTransactionRunner } from '#modules/skills/actions/ports/outbound/skill_transaction'
import { SKILL_RUBRIC_VERSION_STATUSES } from '#modules/skills/public_contracts/skill_constants'

export default class PublishSkillRubricVersionCommand {
  constructor(
    private readonly repository: SkillRubricRepository,
    private readonly proficiencyScales: ProficiencyScaleRepository,
    private readonly transactions: SkillTransactionRunner
  ) {}

  execute(versionId: string): Promise<SkillRubricVersionRecord> {
    return this.transactions.run(async (transaction) => {
      const version = await this.repository.findRubricVersion(versionId, transaction)
      if (!version) {
        throw new NotFoundException('Rubric version not found')
      }
      if (version.status !== SKILL_RUBRIC_VERSION_STATUSES.DRAFT) {
        throw new ConflictException('Version is not in draft status')
      }

      const activeScale = await this.proficiencyScales.getActiveScaleWithLevels(transaction)
      if (!activeScale) {
        throw new InvariantViolationException(
          'Publishing a skill rubric requires an active default proficiency scale',
          { details: { versionId } }
        )
      }

      const definedLevels = await this.repository.findRubricLevelsByVersion(versionId, transaction)
      const definedLevelIds = new Set(definedLevels.map((level) => level.proficiency_level_id))
      const missingLevels = activeScale.levels.filter((level) => !definedLevelIds.has(level.id))
      if (missingLevels.length > 0) {
        throw new ValidationException(
          `Incomplete rubric: missing definitions for levels [${missingLevels.map((level) => level.code).join(', ')}]`
        )
      }

      const effectiveAt = new Date().toISOString()
      const published = await this.repository.publishVersion(versionId, effectiveAt, transaction)
      if (!published) {
        throw new InvariantViolationException('Rubric version disappeared during publication')
      }
      await this.repository.archivePublishedVersions(
        version.skill_id,
        version.id,
        effectiveAt,
        transaction
      )
      return published
    })
  }
}
