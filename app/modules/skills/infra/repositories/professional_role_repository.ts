import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import ProfessionalRoleTemplate from '#modules/skills/infra/models/professional_role_template'
import ProfessionalRoleTemplateSkill from '#modules/skills/infra/models/professional_role_template_skill'
import ProjectProfessionalRole from '#modules/skills/infra/models/project_professional_role'
import ProjectProfessionalRoleSkill from '#modules/skills/infra/models/project_professional_role_skill'

export type { ProfessionalRoleTemplate, ProfessionalRoleTemplateSkill, ProjectProfessionalRole, ProjectProfessionalRoleSkill }

/**
 * ProfessionalRoleRepository
 *
 * Data access for professional role templates and project roles.
 */
// Static repository shape matches existing module data-access pattern.
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class ProfessionalRoleRepository {
  // ── Templates ──

  static async findTemplateByCode(
    code: string,
    trx?: TransactionClientContract
  ): Promise<ProfessionalRoleTemplate | null> {
    const query = trx ? ProfessionalRoleTemplate.query({ client: trx }) : ProfessionalRoleTemplate.query()
    return query.where('code', code).first()
  }

  static async findTemplateById(
    id: string,
    withSkills = false,
    trx?: TransactionClientContract
  ): Promise<ProfessionalRoleTemplate | null> {
    const query = trx ? ProfessionalRoleTemplate.query({ client: trx }) : ProfessionalRoleTemplate.query()
    let q = query.where('id', id)
    if (withSkills) q = q.preload('template_skills')
    return q.first()
  }

  static async listActiveTemplates(
    trx?: TransactionClientContract
  ): Promise<ProfessionalRoleTemplate[]> {
    const query = trx ? ProfessionalRoleTemplate.query({ client: trx }) : ProfessionalRoleTemplate.query()
    return query.where('is_active', true).preload('template_skills')
  }

  static async listActiveTemplatesWithSkillDetails(
    trx?: TransactionClientContract
  ): Promise<ProfessionalRoleTemplate[]> {
    const query = trx
      ? ProfessionalRoleTemplate.query({ client: trx })
      : ProfessionalRoleTemplate.query()
    return query
      .where('is_active', true)
      .preload('template_skills', (skillQuery) => {
        void skillQuery
          .preload('skill')
          .preload('minimumLevel')
          .preload('targetLevel')
          .preload('assessmentCeilingLevel')
          .orderBy('sort_order', 'asc')
      })
      .orderBy('name', 'asc')
  }

  static async findTemplateSkill(
    roleTemplateId: string,
    skillId: string,
    trx?: TransactionClientContract
  ): Promise<ProfessionalRoleTemplateSkill | null> {
    const query = trx ? ProfessionalRoleTemplateSkill.query({ client: trx }) : ProfessionalRoleTemplateSkill.query()
    return query.where('role_template_id', roleTemplateId).where('skill_id', skillId).first()
  }

  static async createTemplate(
    payload: {
      code: string
      name: string
      description?: string | null
      is_active?: boolean
    },
    trx?: TransactionClientContract
  ): Promise<ProfessionalRoleTemplate> {
    if (trx) {
      return ProfessionalRoleTemplate.create(payload, { client: trx })
    }
    return ProfessionalRoleTemplate.create(payload)
  }

  static async createTemplateSkill(
    payload: {
      role_template_id: string
      skill_id: string
      minimum_level_id?: string | null
      target_level_id?: string | null
      assessment_ceiling_level_id?: string | null
      is_mandatory?: boolean
      importance?: 'low' | 'medium' | 'high' | 'critical'
      weight?: number
      sort_order?: number
    },
    trx?: TransactionClientContract
  ): Promise<ProfessionalRoleTemplateSkill> {
    if (trx) {
      return ProfessionalRoleTemplateSkill.create(payload, { client: trx })
    }
    return ProfessionalRoleTemplateSkill.create(payload)
  }

  // ── Project Roles ──

  static async findProjectRoleByCode(
    projectId: string,
    code: string,
    trx?: TransactionClientContract
  ): Promise<ProjectProfessionalRole | null> {
    const query = trx ? ProjectProfessionalRole.query({ client: trx }) : ProjectProfessionalRole.query()
    return query.where('project_id', projectId).where('code', code).first()
  }

  static async findProjectRoleById(
    id: string,
    withSkills = false,
    trx?: TransactionClientContract
  ): Promise<ProjectProfessionalRole | null> {
    const query = trx ? ProjectProfessionalRole.query({ client: trx }) : ProjectProfessionalRole.query()
    let q = query.where('id', id)
    if (withSkills) {
      q = q
        .preload('role_skills', (roleSkillQuery) => {
          void roleSkillQuery.preload('projectSkill')
        })
        .preload('sourceTemplate')
    }
    return q.first()
  }

  static async listProjectRoles(
    projectId: string,
    trx?: TransactionClientContract
  ): Promise<ProjectProfessionalRole[]> {
    const query = trx ? ProjectProfessionalRole.query({ client: trx }) : ProjectProfessionalRole.query()
    return query.where('project_id', projectId).preload('role_skills').preload('sourceTemplate')
  }

  static async listProjectRolesWithSkillDetails(
    projectId: string,
    trx?: TransactionClientContract
  ): Promise<ProjectProfessionalRole[]> {
    const query = trx
      ? ProjectProfessionalRole.query({ client: trx })
      : ProjectProfessionalRole.query()
    return query
      .where('project_id', projectId)
      .preload('sourceTemplate')
      .preload('role_skills', (roleSkillQuery) => {
        void roleSkillQuery
          .preload('projectSkill', (projectSkillQuery) => {
            void projectSkillQuery.preload('skill')
          })
          .preload('minimumLevel')
          .preload('targetLevel')
          .preload('assessmentCeilingLevel')
      })
  }

  static async findProjectRoleSkill(
    projectRoleId: string,
    projectSkillId: string,
    trx?: TransactionClientContract
  ): Promise<ProjectProfessionalRoleSkill | null> {
    const query = trx ? ProjectProfessionalRoleSkill.query({ client: trx }) : ProjectProfessionalRoleSkill.query()
    return query
      .where('project_professional_role_id', projectRoleId)
      .where('project_skill_id', projectSkillId)
      .first()
  }

  static async findProjectRoleSkillById(
    id: string,
    trx?: TransactionClientContract
  ): Promise<ProjectProfessionalRoleSkill | null> {
    const query = trx ? ProjectProfessionalRoleSkill.query({ client: trx }) : ProjectProfessionalRoleSkill.query()
    return query.where('id', id).first()
  }

  static async deleteProjectRoleSkill(
    id: string,
    trx?: TransactionClientContract
  ): Promise<void> {
    const skill = await this.findProjectRoleSkillById(id, trx)
    if (skill) {
      await skill.delete()
    }
  }

  static async createProjectRole(
    payload: {
      project_id: string
      source_template_id?: string | null
      code: string
      name: string
      description?: string | null
      is_active?: boolean
      version?: number
      created_by?: string | null
    },
    trx?: TransactionClientContract
  ): Promise<ProjectProfessionalRole> {
    if (trx) {
      return ProjectProfessionalRole.create(payload, { client: trx })
    }
    return ProjectProfessionalRole.create(payload)
  }

  static async createProjectRoleSkill(
    payload: {
      project_professional_role_id: string
      project_skill_id: string
      minimum_level_id?: string | null
      target_level_id?: string | null
      assessment_ceiling_level_id?: string | null
      is_mandatory?: boolean
      importance?: 'low' | 'medium' | 'high' | 'critical'
      weight?: number
      sort_order?: number
      notes?: string | null
    },
    trx?: TransactionClientContract
  ): Promise<ProjectProfessionalRoleSkill> {
    if (trx) {
      return ProjectProfessionalRoleSkill.create(payload, { client: trx })
    }
    return ProjectProfessionalRoleSkill.create(payload)
  }
}
