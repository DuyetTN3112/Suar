import {
  auditPublicApi,
  type AuditLogWriter,
} from '#modules/audit/public_contracts/audit_log_writer'
import ConflictException from '#modules/errors/public_contracts/conflict_exception'
import type { SkillCommandAudit } from '#modules/skills/actions/dtos/skill_command_audit'
import type {
  ProfessionalRoleRepository,
  ProjectProfessionalRoleRecord,
} from '#modules/skills/actions/ports/outbound/professional_role_repository'

export interface CreateCustomProjectRoleInput {
  projectId: string
  code: string
  name: string
  description?: string | null
  createdBy?: string
  audit?: SkillCommandAudit
}

export default class CreateCustomProjectRoleCommand {
  constructor(
    private readonly professionalRoles: ProfessionalRoleRepository,
    private readonly audit: Pick<AuditLogWriter, 'log'> = auditPublicApi
  ) {}

  async execute(input: CreateCustomProjectRoleInput): Promise<ProjectProfessionalRoleRecord> {
    await this.assertRoleCodeIsAvailable(input.projectId, input.code)

    const role = await this.professionalRoles.createProjectRole({
      project_id: input.projectId,
      source_template_id: null,
      code: input.code,
      name: input.name,
      description: input.description ?? null,
      is_active: true,
      version: 1,
      created_by: input.createdBy ?? null,
    })
    if (input.audit) {
      await this.audit.log(
        {
          user_id: input.audit.actorId,
          action: 'create',
          entity_type: 'project_professional_role',
          entity_id: role.id,
          old_values: null,
          new_values: {
            project_id: role.project_id,
            code: role.code,
            name: role.name,
            source_template_id: null,
          },
        },
        input.audit.context,
        { critical: true }
      )
    }
    return role
  }

  private async assertRoleCodeIsAvailable(projectId: string, code: string): Promise<void> {
    const existingRole = await this.professionalRoles.findProjectRoleByCode(projectId, code)
    if (existingRole) {
      throw new ConflictException(
        `A professional role with code '${code}' already exists in this project`
      )
    }
  }
}
