import GetActiveSkillsQuery from '../queries/get_active_skills_query.js'

import SkillRepository from '#infra/skills/repositories/skill_repository'
import type { DatabaseId } from '#types/database'

export class SkillPublicApi {
  async listActive(): Promise<Awaited<ReturnType<(typeof GetActiveSkillsQuery)['execute']>>> {
    return GetActiveSkillsQuery.execute()
  }

  async findActiveByIds(
    skillIds: DatabaseId[]
  ): Promise<Awaited<ReturnType<(typeof SkillRepository)['findActiveByIds']>>> {
    return SkillRepository.findActiveByIds(skillIds)
  }

  async findByIds(
    skillIds: DatabaseId[]
  ): Promise<Awaited<ReturnType<(typeof SkillRepository)['findByIds']>>> {
    return SkillRepository.findByIds(skillIds)
  }

  async getSpiderChartSkillIds(): Promise<
    Awaited<ReturnType<(typeof SkillRepository)['getSpiderChartSkillIds']>>
  > {
    return SkillRepository.getSpiderChartSkillIds()
  }

  async findUserSkillsWithSkill(
    userId: DatabaseId
  ): Promise<Awaited<ReturnType<(typeof SkillRepository)['findUserSkillsWithSkill']>>> {
    return SkillRepository.findUserSkillsWithSkill(userId)
  }
}

export const skillPublicApi = new SkillPublicApi()
