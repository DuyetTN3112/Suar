import type { AdminActionContext } from '#modules/admin/proficiency/actions/action_context'
import { BaseCommand } from '#modules/admin/proficiency/actions/commands/proficiency/base_command'
import type { AdminSkillRubricGateway } from '#modules/admin/proficiency/actions/ports/outbound/proficiency/admin_skill_rubric_gateway'

export default class PublishSkillRubricVersionCommand extends BaseCommand<
  { versionId: string },
  Record<string, unknown>
> {
  constructor(
    execCtx: AdminActionContext,
    private readonly skillRubric: AdminSkillRubricGateway
  ) {
    super(execCtx)
  }

  handle(input: { versionId: string }): Promise<Record<string, unknown>> {
    return this.skillRubric.publishVersion(input.versionId)
  }
}
