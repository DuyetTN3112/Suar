import {
  auditPublicApi,
  type AuditLogWriter,
} from '#modules/audit/public_contracts/audit_log_writer'
import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import ConflictException from '#modules/errors/public_contracts/conflict_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import type AddProjectSkillCommand from '#modules/skills/actions/commands/add_project_skill_command'
import type { SkillCommandAudit } from '#modules/skills/actions/dtos/skill_command_audit'
import type {
  ProfessionalRoleRepository,
  ProfessionalRoleTemplateRecord,
  ProfessionalRoleTemplateSkillRecord,
  ProjectProfessionalRoleRecord,
} from '#modules/skills/actions/ports/outbound/professional_role_repository'
import type { ProjectSkillRepository } from '#modules/skills/actions/ports/outbound/project_skill_repository'
import type {
  SkillTransaction,
  SkillTransactionRunner,
} from '#modules/skills/actions/ports/outbound/skill_transaction'

export interface CloneProfessionalRoleTemplateInput {
  projectId: string
  templateId: string
  createdBy?: string
  audit?: SkillCommandAudit
}

interface TemplateSkillCloneContext {
  projectId: string
  projectRoleId: string
  templateSkills: ProfessionalRoleTemplateSkillRecord[]
  transaction: SkillTransaction
}

export default class CloneProfessionalRoleTemplateCommand {
  constructor(
    private readonly professionalRoles: ProfessionalRoleRepository,
    private readonly projectSkills: ProjectSkillRepository,
    private readonly addProjectSkill: AddProjectSkillCommand,
    private readonly transactionRunner: SkillTransactionRunner,
    private readonly audit: Pick<AuditLogWriter, 'log'> = auditPublicApi
  ) {}

  execute(input: CloneProfessionalRoleTemplateInput): Promise<ProjectProfessionalRoleRecord> {
    return this.transactionRunner.run(async (transaction) => {
      const template = await this.getActiveTemplate(input.templateId, transaction)
      await this.assertRoleCodeIsAvailable(input.projectId, template.code, transaction)

      const projectRole = await this.createProjectRole(input, template, transaction)
      await this.cloneTemplateSkills({
        projectId: input.projectId,
        projectRoleId: projectRole.id,
        templateSkills: template.template_skills,
        transaction,
      })

      if (input.audit) {
        await this.audit.log(
          {
            user_id: input.audit.actorId,
            action: 'create',
            entity_type: 'project_professional_role',
            entity_id: projectRole.id,
            old_values: null,
            new_values: {
              project_id: projectRole.project_id,
              code: projectRole.code,
              name: projectRole.name,
              source_template_id: projectRole.source_template_id,
            },
          },
          input.audit.context,
          { trx: transaction, critical: true }
        )
      }
      return projectRole
    })
  }

  private async getActiveTemplate(
    templateId: string,
    transaction: SkillTransaction
  ): Promise<ProfessionalRoleTemplateRecord> {
    const template = await this.professionalRoles.findTemplateById(templateId, true, transaction)
    if (!template) {
      throw new NotFoundException('Professional role template not found')
    }
    if (!template.is_active) {
      throw new BusinessLogicException('Cannot clone an inactive professional role template')
    }
    return template
  }

  private async assertRoleCodeIsAvailable(
    projectId: string,
    code: string,
    transaction: SkillTransaction
  ): Promise<void> {
    const existingRole = await this.professionalRoles.findProjectRoleByCode(
      projectId,
      code,
      transaction
    )
    if (existingRole) {
      throw new ConflictException(
        `A professional role with code '${code}' already exists in this project`
      )
    }
  }

  private async createProjectRole(
    input: CloneProfessionalRoleTemplateInput,
    template: ProfessionalRoleTemplateRecord,
    transaction: SkillTransaction
  ): Promise<ProjectProfessionalRoleRecord> {
    return this.professionalRoles.createProjectRole(
      {
        project_id: input.projectId,
        source_template_id: input.templateId,
        code: template.code,
        name: template.name,
        description: template.description,
        is_active: true,
        version: 1,
        created_by: input.createdBy ?? null,
      },
      transaction
    )
  }

  private async cloneTemplateSkills(context: TemplateSkillCloneContext): Promise<void> {
    for (const templateSkill of context.templateSkills) {
      const projectSkillId = await this.getOrCreateProjectSkillId(
        context.projectId,
        templateSkill.skill_id,
        context.transaction
      )
      await this.createProjectRoleSkill(
        context.projectRoleId,
        projectSkillId,
        templateSkill,
        context.transaction
      )
    }
  }

  private async getOrCreateProjectSkillId(
    projectId: string,
    skillId: string,
    transaction: SkillTransaction
  ): Promise<string> {
    const existingProjectSkill = await this.projectSkills.findProjectSkill(
      projectId,
      skillId,
      transaction
    )
    if (existingProjectSkill) {
      return existingProjectSkill.id
    }

    const projectSkill = await this.addProjectSkill.execute({ projectId, skillId }, transaction)
    return projectSkill.id
  }

  private async createProjectRoleSkill(
    projectRoleId: string,
    projectSkillId: string,
    templateSkill: ProfessionalRoleTemplateSkillRecord,
    transaction: SkillTransaction
  ): Promise<void> {
    await this.professionalRoles.createProjectRoleSkill(
      {
        project_professional_role_id: projectRoleId,
        project_skill_id: projectSkillId,
        minimum_level_id: templateSkill.minimum_level_id,
        target_level_id: templateSkill.target_level_id,
        assessment_ceiling_level_id: templateSkill.assessment_ceiling_level_id,
        is_mandatory: templateSkill.is_mandatory,
        importance: templateSkill.importance,
        weight: templateSkill.weight,
        sort_order: templateSkill.sort_order,
        notes: null,
      },
      transaction
    )
  }
}
