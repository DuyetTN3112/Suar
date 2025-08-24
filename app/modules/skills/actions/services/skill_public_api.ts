import GetActiveSkillsQuery from '../queries/get_active_skills_query.js'

import SkillRepository from '#modules/skills/infra/repositories/skill_repository'

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

  async findUserSkillsWithSkill(
    userId: string
  ): Promise<Awaited<ReturnType<(typeof SkillRepository)['findUserSkillsWithSkill']>>> {
    return SkillRepository.findUserSkillsWithSkill(userId)
  }
}

export const skillPublicApi = new SkillPublicApi()
