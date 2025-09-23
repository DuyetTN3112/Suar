import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import ProjectSkill from '#modules/skills/infra/models/project_skill'
import Skill from '#modules/skills/infra/models/skill'
import SkillRubricVersion from '#modules/skills/infra/models/skill_rubric_version'

export type { ProjectSkill }

const querySkill = (trx?: TransactionClientContract) =>
  trx ? Skill.query({ client: trx }) : Skill.query()

const queryProjectSkill = (trx?: TransactionClientContract) =>
  trx ? ProjectSkill.query({ client: trx }) : ProjectSkill.query()

const querySkillRubricVersion = (trx?: TransactionClientContract) =>
  trx ? SkillRubricVersion.query({ client: trx }) : SkillRubricVersion.query()

export const ProjectSkillRepository = {
  async findSkill(
    id: string,
    trx?: TransactionClientContract
  ): Promise<Skill | null> {
    return querySkill(trx).where('id', id).first()
  },

  async findActiveSkill(
    id: string,
    trx?: TransactionClientContract
  ): Promise<Skill | null> {
    return querySkill(trx).where('id', id).where('is_active', true).first()
  },

  async findProjectSkill(
    projectId: string,
    skillId: string,
    trx?: TransactionClientContract
  ): Promise<ProjectSkill | null> {
    return queryProjectSkill(trx).where('project_id', projectId).where('skill_id', skillId).first()
  },

  async findProjectSkillById(
    id: string,
    trx?: TransactionClientContract
  ): Promise<ProjectSkill | null> {
    return queryProjectSkill(trx).where('id', id).first()
  },

  async listProjectSkills(
    projectId: string,
    trx?: TransactionClientContract
  ): Promise<ProjectSkill[]> {
    return queryProjectSkill(trx).where('project_id', projectId).preload('skill').preload('rubricVersion')
  },

  async findRubricVersion(
    id: string,
    trx?: TransactionClientContract
  ): Promise<SkillRubricVersion | null> {
    return querySkillRubricVersion(trx).where('id', id).first()
  },

  async createProjectSkill(
    payload: {
      project_id: string
      skill_id: string
      added_by?: string | null
      is_active?: boolean
      is_selectable_for_tasks?: boolean
      is_visible_in_project?: boolean
    },
    trx?: TransactionClientContract
  ): Promise<ProjectSkill> {
    if (trx) {
      return ProjectSkill.create(payload, { client: trx })
    }
    return ProjectSkill.create(payload)
  },
}
