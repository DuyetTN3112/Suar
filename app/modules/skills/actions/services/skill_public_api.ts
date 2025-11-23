import GetActiveSkillsQuery from '../queries/get_active_skills_query.js'

import { ProfessionalRoleRepository } from '#modules/skills/infra/repositories/professional_role_repository'
import { ProficiencyScaleRepository } from '#modules/skills/infra/repositories/proficiency_scale_repository'
import { ProjectSkillRepository } from '#modules/skills/infra/repositories/project_skill_repository'
import SkillRepository from '#modules/skills/infra/repositories/skill_repository'
import { SkillRubricRepository } from '#modules/skills/infra/repositories/skill_rubric_repository'

export class SkillPublicApi {
  async listActive(): Promise<Awaited<ReturnType<(typeof GetActiveSkillsQuery)['execute']>>> {
    return GetActiveSkillsQuery.execute()
  }

  async findActiveByIds(
    skillIds: string[]
  ): Promise<Awaited<ReturnType<(typeof SkillRepository)['findActiveByIds']>>> {
    return SkillRepository.findActiveByIds(skillIds)
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

  async findUserSkillsWithSkill(
    userId: string
  ): Promise<Awaited<ReturnType<(typeof SkillRepository)['findUserSkillsWithSkill']>>> {
    return SkillRepository.findUserSkillsWithSkill(userId)
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
