import type AddProjectRoleSkillCommand from '#modules/skills/actions/commands/project-roles/add_project_role_skill_command'
import type CreateCustomProjectRoleCommand from '#modules/skills/actions/commands/project-roles/create_custom_project_role_command'
import type DeactivateProjectRoleCommand from '#modules/skills/actions/commands/project-roles/deactivate_project_role_command'
import type UpdateProjectRoleSkillCommand from '#modules/skills/actions/commands/project-roles/update_project_role_skill_command'
import type AddProjectSkillCommand from '#modules/skills/actions/commands/project-skills/add_project_skill_command'
import type AuthorizeSkillProjectAccessCommand from '#modules/skills/actions/commands/project-skills/authorize_skill_project_access_command'
import type DeactivateProjectSkillCommand from '#modules/skills/actions/commands/project-skills/deactivate_project_skill_command'
import type RemoveProjectRoleSkillCommand from '#modules/skills/actions/commands/project-skills/remove_project_role_skill_command'
import {
  AddProjectSkillWorkspaceCommand,
  CreateCustomProjectSkillWorkspaceCommand,
  CreateProjectRoleWorkspaceCommand,
  DeactivateProjectSkillWorkspaceCommand,
  DeleteProjectRoleTargetWorkspaceCommand,
  UpdateProjectSkillWorkspaceCommand,
  UpsertProjectRoleSkillWorkspaceCommand,
} from '#modules/skills/actions/commands/project-skills/skill_project_workspace_commands'
import type UpdateProjectSkillCommand from '#modules/skills/actions/commands/project-skills/update_project_skill_command'
import type CloneProfessionalRoleTemplateCommand from '#modules/skills/actions/commands/skill-catalog/clone_professional_role_template_command'
import type ResolveCustomSkillCommand from '#modules/skills/actions/commands/skill-resolution/resolve_custom_skill_command'
import { SkillProjectActionFactory } from '#modules/skills/actions/ports/inbound/skill_project_action_factory'
import type { ProjectSkillTaskMetadataCacheInvalidator } from '#modules/skills/actions/ports/outbound/project_skill_task_metadata_cache_invalidator'
import type { SkillTransactionRunner } from '#modules/skills/actions/ports/outbound/skill_transaction'
import type ListProjectRolesQuery from '#modules/skills/actions/queries/project-roles/list_project_roles_query'
import type ListProjectSkillsQuery from '#modules/skills/actions/queries/project-skills/list_project_skills_query'
import {
  ListProjectRolesWorkspaceQuery,
  ListProjectSkillsWorkspaceQuery,
} from '#modules/skills/actions/queries/project-skills/skill_project_workspace_queries'
import type { SkillProjectActionContext } from '#modules/skills/actions/skill_project_action_context'

export class ComposedSkillProjectActionFactory extends SkillProjectActionFactory {
  constructor(
    private readonly authorize: AuthorizeSkillProjectAccessCommand,
    private readonly listProjectSkills: ListProjectSkillsQuery,
    private readonly listProjectRoles: ListProjectRolesQuery,
    private readonly addProjectSkill: AddProjectSkillCommand,
    private readonly updateProjectSkill: UpdateProjectSkillCommand,
    private readonly deactivateProjectSkill: DeactivateProjectSkillCommand,
    private readonly cloneProfessionalRoleTemplate: CloneProfessionalRoleTemplateCommand,
    private readonly createCustomProjectRole: CreateCustomProjectRoleCommand,
    private readonly deactivateProjectRole: DeactivateProjectRoleCommand,
    private readonly removeProjectRoleSkill: RemoveProjectRoleSkillCommand,
    private readonly addProjectRoleSkill: AddProjectRoleSkillCommand,
    private readonly updateProjectRoleSkill: UpdateProjectRoleSkillCommand,
    private readonly resolveCustomSkill: ResolveCustomSkillCommand,
    private readonly skillTransactionRunner: SkillTransactionRunner,
    private readonly projectSkillTaskMetadataCache: ProjectSkillTaskMetadataCacheInvalidator
  ) {
    super()
  }

  makeListSkills(context: SkillProjectActionContext): ListProjectSkillsWorkspaceQuery {
    return new ListProjectSkillsWorkspaceQuery(context, this.authorize, this.listProjectSkills)
  }

  makeListRoles(context: SkillProjectActionContext): ListProjectRolesWorkspaceQuery {
    return new ListProjectRolesWorkspaceQuery(context, this.authorize, this.listProjectRoles)
  }

  makeAddSkill(context: SkillProjectActionContext): AddProjectSkillWorkspaceCommand {
    return new AddProjectSkillWorkspaceCommand(context, this.authorize, this.addProjectSkill)
  }

  makeCreateCustomSkill(
    context: SkillProjectActionContext
  ): CreateCustomProjectSkillWorkspaceCommand {
    return new CreateCustomProjectSkillWorkspaceCommand(
      context,
      this.authorize,
      this.resolveCustomSkill,
      this.skillTransactionRunner,
      this.addProjectSkill,
      this.projectSkillTaskMetadataCache
    )
  }

  makeUpdateSkill(context: SkillProjectActionContext): UpdateProjectSkillWorkspaceCommand {
    return new UpdateProjectSkillWorkspaceCommand(context, this.authorize, this.updateProjectSkill)
  }

  makeDeactivateSkill(context: SkillProjectActionContext): DeactivateProjectSkillWorkspaceCommand {
    return new DeactivateProjectSkillWorkspaceCommand(
      context,
      this.authorize,
      this.deactivateProjectSkill
    )
  }

  makeCreateRole(context: SkillProjectActionContext): CreateProjectRoleWorkspaceCommand {
    return new CreateProjectRoleWorkspaceCommand(
      context,
      this.authorize,
      this.cloneProfessionalRoleTemplate,
      this.createCustomProjectRole
    )
  }

  makeDeleteRoleTarget(
    context: SkillProjectActionContext
  ): DeleteProjectRoleTargetWorkspaceCommand {
    return new DeleteProjectRoleTargetWorkspaceCommand(
      context,
      this.authorize,
      this.deactivateProjectRole,
      this.removeProjectRoleSkill
    )
  }

  makeUpsertRoleSkill(context: SkillProjectActionContext): UpsertProjectRoleSkillWorkspaceCommand {
    return new UpsertProjectRoleSkillWorkspaceCommand(
      context,
      this.authorize,
      this.addProjectRoleSkill,
      this.updateProjectRoleSkill
    )
  }
}
