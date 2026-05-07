import type { AdminActionContext } from '#modules/admin/proficiency/actions/action_context'
import type CreateSkillRubricDraftCommand from '#modules/admin/proficiency/actions/commands/proficiency/create_skill_rubric_draft_command'
import type PublishSkillRubricVersionCommand from '#modules/admin/proficiency/actions/commands/proficiency/publish_skill_rubric_version_command'
import type UpsertSkillRubricLevelCommand from '#modules/admin/proficiency/actions/commands/proficiency/upsert_skill_rubric_level_command'
import type GetProficiencyScaleQuery from '#modules/admin/proficiency/actions/queries/proficiency/get_proficiency_scale_query'
import type GetSkillRubricQuery from '#modules/admin/proficiency/actions/queries/proficiency/get_skill_rubric_query'
import type ListProficiencyCatalogQuery from '#modules/admin/proficiency/actions/queries/proficiency/list_proficiency_catalog_query'

export abstract class AdminProficiencyActionFactory {
  abstract makeListProficiencyCatalogQuery(
    execCtx: AdminActionContext
  ): ListProficiencyCatalogQuery

  abstract makeGetProficiencyScaleQuery(
    execCtx: AdminActionContext
  ): GetProficiencyScaleQuery

  abstract makeGetSkillRubricQuery(execCtx: AdminActionContext): GetSkillRubricQuery

  abstract makeCreateSkillRubricDraftCommand(
    execCtx: AdminActionContext
  ): CreateSkillRubricDraftCommand

  abstract makeUpsertSkillRubricLevelCommand(
    execCtx: AdminActionContext
  ): UpsertSkillRubricLevelCommand

  abstract makePublishSkillRubricVersionCommand(
    execCtx: AdminActionContext
  ): PublishSkillRubricVersionCommand
}
