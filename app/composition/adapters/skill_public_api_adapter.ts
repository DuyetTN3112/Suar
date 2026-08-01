
import type AddProjectRoleSkillCommand from '#modules/skills/actions/commands/add_project_role_skill_command';
import {
  type AddProjectRoleSkillInput,
} from '#modules/skills/actions/commands/add_project_role_skill_command'
import type AddProjectSkillCommand from '#modules/skills/actions/commands/add_project_skill_command';
import {
  type AddProjectSkillInput,
} from '#modules/skills/actions/commands/add_project_skill_command'
import type CloneProfessionalRoleTemplateCommand from '#modules/skills/actions/commands/clone_professional_role_template_command'
import type CreateCustomProjectRoleCommand from '#modules/skills/actions/commands/create_custom_project_role_command';
import {
  type CreateCustomProjectRoleInput,
} from '#modules/skills/actions/commands/create_custom_project_role_command'
import type ResolveCustomSkillCommand from '#modules/skills/actions/commands/resolve_custom_skill_command'
import type ResolveUserDeclaredSkillCommand from '#modules/skills/actions/commands/resolve_user_declared_skill_command'
import type { ProfessionalRoleRepository } from '#modules/skills/actions/ports/outbound/professional_role_repository'
import type { ProficiencyScaleRepository } from '#modules/skills/actions/ports/outbound/proficiency_scale_repository'
import type { SkillCatalogRepository } from '#modules/skills/actions/ports/outbound/skill_catalog_repository'
import type { SkillRubricRepository } from '#modules/skills/actions/ports/outbound/skill_rubric_repository'
import type { SkillTransaction } from '#modules/skills/actions/ports/outbound/skill_transaction'
import type GetActiveProficiencyScaleQuery from '#modules/skills/actions/queries/get_active_proficiency_scale_query'
import GetActiveSkillsQuery from '#modules/skills/actions/queries/get_active_skills_query'
import type GetPublishedSkillRubricVersionQuery from '#modules/skills/actions/queries/get_published_skill_rubric_version_query'
import type MapProficiencyCodeToLevelQuery from '#modules/skills/actions/queries/map_proficiency_code_to_level_query'
import type ResolveSkillQuery from '#modules/skills/actions/queries/resolve_skill_query'
import type { ActiveSkillIdFact } from '#modules/skills/public_contracts/active_skill_category_catalog'
import {
  CUSTOM_SKILL_CATALOG_SOURCES,
  type ResolvedCustomSkill,
} from '#modules/skills/public_contracts/custom_skill_catalog'
import type { SkillCategoryCodeValue } from '#modules/skills/public_contracts/skill_constants'
import type { SkillIdentityFactV1 } from '#modules/skills/public_contracts/skill_identity_fact_v1'
import type { SkillProfileFactV1 } from '#modules/skills/public_contracts/skill_profile_fact_v1'
import type { SkillSummaryFact } from '#modules/skills/public_contracts/skill_summary_fact'
import type {
  TaskRequirementReferenceFactIdsV1,
  TaskRequirementReferenceFactsV1,
} from '#modules/skills/public_contracts/task_requirement_reference_facts_v1'
import type {
  ResolvedUserDeclaredSkill,
  ResolveUserDeclaredSkillInput,
} from '#modules/skills/public_contracts/user_declared_skill_catalog'

export interface SkillPublicApiAdapterDependencies {
  skillCatalog: SkillCatalogRepository
  proficiencyScales: ProficiencyScaleRepository
  professionalRoles: ProfessionalRoleRepository
  skillRubrics: SkillRubricRepository
  resolveCustomSkill: ResolveCustomSkillCommand
  resolveUserDeclaredSkill: ResolveUserDeclaredSkillCommand
  addProjectSkill: AddProjectSkillCommand
  getActiveProficiencyScale: GetActiveProficiencyScaleQuery
  mapProficiencyCodeToLevel: MapProficiencyCodeToLevelQuery
  resolveSkill: ResolveSkillQuery
  getPublishedSkillRubricVersion: GetPublishedSkillRubricVersionQuery
  addProjectRoleSkill: AddProjectRoleSkillCommand
  cloneProfessionalRoleTemplate: CloneProfessionalRoleTemplateCommand
  createCustomProjectRole: CreateCustomProjectRoleCommand
}

export class SkillPublicApiAdapter {
  constructor(private readonly dependencies: SkillPublicApiAdapterDependencies) {}

  listActive(): Promise<Awaited<ReturnType<(typeof GetActiveSkillsQuery)['execute']>>> {
    return GetActiveSkillsQuery.execute({
      listActiveSkills: () => this.dependencies.skillCatalog.listActive(),
    })
  }

  async resolveActiveSkillIdsByCategoryCodes(
    categoryCodes: string[]
  ): Promise<ActiveSkillIdFact[]> {
    const normalizedCategoryCodes = normalizeCategoryCodes(categoryCodes)
    if (normalizedCategoryCodes.length === 0) return []

    const skills =
      await this.dependencies.skillCatalog.findActiveSkillIdsByCategoryCodes(
        normalizedCategoryCodes
      )
    return skills.map((skill) => ({ id: skill.id }))
  }

  async resolveSkillIdsByCategoryCodes(categoryCodes: string[]): Promise<ActiveSkillIdFact[]> {
    const normalizedCategoryCodes = normalizeCategoryCodes(categoryCodes)
    if (normalizedCategoryCodes.length === 0) return []

    const skills =
      await this.dependencies.skillCatalog.findSkillIdsByCategoryCodes(normalizedCategoryCodes)
    return skills.map((skill) => ({ id: skill.id }))
  }

  findActiveByIds(skillIds: string[], transaction?: SkillTransaction) {
    return this.dependencies.skillCatalog.findActiveByIds(skillIds, transaction)
  }

  async findSummaryFactsByIds(
    skillIds: string[],
    transaction?: SkillTransaction
  ): Promise<SkillSummaryFact[]> {
    const skills = await this.dependencies.skillCatalog.findByIds(skillIds, transaction)
    return skills.map((skill) => ({
      id: skill.id,
      name: skill.skill_name,
    }))
  }

  async findIdentityFactsV1(
    skillIds: string[],
    transaction?: SkillTransaction
  ): Promise<SkillIdentityFactV1[]> {
    const skills = await this.dependencies.skillCatalog.findByIds(
      [...new Set(skillIds)],
      transaction
    )
    return skills.map((skill) => ({
      id: skill.id,
      name: skill.skill_name,
      categoryCode: skill.category_code,
      isActive: skill.is_active,
    }))
  }

  async findProfileFactsV1(
    skillIds: string[],
    transaction?: SkillTransaction
  ): Promise<SkillProfileFactV1[]> {
    const skills = await this.dependencies.skillCatalog.findByIds(
      [...new Set(skillIds)],
      transaction
    )
    return skills.map((skill) => ({
      id: skill.id,
      name: skill.skill_name,
      code: skill.skill_code,
      categoryCode: skill.category_code,
      displayType: skill.display_type,
      isActive: skill.is_active,
    }))
  }

  async findTaskRequirementReferenceFactsV1(
    ids: TaskRequirementReferenceFactIdsV1,
    transaction?: SkillTransaction
  ): Promise<TaskRequirementReferenceFactsV1> {
    const skillIds = [...new Set(ids.skillIds)]
    const proficiencyLevelIds = [...new Set(ids.proficiencyLevelIds)]
    // One transaction owns one database client, so these reads intentionally stay sequential.
    const skills = await this.dependencies.skillCatalog.findByIds(skillIds, transaction)
    const proficiencyLevels = await this.dependencies.proficiencyScales.findLevelsByIds(
      proficiencyLevelIds,
      transaction
    )

    return {
      contractVersion: 1,
      skills: skills.map((skill) => ({
        id: skill.id,
        name: skill.skill_name,
        code: skill.skill_code,
        categoryCode: skill.category_code,
        iconUrl: skill.icon_url,
      })),
      proficiencyLevels: proficiencyLevels.map((level) => ({
        id: level.id,
        code: level.code,
        displayName: level.display_name,
        shortName: level.short_name,
        ordinal: level.ordinal,
      })),
    }
  }

  findOrCreateCustomTaskSkill(
    payload: { name: string; categoryCode: SkillCategoryCodeValue },
    transaction: SkillTransaction
  ): Promise<ResolvedCustomSkill | null> {
    return this.dependencies.resolveCustomSkill.execute(
      {
        name: payload.name,
        categoryCode: payload.categoryCode,
        source: CUSTOM_SKILL_CATALOG_SOURCES.TASK_REQUIREMENT,
      },
      transaction
    )
  }

  resolveUserDeclaredSkill(
    input: ResolveUserDeclaredSkillInput,
    transaction: SkillTransaction
  ): Promise<ResolvedUserDeclaredSkill | null> {
    return this.dependencies.resolveUserDeclaredSkill.execute(input, transaction)
  }

  findByIds(skillIds: string[]) {
    return this.dependencies.skillCatalog.findByIds(skillIds)
  }

  getSpiderChartSkillIds() {
    return this.dependencies.skillCatalog.getSpiderChartSkillIds()
  }

  async listActiveProficiencyLevels(): Promise<{ value: string; label: string }[]> {
    const scale = await this.dependencies.proficiencyScales.getActiveScaleWithLevels()
    return scale
      ? scale.levels.map((level) => ({ value: level.code, label: level.display_name }))
      : []
  }

  getActiveScale(transaction?: SkillTransaction) {
    return this.dependencies.getActiveProficiencyScale.execute(transaction)
  }

  findProfessionalRoleTemplateByCode(code: string, transaction?: SkillTransaction) {
    return this.dependencies.professionalRoles.findTemplateByCode(code, transaction)
  }

  cloneProfessionalRoleTemplateToProject(
    projectId: string,
    templateId: string,
    createdBy?: string
  ) {
    return this.dependencies.cloneProfessionalRoleTemplate.execute({
      projectId,
      templateId,
      ...(createdBy === undefined ? {} : { createdBy }),
    })
  }

  findProjectProfessionalRoleByCode(
    projectId: string,
    code: string,
    transaction?: SkillTransaction
  ) {
    return this.dependencies.professionalRoles.findProjectRoleByCode(projectId, code, transaction)
  }

  findProjectProfessionalRoleById(id: string, withSkills = false, transaction?: SkillTransaction) {
    return this.dependencies.professionalRoles.findProjectRoleById(id, withSkills, transaction)
  }

  createCustomProjectRole(payload: CreateCustomProjectRoleInput) {
    return this.dependencies.createCustomProjectRole.execute(payload)
  }

  addSkillToProject(payload: Omit<AddProjectSkillInput, 'auditContext'>) {
    return this.dependencies.addProjectSkill.execute(payload)
  }

  addSkillToProjectRole(payload: AddProjectRoleSkillInput) {
    return this.dependencies.addProjectRoleSkill.execute(payload)
  }

  findProficiencyLevelsByIds(ids: string[]) {
    return this.dependencies.proficiencyScales.findLevelsByIds(ids)
  }

  findProficiencyLevelById(id: string) {
    return this.dependencies.proficiencyScales.findLevelById(id)
  }

  mapProficiencyCodeToLevel(code: string, transaction?: SkillTransaction) {
    return this.dependencies.mapProficiencyCodeToLevel.execute(code, transaction)
  }

  resolveSkill(phrase: string) {
    return this.dependencies.resolveSkill.execute(phrase)
  }

  getPublishedSkillRubricVersion(skillId: string) {
    return this.dependencies.getPublishedSkillRubricVersion.execute(skillId)
  }

  findRubricVersion(rubricVersionId: string) {
    return this.dependencies.skillRubrics.findRubricVersion(rubricVersionId)
  }
}

function normalizeCategoryCodes(categoryCodes: string[]): string[] {
  return [...new Set(categoryCodes.map((categoryCode) => categoryCode.trim()).filter(Boolean))]
}
