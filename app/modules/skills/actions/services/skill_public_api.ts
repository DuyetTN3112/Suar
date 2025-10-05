import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { randomUUID } from 'node:crypto'

import GetActiveSkillsQuery from '../queries/get_active_skills_query.js'

import {
  SKILL_DISPLAY_TYPES,
  type SkillCategoryCodeValue,
} from '#modules/skills/constants/skill_constants'
import { ProfessionalRoleService } from '#modules/skills/actions/services/professional_role_service'
import { ProficiencyScaleService } from '#modules/skills/actions/services/proficiency_scale_service'
import { ProjectSkillService } from '#modules/skills/actions/services/project_skill_service'
import { SkillRubricService } from '#modules/skills/actions/services/skill_rubric_service'
import { ProfessionalRoleRepository } from '#modules/skills/infra/repositories/professional_role_repository'
import { ProficiencyScaleRepository } from '#modules/skills/infra/repositories/proficiency_scale_repository'
import { ProjectSkillRepository } from '#modules/skills/infra/repositories/project_skill_repository'
import SkillRepository from '#modules/skills/infra/repositories/skill_repository'
import { SkillRubricRepository } from '#modules/skills/infra/repositories/skill_rubric_repository'

function normalizeCustomSkillName(name: string): string {
  return name.trim().replace(/\s+/g, ' ')
}

function createCustomSkillCode(name: string): string {
  const slug = name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48)
  const safeSlug = slug || 'custom_skill'
  return `custom_${safeSlug}_${randomUUID().slice(0, 8)}`
}

export class SkillPublicApi {
  async listActive(): Promise<Awaited<ReturnType<(typeof GetActiveSkillsQuery)['execute']>>> {
    return GetActiveSkillsQuery.execute()
  }

  async findActiveByIds(
    skillIds: string[],
    trx?: TransactionClientContract
  ): Promise<Awaited<ReturnType<(typeof SkillRepository)['findActiveByIds']>>> {
    return SkillRepository.findActiveByIds(skillIds, trx)
  }

  async findOrCreateCustomTaskSkill(
    payload: { name: string; categoryCode: SkillCategoryCodeValue },
    trx?: TransactionClientContract
  ): Promise<Awaited<ReturnType<(typeof SkillRepository)['createCustomSkill']>>> {
    const skillName = normalizeCustomSkillName(payload.name)
    const existingSkill = await SkillRepository.findActiveByName(skillName, trx)

    if (existingSkill) {
      return existingSkill
    }

    return SkillRepository.createCustomSkill(
      {
        id: randomUUID(),
        skill_code: createCustomSkillCode(skillName),
        skill_name: skillName,
        category_code: payload.categoryCode,
        display_type: SKILL_DISPLAY_TYPES.SPIDER_CHART,
        description: `${skillName} - custom task requirement skill`,
        icon_url: null,
        is_active: true,
        sort_order: 10_000,
      },
      trx
    )
  }

  async findByIds(
    skillIds: string[]
  ): Promise<Awaited<ReturnType<(typeof SkillRepository)['findByIds']>>> {
    return SkillRepository.findByIds(skillIds)
  }

  async getSpiderChartSkillIds(): Promise<
    Awaited<ReturnType<(typeof SkillRepository)['getSpiderChartSkillIds']>>
  > {
    return SkillRepository.getSpiderChartSkillIds()
  }

  async listActiveProficiencyLevels(): Promise<{ value: string; label: string }[]> {
    const scale = await ProficiencyScaleRepository.getActiveScaleWithLevels()
    return scale
      ? scale.levels.map((level) => ({ value: level.code, label: level.display_name }))
      : []
  }

  async getActiveScale(trx?: TransactionClientContract) {
    return ProficiencyScaleService.getActiveScale(trx)
  }

  async findUserSkillsWithSkill(
    userId: string
  ): Promise<Awaited<ReturnType<(typeof SkillRepository)['findUserSkillsWithSkill']>>> {
    return SkillRepository.findUserSkillsWithSkill(userId)
  }

  async findProfessionalRoleTemplateByCode(
    code: string,
    trx?: TransactionClientContract
  ): Promise<Awaited<ReturnType<(typeof ProfessionalRoleRepository)['findTemplateByCode']>>> {
    return ProfessionalRoleRepository.findTemplateByCode(code, trx)
  }

  async cloneProfessionalRoleTemplateToProject(
    projectId: string,
    templateId: string,
    createdBy?: string
  ): Promise<Awaited<ReturnType<(typeof ProfessionalRoleService)['cloneTemplateToProject']>>> {
    return ProfessionalRoleService.cloneTemplateToProject(projectId, templateId, createdBy)
  }

  async findProjectProfessionalRoleByCode(
    projectId: string,
    code: string,
    trx?: TransactionClientContract
  ): Promise<Awaited<ReturnType<(typeof ProfessionalRoleRepository)['findProjectRoleByCode']>>> {
    return ProfessionalRoleRepository.findProjectRoleByCode(projectId, code, trx)
  }

  async findProjectProfessionalRoleById(
    id: string,
    withSkills = false,
    trx?: TransactionClientContract
  ): Promise<Awaited<ReturnType<(typeof ProfessionalRoleRepository)['findProjectRoleById']>>> {
    return ProfessionalRoleRepository.findProjectRoleById(id, withSkills, trx)
  }

  async createCustomProjectRole(
    payload: Parameters<(typeof ProfessionalRoleService)['createCustomProjectRole']>[0]
  ): Promise<Awaited<ReturnType<(typeof ProfessionalRoleService)['createCustomProjectRole']>>> {
    return ProfessionalRoleService.createCustomProjectRole(payload)
  }

  async addSkillToProject(
    payload: Parameters<(typeof ProjectSkillService)['addSkillToProject']>[0]
  ): Promise<Awaited<ReturnType<(typeof ProjectSkillService)['addSkillToProject']>>> {
    return ProjectSkillService.addSkillToProject(payload)
  }

  async addSkillToProjectRole(
    payload: Parameters<(typeof ProfessionalRoleService)['addSkillToProjectRole']>[0]
  ): Promise<Awaited<ReturnType<(typeof ProfessionalRoleService)['addSkillToProjectRole']>>> {
    return ProfessionalRoleService.addSkillToProjectRole(payload)
  }

  async findProficiencyLevelsByIds(
    ids: string[]
  ): Promise<Awaited<ReturnType<(typeof ProficiencyScaleRepository)['findLevelsByIds']>>> {
    return ProficiencyScaleRepository.findLevelsByIds(ids)
  }

  async findProficiencyLevelById(
    id: string
  ): Promise<Awaited<ReturnType<(typeof ProficiencyScaleRepository)['findLevelById']>>> {
    return ProficiencyScaleRepository.findLevelById(id)
  }

  async mapProficiencyCodeToLevel(
    code: string,
    trx?: TransactionClientContract
  ): Promise<Awaited<ReturnType<(typeof ProficiencyScaleService)['mapCodeToLevel']>>> {
    return ProficiencyScaleService.mapCodeToLevel(code, trx)
  }

  async resolveSkill(phrase: string) {
    return SkillRubricService.resolveSkill(phrase)
  }

  async getPublishedSkillRubricVersion(skillId: string) {
    return SkillRubricService.getPublishedVersion(skillId)
  }

  // ── New domain repositories (Phase 3-8) ──

  get proficiencyScale() {
    return ProficiencyScaleRepository
  }

  get skillRubric() {
    return SkillRubricRepository
  }

  get projectSkill() {
    return ProjectSkillRepository
  }

  get professionalRole() {
    return ProfessionalRoleRepository
  }
}

export const skillPublicApi = new SkillPublicApi()
