import type { AdminActionContext } from '#modules/admin/proficiency/actions/action_context'
import { BaseCommand } from '#modules/admin/proficiency/actions/command/base_command'
import type { AdminSkillRubricGateway } from '#modules/admin/proficiency/actions/ports/outbound/admin_skill_rubric_gateway'

export interface UpsertSkillRubricLevelInput {
  versionId: string
  levelId: string
  payload: Record<string, unknown>
}

export default class UpsertSkillRubricLevelCommand extends BaseCommand<
  UpsertSkillRubricLevelInput,
  Record<string, unknown>
> {
  constructor(
    execCtx: AdminActionContext,
    private readonly skillRubric: AdminSkillRubricGateway
  ) {
    super(execCtx)
  }

  handle(input: UpsertSkillRubricLevelInput): Promise<Record<string, unknown>> {
    return this.skillRubric.addOrUpdateLevel(
      input.versionId,
      input.levelId,
      input.payload
    )
  }
}
