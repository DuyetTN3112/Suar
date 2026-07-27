import type {
  AddProjectSkillWorkspaceCommand,
  CreateCustomProjectSkillWorkspaceCommand,
  CreateProjectRoleWorkspaceCommand,
  DeactivateProjectSkillWorkspaceCommand,
  DeleteProjectRoleTargetWorkspaceCommand,
  UpdateProjectSkillWorkspaceCommand,
  UpsertProjectRoleSkillWorkspaceCommand,
} from '#modules/skills/actions/commands/project-skills/skill_project_workspace_commands'
import type {
  ListProjectRolesWorkspaceQuery,
  ListProjectSkillsWorkspaceQuery,
} from '#modules/skills/actions/queries/project-skills/skill_project_workspace_queries'
import type { SkillProjectActionContext } from '#modules/skills/actions/skill_project_action_context'

export abstract class SkillProjectActionFactory {
  abstract makeListSkills(context: SkillProjectActionContext): ListProjectSkillsWorkspaceQuery
  abstract makeListRoles(context: SkillProjectActionContext): ListProjectRolesWorkspaceQuery
  abstract makeAddSkill(context: SkillProjectActionContext): AddProjectSkillWorkspaceCommand
  abstract makeCreateCustomSkill(
    context: SkillProjectActionContext
  ): CreateCustomProjectSkillWorkspaceCommand
  abstract makeUpdateSkill(context: SkillProjectActionContext): UpdateProjectSkillWorkspaceCommand
  abstract makeDeactivateSkill(
    context: SkillProjectActionContext
  ): DeactivateProjectSkillWorkspaceCommand
  abstract makeCreateRole(context: SkillProjectActionContext): CreateProjectRoleWorkspaceCommand
  abstract makeDeleteRoleTarget(
    context: SkillProjectActionContext
  ): DeleteProjectRoleTargetWorkspaceCommand
  abstract makeUpsertRoleSkill(
    context: SkillProjectActionContext
  ): UpsertProjectRoleSkillWorkspaceCommand
}
