import type { AdminActionContext } from '#modules/admin/proficiency/actions/action_context'
import { BaseCommand } from '#modules/admin/proficiency/actions/commands/proficiency/base_command'
import type { AdminSkillRubricGateway } from '#modules/admin/proficiency/actions/ports/outbound/proficiency/admin_skill_rubric_gateway'

export interface CreateSkillRubricDraftInput {
  skillId: string
  actorId?: string
  changeSummary?: string
}

export default class CreateSkillRubricDraftCommand extends BaseCommand<
  CreateSkillRubricDraftInput,
  Record<string, unknown>
> {
  constructor(
    execCtx: AdminActionContext,
    private readonly skillRubric: AdminSkillRubricGateway
  ) {
    super(execCtx)
  }

  handle(input: CreateSkillRubricDraftInput): Promise<Record<string, unknown>> {
    return this.skillRubric.createDraftVersion(
      input.skillId,
      input.actorId,
      input.changeSummary
    )
  }
}
