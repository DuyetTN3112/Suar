import type { ApplicationService } from '@adonisjs/core/types'

import { SearchSkillsCandidateReader } from '#composition/adapters/search/search_skills_candidate_reader'

import { searchEngineCapability } from '#composition/search/search-engine/search_engine_composition'
import { skillTaxonomyProvider } from '#composition/skills/skill-taxonomy/skill_taxonomy_composition'
import {
  addProjectRoleSkillCommand,
  addProjectSkillCommand,
  cloneProfessionalRoleTemplateCommand,
  createSkillRubricDraftCommand,
  createCustomProjectRoleCommand,
  deactivateProjectSkillCommand,
  deactivateProjectRoleCommand,
  getActiveProficiencyScaleQuery,
  getProficiencyScaleQuery,
  getPublishedSkillRubricVersionQuery,
  listProjectSkillsQuery,
  listProfessionalRoleTemplatesQuery,
  listProjectRolesQuery,
  listSkillRubricVersionsQuery,
  mapProficiencyCodeToLevelQuery,
  publishSkillRubricVersionCommand,
  removeProjectRoleSkillCommand,
  resolveSkillQuery,
  showPublishedSkillRubricQuery,
  skillCatalogRepository,
  updateProjectSkillCommand,
  updateProjectRoleSkillCommand,
  upsertSkillRubricLevelCommand,
} from '#composition/skills/skill-application/skills_application_composition'
import AddProjectRoleSkillCommand from '#modules/skills/actions/commands/project-roles/add_project_role_skill_command'
import AddProjectSkillCommand from '#modules/skills/actions/commands/project-skills/add_project_skill_command'
import CloneProfessionalRoleTemplateCommand from '#modules/skills/actions/commands/skill-catalog/clone_professional_role_template_command'
import CreateCustomProjectRoleCommand from '#modules/skills/actions/commands/project-roles/create_custom_project_role_command'
import CreateSkillRubricDraftCommand from '#modules/skills/actions/commands/rubric-and-proficiency/create_skill_rubric_draft_command'
import DeactivateProjectRoleCommand from '#modules/skills/actions/commands/project-roles/deactivate_project_role_command'
import DeactivateProjectSkillCommand from '#modules/skills/actions/commands/project-skills/deactivate_project_skill_command'
import PublishSkillRubricVersionCommand from '#modules/skills/actions/commands/rubric-and-proficiency/publish_skill_rubric_version_command'
import RemoveProjectRoleSkillCommand from '#modules/skills/actions/commands/project-skills/remove_project_role_skill_command'
import UpdateProjectRoleSkillCommand from '#modules/skills/actions/commands/project-roles/update_project_role_skill_command'
import UpdateProjectSkillCommand from '#modules/skills/actions/commands/project-skills/update_project_skill_command'
import UpsertSkillRubricLevelCommand from '#modules/skills/actions/commands/rubric-and-proficiency/upsert_skill_rubric_level_command'
import GetActiveProficiencyScaleQuery from '#modules/skills/actions/queries/rubric-and-proficiency/get_active_proficiency_scale_query'
import GetProficiencyScaleQuery from '#modules/skills/actions/queries/rubric-and-proficiency/get_proficiency_scale_query'
import GetPublishedSkillRubricVersionQuery from '#modules/skills/actions/queries/rubric-and-proficiency/get_published_skill_rubric_version_query'
import ListActiveSkillsCatalogQuery from '#modules/skills/actions/queries/skill-catalog/list_active_skills_catalog_query'
import ListProfessionalRoleTemplatesQuery from '#modules/skills/actions/queries/skill-catalog/list_professional_role_templates_query'
import ListProjectRolesQuery from '#modules/skills/actions/queries/project-roles/list_project_roles_query'
import ListProjectSkillsQuery from '#modules/skills/actions/queries/project-skills/list_project_skills_query'
import ListSkillRubricVersionsQuery from '#modules/skills/actions/queries/rubric-and-proficiency/list_skill_rubric_versions_query'
import MapProficiencyCodeToLevelQuery from '#modules/skills/actions/queries/rubric-and-proficiency/map_proficiency_code_to_level_query'
import ResolveSkillQuery from '#modules/skills/actions/queries/skill-resolution/resolve_skill_query'
import ShowPublishedSkillRubricQuery from '#modules/skills/actions/queries/rubric-and-proficiency/show_published_skill_rubric_query'
import { SkillTaxonomyProvider } from '#modules/skills/infra/adapters/skill-catalog/skill_taxonomy_provider'

export default class SkillsCatalogProvider {
  constructor(private readonly app: ApplicationService) {}

  register(): void {
    this.app.container.singleton(SkillTaxonomyProvider, () => skillTaxonomyProvider)
    const activeSkillCatalogQuery = new ListActiveSkillsCatalogQuery(
      new SearchSkillsCandidateReader(searchEngineCapability),
      skillCatalogRepository
    )
    this.app.container.singleton(
      ListActiveSkillsCatalogQuery,
      () => activeSkillCatalogQuery
    )
    this.app.container.singleton(AddProjectSkillCommand, () => addProjectSkillCommand)
    this.app.container.singleton(UpdateProjectSkillCommand, () => updateProjectSkillCommand)
    this.app.container.singleton(DeactivateProjectSkillCommand, () => deactivateProjectSkillCommand)
    this.app.container.singleton(ListProjectSkillsQuery, () => listProjectSkillsQuery)
    this.app.container.singleton(
      GetActiveProficiencyScaleQuery,
      () => getActiveProficiencyScaleQuery
    )
    this.app.container.singleton(GetProficiencyScaleQuery, () => getProficiencyScaleQuery)
    this.app.container.singleton(
      MapProficiencyCodeToLevelQuery,
      () => mapProficiencyCodeToLevelQuery
    )
    this.app.container.singleton(ResolveSkillQuery, () => resolveSkillQuery)
    this.app.container.singleton(
      GetPublishedSkillRubricVersionQuery,
      () => getPublishedSkillRubricVersionQuery
    )
    this.app.container.singleton(ListSkillRubricVersionsQuery, () => listSkillRubricVersionsQuery)
    this.app.container.singleton(ShowPublishedSkillRubricQuery, () => showPublishedSkillRubricQuery)
    this.app.container.singleton(CreateSkillRubricDraftCommand, () => createSkillRubricDraftCommand)
    this.app.container.singleton(UpsertSkillRubricLevelCommand, () => upsertSkillRubricLevelCommand)
    this.app.container.singleton(
      PublishSkillRubricVersionCommand,
      () => publishSkillRubricVersionCommand
    )
    this.app.container.singleton(AddProjectRoleSkillCommand, () => addProjectRoleSkillCommand)
    this.app.container.singleton(
      CloneProfessionalRoleTemplateCommand,
      () => cloneProfessionalRoleTemplateCommand
    )
    this.app.container.singleton(
      CreateCustomProjectRoleCommand,
      () => createCustomProjectRoleCommand
    )
    this.app.container.singleton(DeactivateProjectRoleCommand, () => deactivateProjectRoleCommand)
    this.app.container.singleton(RemoveProjectRoleSkillCommand, () => removeProjectRoleSkillCommand)
    this.app.container.singleton(UpdateProjectRoleSkillCommand, () => updateProjectRoleSkillCommand)
    this.app.container.singleton(
      ListProfessionalRoleTemplatesQuery,
      () => listProfessionalRoleTemplatesQuery
    )
    this.app.container.singleton(ListProjectRolesQuery, () => listProjectRolesQuery)
  }
}
