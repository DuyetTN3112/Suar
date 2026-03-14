import type { ApplicationService } from '@adonisjs/core/types'

import { SearchSkillsCandidateReader } from './adapters/search_skills_candidate_reader.js'

import { searchEngineCapability } from '#composition/search_engine_composition'
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
} from '#composition/skills_application_composition'
import AddProjectRoleSkillCommand from '#modules/skills/actions/commands/add_project_role_skill_command'
import AddProjectSkillCommand from '#modules/skills/actions/commands/add_project_skill_command'
import CloneProfessionalRoleTemplateCommand from '#modules/skills/actions/commands/clone_professional_role_template_command'
import CreateCustomProjectRoleCommand from '#modules/skills/actions/commands/create_custom_project_role_command'
import CreateSkillRubricDraftCommand from '#modules/skills/actions/commands/create_skill_rubric_draft_command'
import DeactivateProjectRoleCommand from '#modules/skills/actions/commands/deactivate_project_role_command'
import DeactivateProjectSkillCommand from '#modules/skills/actions/commands/deactivate_project_skill_command'
import PublishSkillRubricVersionCommand from '#modules/skills/actions/commands/publish_skill_rubric_version_command'
import RemoveProjectRoleSkillCommand from '#modules/skills/actions/commands/remove_project_role_skill_command'
import UpdateProjectRoleSkillCommand from '#modules/skills/actions/commands/update_project_role_skill_command'
import UpdateProjectSkillCommand from '#modules/skills/actions/commands/update_project_skill_command'
import UpsertSkillRubricLevelCommand from '#modules/skills/actions/commands/upsert_skill_rubric_level_command'
import GetActiveProficiencyScaleQuery from '#modules/skills/actions/queries/get_active_proficiency_scale_query'
import GetProficiencyScaleQuery from '#modules/skills/actions/queries/get_proficiency_scale_query'
import GetPublishedSkillRubricVersionQuery from '#modules/skills/actions/queries/get_published_skill_rubric_version_query'
import ListActiveSkillsCatalogQuery from '#modules/skills/actions/queries/list_active_skills_catalog_query'
import ListProfessionalRoleTemplatesQuery from '#modules/skills/actions/queries/list_professional_role_templates_query'
import ListProjectRolesQuery from '#modules/skills/actions/queries/list_project_roles_query'
import ListProjectSkillsQuery from '#modules/skills/actions/queries/list_project_skills_query'
import ListSkillRubricVersionsQuery from '#modules/skills/actions/queries/list_skill_rubric_versions_query'
import MapProficiencyCodeToLevelQuery from '#modules/skills/actions/queries/map_proficiency_code_to_level_query'
import ResolveSkillQuery from '#modules/skills/actions/queries/resolve_skill_query'
import ShowPublishedSkillRubricQuery from '#modules/skills/actions/queries/show_published_skill_rubric_query'

export default class SkillsCatalogProvider {
  constructor(private readonly app: ApplicationService) {}

  register(): void {
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
