import { ProjectSkillTaskMetadataCacheInvalidatorAdapter } from '#composition/adapters/cache/project_skill_task_metadata_cache_invalidator_adapter'
import { SkillPublicApiAdapter } from '#composition/adapters/skills/skill_public_api_adapter'
import AddProjectRoleSkillCommand from '#modules/skills/actions/commands/project-roles/add_project_role_skill_command'
import CreateCustomProjectRoleCommand from '#modules/skills/actions/commands/project-roles/create_custom_project_role_command'
import DeactivateProjectRoleCommand from '#modules/skills/actions/commands/project-roles/deactivate_project_role_command'
import UpdateProjectRoleSkillCommand from '#modules/skills/actions/commands/project-roles/update_project_role_skill_command'
import AddProjectSkillCommand from '#modules/skills/actions/commands/project-skills/add_project_skill_command'
import DeactivateProjectSkillCommand from '#modules/skills/actions/commands/project-skills/deactivate_project_skill_command'
import RemoveProjectRoleSkillCommand from '#modules/skills/actions/commands/project-skills/remove_project_role_skill_command'
import UpdateProjectSkillCommand from '#modules/skills/actions/commands/project-skills/update_project_skill_command'
import CreateSkillRubricDraftCommand from '#modules/skills/actions/commands/rubric-and-proficiency/create_skill_rubric_draft_command'
import PublishSkillRubricVersionCommand from '#modules/skills/actions/commands/rubric-and-proficiency/publish_skill_rubric_version_command'
import UpsertSkillRubricLevelCommand from '#modules/skills/actions/commands/rubric-and-proficiency/upsert_skill_rubric_level_command'
import CloneProfessionalRoleTemplateCommand from '#modules/skills/actions/commands/skill-catalog/clone_professional_role_template_command'
import ResolveCustomSkillCommand from '#modules/skills/actions/commands/skill-resolution/resolve_custom_skill_command'
import ResolveUserDeclaredSkillCommand from '#modules/skills/actions/commands/skill-resolution/resolve_user_declared_skill_command'
import ListProjectRolesQuery from '#modules/skills/actions/queries/project-roles/list_project_roles_query'
import ListProjectSkillsQuery from '#modules/skills/actions/queries/project-skills/list_project_skills_query'
import GetActiveProficiencyScaleQuery from '#modules/skills/actions/queries/rubric-and-proficiency/get_active_proficiency_scale_query'
import GetProficiencyScaleQuery from '#modules/skills/actions/queries/rubric-and-proficiency/get_proficiency_scale_query'
import GetPublishedSkillRubricVersionQuery from '#modules/skills/actions/queries/rubric-and-proficiency/get_published_skill_rubric_version_query'
import ListSkillRubricVersionsQuery from '#modules/skills/actions/queries/rubric-and-proficiency/list_skill_rubric_versions_query'
import MapProficiencyCodeToLevelQuery from '#modules/skills/actions/queries/rubric-and-proficiency/map_proficiency_code_to_level_query'
import ShowPublishedSkillRubricQuery from '#modules/skills/actions/queries/rubric-and-proficiency/show_published_skill_rubric_query'
import ListProfessionalRoleTemplatesQuery from '#modules/skills/actions/queries/skill-catalog/list_professional_role_templates_query'
import ResolveSkillQuery from '#modules/skills/actions/queries/skill-resolution/resolve_skill_query'
import { LucidProfessionalRoleRepository } from '#modules/skills/infra/adapters/project-roles/lucid_professional_role_repository'
import { LucidProjectSkillRepository } from '#modules/skills/infra/adapters/project-skills/lucid_project_skill_repository'
import { LucidProficiencyScaleRepository } from '#modules/skills/infra/adapters/rubric-and-proficiency/lucid_proficiency_scale_repository'
import { LucidSkillRubricRepository } from '#modules/skills/infra/adapters/rubric-and-proficiency/lucid_skill_rubric_repository'
import { LucidSkillCatalogRepository } from '#modules/skills/infra/adapters/skill-catalog/lucid_skill_catalog_repository'
import { LucidSkillTransactionRunner } from '#modules/skills/infra/adapters/skill-catalog/lucid_skill_transaction_runner'
import { NodeSkillCryptography } from '#modules/skills/infra/adapters/skill-catalog/node_skill_cryptography'

export const skillCatalogRepository = new LucidSkillCatalogRepository()
export const projectSkillRepository = new LucidProjectSkillRepository()
export const professionalRoleRepository = new LucidProfessionalRoleRepository()
export const proficiencyScaleRepository = new LucidProficiencyScaleRepository()
export const skillRubricRepository = new LucidSkillRubricRepository()

export const skillTransactionRunner = new LucidSkillTransactionRunner()
const skillCryptography = new NodeSkillCryptography()
export const projectSkillTaskMetadataCache = new ProjectSkillTaskMetadataCacheInvalidatorAdapter()

export const resolveCustomSkillCommand = new ResolveCustomSkillCommand(
  skillCatalogRepository,
  skillCryptography
)
export const resolveUserDeclaredSkillCommand = new ResolveUserDeclaredSkillCommand(
  skillCatalogRepository,
  resolveCustomSkillCommand
)
export const addProjectSkillCommand = new AddProjectSkillCommand(
  projectSkillRepository,
  proficiencyScaleRepository,
  undefined,
  projectSkillTaskMetadataCache
)
export const updateProjectSkillCommand = new UpdateProjectSkillCommand(
  projectSkillRepository,
  proficiencyScaleRepository,
  undefined,
  projectSkillTaskMetadataCache
)
export const deactivateProjectSkillCommand = new DeactivateProjectSkillCommand(
  projectSkillRepository,
  undefined,
  projectSkillTaskMetadataCache
)
export const listProjectSkillsQuery = new ListProjectSkillsQuery(projectSkillRepository)
export const getActiveProficiencyScaleQuery = new GetActiveProficiencyScaleQuery(
  proficiencyScaleRepository
)
export const getProficiencyScaleQuery = new GetProficiencyScaleQuery(proficiencyScaleRepository)
export const mapProficiencyCodeToLevelQuery = new MapProficiencyCodeToLevelQuery(
  proficiencyScaleRepository
)
export const resolveSkillQuery = new ResolveSkillQuery(skillRubricRepository)
export const getPublishedSkillRubricVersionQuery = new GetPublishedSkillRubricVersionQuery(
  skillRubricRepository
)
export const listSkillRubricVersionsQuery = new ListSkillRubricVersionsQuery(skillRubricRepository)
export const showPublishedSkillRubricQuery = new ShowPublishedSkillRubricQuery(
  skillRubricRepository
)
export const createSkillRubricDraftCommand = new CreateSkillRubricDraftCommand(
  skillRubricRepository
)
export const upsertSkillRubricLevelCommand = new UpsertSkillRubricLevelCommand(
  skillRubricRepository
)
export const publishSkillRubricVersionCommand = new PublishSkillRubricVersionCommand(
  skillRubricRepository,
  proficiencyScaleRepository,
  skillTransactionRunner
)

export const addProjectRoleSkillCommand = new AddProjectRoleSkillCommand(
  professionalRoleRepository,
  projectSkillRepository,
  proficiencyScaleRepository
)
export const cloneProfessionalRoleTemplateCommand = new CloneProfessionalRoleTemplateCommand(
  professionalRoleRepository,
  projectSkillRepository,
  addProjectSkillCommand,
  skillTransactionRunner
)
export const createCustomProjectRoleCommand = new CreateCustomProjectRoleCommand(
  professionalRoleRepository
)
export const deactivateProjectRoleCommand = new DeactivateProjectRoleCommand(
  professionalRoleRepository
)
export const removeProjectRoleSkillCommand = new RemoveProjectRoleSkillCommand(
  professionalRoleRepository,
  skillTransactionRunner
)
export const updateProjectRoleSkillCommand = new UpdateProjectRoleSkillCommand(
  professionalRoleRepository,
  proficiencyScaleRepository,
  skillTransactionRunner
)
export const listProfessionalRoleTemplatesQuery = new ListProfessionalRoleTemplatesQuery(
  professionalRoleRepository
)
export const listProjectRolesQuery = new ListProjectRolesQuery(professionalRoleRepository)

export const skillApplication = new SkillPublicApiAdapter({
  skillCatalog: skillCatalogRepository,
  proficiencyScales: proficiencyScaleRepository,
  professionalRoles: professionalRoleRepository,
  skillRubrics: skillRubricRepository,
  resolveCustomSkill: resolveCustomSkillCommand,
  resolveUserDeclaredSkill: resolveUserDeclaredSkillCommand,
  addProjectSkill: addProjectSkillCommand,
  getActiveProficiencyScale: getActiveProficiencyScaleQuery,
  mapProficiencyCodeToLevel: mapProficiencyCodeToLevelQuery,
  resolveSkill: resolveSkillQuery,
  getPublishedSkillRubricVersion: getPublishedSkillRubricVersionQuery,
  addProjectRoleSkill: addProjectRoleSkillCommand,
  cloneProfessionalRoleTemplate: cloneProfessionalRoleTemplateCommand,
  createCustomProjectRole: createCustomProjectRoleCommand,
})
