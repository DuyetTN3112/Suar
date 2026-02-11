import {
  createSkillRubricDraftCommand,
  getActiveProficiencyScaleQuery,
  getPublishedSkillRubricVersionQuery,
  publishSkillRubricVersionCommand,
  resolveSkillQuery,
  skillCatalogRepository,
  upsertSkillRubricLevelCommand,
} from '#composition/skills_application_composition'
import { AdminSkillRubricGateway } from '#modules/admin/proficiency/actions/ports/outbound/admin_skill_rubric_gateway'
import GetActiveSkillsQuery from '#modules/skills/actions/queries/get_active_skills_query'

export class SkillsAdminSkillRubricAdapter extends AdminSkillRubricGateway {
  getActiveScale() {
    return getActiveProficiencyScaleQuery.execute()
  }

  async listActiveSkills() {
    const skills = await GetActiveSkillsQuery.execute({
      listActiveSkills: () => skillCatalogRepository.listActive(),
    })
    return skills.map((skill) => ({
      id: skill.id,
      skill_name: skill.skill_name,
      category_code: skill.category_code,
      is_active: skill.is_active,
    }))
  }

  resolveSkill(skillIdOrCode: string) {
    return resolveSkillQuery.execute(skillIdOrCode)
  }

  getPublishedVersion(skillId: string) {
    return getPublishedSkillRubricVersionQuery.execute(skillId)
  }

  async createDraftVersion(
    skillId: string,
    actorId?: string,
    changeSummary?: string
  ): Promise<Record<string, unknown>> {
    const draft = await createSkillRubricDraftCommand.execute({
      skillId,
      ...(actorId === undefined ? {} : { createdBy: actorId }),
      ...(changeSummary === undefined ? {} : { changeSummary }),
    })
    return {
      id: draft.id,
      skill_id: draft.skill_id,
      version: draft.version,
      status: draft.status,
      effective_from: draft.effective_from,
      effective_to: draft.effective_to,
      created_by: draft.created_by,
      change_summary: draft.change_summary,
      created_at: draft.created_at,
      updated_at: draft.updated_at,
    }
  }

  async addOrUpdateLevel(
    versionId: string,
    levelId: string,
    payload: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const level = await upsertSkillRubricLevelCommand.execute({
      versionId,
      levelId,
      payload,
    })
    return {
      id: level.id,
      rubric_version_id: level.rubric_version_id,
      proficiency_level_id: level.proficiency_level_id,
      summary: level.summary,
      knowledge_expectations: level.knowledge_expectations,
      observable_behaviors: level.observable_behaviors,
      independence_expectations: level.independence_expectations,
      complexity_expectations: level.complexity_expectations,
      impact_scope_expectations: level.impact_scope_expectations,
      positive_examples: level.positive_examples,
      negative_examples: level.negative_examples,
      evidence_guidance: level.evidence_guidance,
      expected_execution: level.expected_execution,
      autonomy_descriptor: level.autonomy_descriptor,
      complexity_descriptor: level.complexity_descriptor,
      quality_descriptor: level.quality_descriptor,
      collaboration_descriptor: level.collaboration_descriptor,
      ceiling_guidance: level.ceiling_guidance,
    }
  }

  async publishVersion(versionId: string): Promise<Record<string, unknown>> {
    const version = await publishSkillRubricVersionCommand.execute(versionId)
    return {
      id: version.id,
      skill_id: version.skill_id,
      version: version.version,
      status: version.status,
      effective_from: version.effective_from,
      effective_to: version.effective_to,
      created_by: version.created_by,
      change_summary: version.change_summary,
      created_at: version.created_at,
      updated_at: version.updated_at,
    }
  }
}
