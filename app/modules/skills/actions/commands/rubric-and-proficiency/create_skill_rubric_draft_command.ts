import ConflictException from '#modules/errors/public_contracts/conflict_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import { BaseCommand } from '#modules/skills/actions/base_command'
import type {
  SkillRubricRepository,
  SkillRubricVersionRecord,
} from '#modules/skills/actions/ports/outbound/rubric-and-proficiency/skill_rubric_repository'

export interface CreateSkillRubricDraftInput {
  skillId: string
  createdBy?: string
  changeSummary?: string
}

export default class CreateSkillRubricDraftCommand extends BaseCommand<
  CreateSkillRubricDraftInput,
  SkillRubricVersionRecord
> {
  constructor(private readonly repository: SkillRubricRepository) {
    super()
  }

  async execute(input: CreateSkillRubricDraftInput): Promise<SkillRubricVersionRecord> {
    const skill = await this.repository.findSkill(input.skillId)
    if (!skill) {
      throw new NotFoundException('Skill not found')
    }

    const existingDraft = await this.repository.findDraftBySkill(input.skillId)
    if (existingDraft) {
      throw new ConflictException('Draft version already exists for this skill')
    }

    const nextVersion = (await this.repository.findMaxVersionBySkill(input.skillId)) + 1
    return this.repository.createDraftVersion(
      input.skillId,
      nextVersion,
      input.createdBy,
      input.changeSummary
    )
  }
}
