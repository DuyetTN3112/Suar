import type { AuditActionContext } from '#modules/audit/public_contracts/audit_action_context'
import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import { BaseCommand } from '#modules/skills/actions/base_command'
import type AddProjectRoleSkillCommand from '#modules/skills/actions/commands/project-roles/add_project_role_skill_command'
import type { AddProjectRoleSkillInput } from '#modules/skills/actions/commands/project-roles/add_project_role_skill_command'
import type CreateCustomProjectRoleCommand from '#modules/skills/actions/commands/project-roles/create_custom_project_role_command'
import type DeactivateProjectRoleCommand from '#modules/skills/actions/commands/project-roles/deactivate_project_role_command'
import type UpdateProjectRoleSkillCommand from '#modules/skills/actions/commands/project-roles/update_project_role_skill_command'
import type { UpdateProjectRoleSkillInput } from '#modules/skills/actions/commands/project-roles/update_project_role_skill_command'
import type AddProjectSkillCommand from '#modules/skills/actions/commands/project-skills/add_project_skill_command'
import type AuthorizeSkillProjectAccessCommand from '#modules/skills/actions/commands/project-skills/authorize_skill_project_access_command'
import type DeactivateProjectSkillCommand from '#modules/skills/actions/commands/project-skills/deactivate_project_skill_command'
import type RemoveProjectRoleSkillCommand from '#modules/skills/actions/commands/project-skills/remove_project_role_skill_command'
import type UpdateProjectSkillCommand from '#modules/skills/actions/commands/project-skills/update_project_skill_command'
import type { UpdateProjectSkillInput } from '#modules/skills/actions/commands/project-skills/update_project_skill_command'
import type CloneProfessionalRoleTemplateCommand from '#modules/skills/actions/commands/skill-catalog/clone_professional_role_template_command'
import type ResolveCustomSkillCommand from '#modules/skills/actions/commands/skill-resolution/resolve_custom_skill_command'
import type {
  ProjectProfessionalRoleRecord,
  ProjectProfessionalRoleSkillRecord,
} from '#modules/skills/actions/ports/outbound/professional_role_repository'
import type { ProjectSkillRecord } from '#modules/skills/actions/ports/outbound/project_skill_repository'
import type { ProjectSkillTaskMetadataCacheInvalidator } from '#modules/skills/actions/ports/outbound/project_skill_task_metadata_cache_invalidator'
import type { SkillTransactionRunner } from '#modules/skills/actions/ports/outbound/skill_transaction'
import type { SkillProjectActionContext } from '#modules/skills/actions/skill_project_action_context'
import { CUSTOM_SKILL_CATALOG_SOURCES } from '#modules/skills/public_contracts/custom_skill_catalog'
import type { SkillCategoryCodeValue } from '#modules/skills/public_contracts/skill_constants'

interface ProjectWriteInput {
  projectId: string
  auditContext: AuditActionContext
}

abstract class AuthorizedSkillProjectWrite<TInput, TOutput> extends BaseCommand<TInput, TOutput> {
  constructor(
    protected readonly context: SkillProjectActionContext,
    protected readonly authorize: AuthorizeSkillProjectAccessCommand
  ) {
    super()
  }

  protected authorizeWrite(projectId: string): Promise<string> {
    return this.authorize.execute({ context: this.context, projectId, writeMode: true })
  }
}

export interface AddProjectSkillWorkspaceInput extends ProjectWriteInput {
  skillId?: string
  minimumTaskRequirementLevelId?: string | null
  maximumTaskRequirementLevelId?: string | null
}

export class AddProjectSkillWorkspaceCommand extends AuthorizedSkillProjectWrite<
  AddProjectSkillWorkspaceInput,
  ProjectSkillRecord
> {
  constructor(
    context: SkillProjectActionContext,
    authorize: AuthorizeSkillProjectAccessCommand,
    private readonly addProjectSkill: AddProjectSkillCommand
  ) {
    super(context, authorize)
  }

  async execute(input: AddProjectSkillWorkspaceInput): Promise<ProjectSkillRecord> {
    const userId = await this.authorizeWrite(input.projectId)
    if (!input.skillId) {
      throw new BusinessLogicException('skillId is required')
    }
    return this.addProjectSkill.execute({
      projectId: input.projectId,
      skillId: input.skillId,
      minimumTaskRequirementLevelId: input.minimumTaskRequirementLevelId ?? null,
      maximumTaskRequirementLevelId: input.maximumTaskRequirementLevelId ?? null,
      addedBy: userId,
      auditContext: input.auditContext,
    })
  }
}

export interface CreateCustomProjectSkillWorkspaceInput extends ProjectWriteInput {
  name: string
  categoryCode: SkillCategoryCodeValue
  minimumTaskRequirementLevelId?: string | null
  maximumTaskRequirementLevelId?: string | null
}

export class CreateCustomProjectSkillWorkspaceCommand extends AuthorizedSkillProjectWrite<
  CreateCustomProjectSkillWorkspaceInput,
  ProjectSkillRecord
> {
  constructor(
    context: SkillProjectActionContext,
    authorize: AuthorizeSkillProjectAccessCommand,
    private readonly resolveCustomSkill: ResolveCustomSkillCommand,
    private readonly transactions: SkillTransactionRunner,
    private readonly addProjectSkill: AddProjectSkillCommand,
    private readonly taskMetadataCache: ProjectSkillTaskMetadataCacheInvalidator
  ) {
    super(context, authorize)
  }

  async execute(input: CreateCustomProjectSkillWorkspaceInput): Promise<ProjectSkillRecord> {
    const userId = await this.authorizeWrite(input.projectId)
    const name = input.name.trim()
    if (!name) {
      throw new BusinessLogicException('Skill name is required')
    }

    const projectSkill = await this.transactions.run(async (transaction) => {
      const skill = await this.resolveCustomSkill.execute({
        input: {
          name,
          categoryCode: input.categoryCode,
          source: CUSTOM_SKILL_CATALOG_SOURCES.TASK_REQUIREMENT,
        },
        transaction,
      })

      if (!skill) {
        throw new BusinessLogicException('Skill already exists but is not available')
      }

      return this.addProjectSkill.execute(
        {
          projectId: input.projectId,
          skillId: skill.id,
          minimumTaskRequirementLevelId: input.minimumTaskRequirementLevelId ?? null,
          maximumTaskRequirementLevelId: input.maximumTaskRequirementLevelId ?? null,
          addedBy: userId,
          auditContext: input.auditContext,
        },
        transaction
      )
    })

    await this.taskMetadataCache.invalidateTaskMetadata()
    return projectSkill
  }
}

export interface UpdateProjectSkillWorkspaceInput
  extends
    ProjectWriteInput,
    Omit<UpdateProjectSkillInput, 'projectId' | 'actorId' | 'auditContext'> {}

export class UpdateProjectSkillWorkspaceCommand extends AuthorizedSkillProjectWrite<
  UpdateProjectSkillWorkspaceInput,
  Awaited<ReturnType<UpdateProjectSkillCommand['execute']>>
> {
  constructor(
    context: SkillProjectActionContext,
    authorize: AuthorizeSkillProjectAccessCommand,
    private readonly updateProjectSkill: UpdateProjectSkillCommand
  ) {
    super(context, authorize)
  }

  async execute(input: UpdateProjectSkillWorkspaceInput) {
    const userId = await this.authorizeWrite(input.projectId)
    return this.updateProjectSkill.execute({ ...input, actorId: userId, projectId: input.projectId })
  }
}

export interface DeactivateProjectSkillWorkspaceInput extends ProjectWriteInput {
  projectSkillId: string
}

export class DeactivateProjectSkillWorkspaceCommand extends AuthorizedSkillProjectWrite<
  DeactivateProjectSkillWorkspaceInput,
  ProjectSkillRecord
> {
  constructor(
    context: SkillProjectActionContext,
    authorize: AuthorizeSkillProjectAccessCommand,
    private readonly deactivateProjectSkill: DeactivateProjectSkillCommand
  ) {
    super(context, authorize)
  }

  async execute(input: DeactivateProjectSkillWorkspaceInput): Promise<ProjectSkillRecord> {
    const userId = await this.authorizeWrite(input.projectId)
    return this.deactivateProjectSkill.execute({ ...input, actorId: userId, projectId: input.projectId })
  }
}

export interface CreateProjectRoleWorkspaceInput extends ProjectWriteInput {
  templateId?: string
  code?: string
  name?: string
  description?: string
}

export class CreateProjectRoleWorkspaceCommand extends AuthorizedSkillProjectWrite<
  CreateProjectRoleWorkspaceInput,
  ProjectProfessionalRoleRecord
> {
  constructor(
    context: SkillProjectActionContext,
    authorize: AuthorizeSkillProjectAccessCommand,
    private readonly cloneProfessionalRoleTemplate: CloneProfessionalRoleTemplateCommand,
    private readonly createCustomProjectRole: CreateCustomProjectRoleCommand
  ) {
    super(context, authorize)
  }

  async execute(input: CreateProjectRoleWorkspaceInput): Promise<ProjectProfessionalRoleRecord> {
    const userId = await this.authorizeWrite(input.projectId)
    const audit = { actorId: userId, context: input.auditContext }

    if (input.templateId) {
      return this.cloneProfessionalRoleTemplate.execute({
        projectId: input.projectId,
        templateId: input.templateId,
        createdBy: userId,
        audit,
      })
    }

    if (!input.code || !input.name) {
      throw new BusinessLogicException('code and name are required for custom project role')
    }

    return this.createCustomProjectRole.execute({
      projectId: input.projectId,
      code: input.code,
      name: input.name,
      ...(input.description === undefined ? {} : { description: input.description }),
      createdBy: userId,
      audit,
    })
  }
}

export interface DeleteProjectRoleTargetWorkspaceInput extends ProjectWriteInput {
  roleId: string
  roleSkillId?: string
}

export class DeleteProjectRoleTargetWorkspaceCommand extends AuthorizedSkillProjectWrite<
  DeleteProjectRoleTargetWorkspaceInput,
  void
> {
  constructor(
    context: SkillProjectActionContext,
    authorize: AuthorizeSkillProjectAccessCommand,
    private readonly deactivateProjectRole: DeactivateProjectRoleCommand,
    private readonly removeProjectRoleSkill: RemoveProjectRoleSkillCommand
  ) {
    super(context, authorize)
  }

  async execute(input: DeleteProjectRoleTargetWorkspaceInput): Promise<void> {
    const userId = await this.authorizeWrite(input.projectId)
    const audit = { actorId: userId, context: input.auditContext }

    if (input.roleSkillId) {
      await this.removeProjectRoleSkill.execute(input.roleSkillId, audit, input.projectId, input.roleId)
      return
    }

    await this.deactivateProjectRole.execute(input.roleId, audit, input.projectId)
  }
}

export type ProjectRoleSkillMutation =
  | { kind: 'add'; input: AddProjectRoleSkillInput }
  | { kind: 'update'; input: UpdateProjectRoleSkillInput }

export interface UpsertProjectRoleSkillWorkspaceInput extends ProjectWriteInput {
  roleId: string
  mutation: ProjectRoleSkillMutation
}

export interface UpsertProjectRoleSkillWorkspaceResult {
  roleSkill: ProjectProfessionalRoleSkillRecord
  created: boolean
}

export class UpsertProjectRoleSkillWorkspaceCommand extends AuthorizedSkillProjectWrite<
  UpsertProjectRoleSkillWorkspaceInput,
  UpsertProjectRoleSkillWorkspaceResult
> {
  constructor(
    context: SkillProjectActionContext,
    authorize: AuthorizeSkillProjectAccessCommand,
    private readonly addProjectRoleSkill: AddProjectRoleSkillCommand,
    private readonly updateProjectRoleSkill: UpdateProjectRoleSkillCommand
  ) {
    super(context, authorize)
  }

  async execute(
    input: UpsertProjectRoleSkillWorkspaceInput
  ): Promise<UpsertProjectRoleSkillWorkspaceResult> {
    const userId = await this.authorizeWrite(input.projectId)
    const audit = { actorId: userId, context: input.auditContext }

    if (input.mutation.kind === 'add') {
      const roleSkill = await this.addProjectRoleSkill.execute(
        { ...input.mutation.input, projectProfessionalRoleId: input.roleId, projectId: input.projectId },
        audit
      )
      return { roleSkill, created: true }
    }

    const { roleSkill } = await this.updateProjectRoleSkill.execute(
      {
        ...input.mutation.input,
        projectId: input.projectId,
        projectRoleId: input.roleId,
      },
      audit
    )
    return { roleSkill, created: false }
  }
}
