import ConflictException from '#modules/errors/public_contracts/conflict_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import { BaseCommand } from '#modules/skills/actions/base_command'
import type {
  SkillRubricLevelRecord,
  SkillRubricRepository,
} from '#modules/skills/actions/ports/outbound/rubric-and-proficiency/skill_rubric_repository'
import { SKILL_RUBRIC_VERSION_STATUSES } from '#modules/skills/public_contracts/skill_constants'

export interface UpsertSkillRubricLevelInput {
  versionId: string
  levelId: string
  payload: Record<string, unknown>
}

export default class UpsertSkillRubricLevelCommand extends BaseCommand<
  UpsertSkillRubricLevelInput,
  SkillRubricLevelRecord
> {
  constructor(private readonly repository: SkillRubricRepository) {
    super()
  }

  override async execute(input: UpsertSkillRubricLevelInput): Promise<SkillRubricLevelRecord> {
    const version = await this.repository.findRubricVersion(input.versionId)
    if (!version) {
      throw new NotFoundException('Rubric version not found')
    }
    if (version.status !== SKILL_RUBRIC_VERSION_STATUSES.DRAFT) {
      throw new ConflictException('Cannot modify a published rubric version')
    }
    return this.repository.createOrUpdateLevel(input.versionId, input.levelId, input.payload)
  }
}
