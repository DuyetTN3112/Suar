import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import Skill from '#modules/skills/infra/models/skill'
import SkillAlias from '#modules/skills/infra/models/skill_alias'
import SkillRubricLevel from '#modules/skills/infra/models/skill_rubric_level'
import SkillRubricVersion from '#modules/skills/infra/models/skill_rubric_version'

const querySkill = (trx?: TransactionClientContract) =>
  trx ? Skill.query({ client: trx }) : Skill.query()

const querySkillAlias = (trx?: TransactionClientContract) =>
  trx ? SkillAlias.query({ client: trx }) : SkillAlias.query()

const querySkillRubricVersion = (trx?: TransactionClientContract) =>
  trx ? SkillRubricVersion.query({ client: trx }) : SkillRubricVersion.query()

const querySkillRubricLevel = (trx?: TransactionClientContract) =>
  trx ? SkillRubricLevel.query({ client: trx }) : SkillRubricLevel.query()

export const SkillRubricRepository = {
  // ── Skill ──

  async findSkill(
    id: string,
    trx?: TransactionClientContract
  ): Promise<Skill | null> {
    return querySkill(trx).where('id', id).first()
  },

  async findActiveSkillByCode(
    code: string,
    trx?: TransactionClientContract
  ): Promise<Skill | null> {
    return querySkill(trx)
      .where('is_active', true)
      .whereRaw('LOWER(skill_code) = ?', [code.toLowerCase()])
      .first()
  },

  async findActiveSkillByName(
    name: string,
    trx?: TransactionClientContract
  ): Promise<Skill | null> {
    return querySkill(trx)
      .where('is_active', true)
      .whereRaw('LOWER(skill_name) = ?', [name.toLowerCase()])
      .first()
  },

  // ── SkillAlias ──

  async findAliasByNormalized(
    normalizedAlias: string,
    trx?: TransactionClientContract
  ): Promise<SkillAlias | null> {
    return querySkillAlias(trx).where('normalized_alias', normalizedAlias).preload('skill').first()
  },

  // ── SkillRubricVersion ──

  async findRubricVersion(
    id: string,
    trx?: TransactionClientContract
  ): Promise<SkillRubricVersion | null> {
    return querySkillRubricVersion(trx).where('id', id).first()
  },

  async findDraftBySkill(
    skillId: string,
    trx?: TransactionClientContract
  ): Promise<SkillRubricVersion | null> {
    return querySkillRubricVersion(trx).where('skill_id', skillId).where('status', 'draft').first()
  },

  async findMaxVersionBySkill(
    skillId: string,
    trx?: TransactionClientContract
  ): Promise<number> {
    const row = await querySkillRubricVersion(trx)
      .where('skill_id', skillId)
      .max('version as maxVersion')
      .first()
    return (row?.$extras.maxversion ?? row?.$extras.maxVersion ?? 0) as number
  },

  async findPublishedBySkill(
    skillId: string,
    trx?: TransactionClientContract
  ): Promise<SkillRubricVersion | null> {
    return querySkillRubricVersion(trx)
      .where('skill_id', skillId)
      .where('status', 'published')
      .whereNull('effective_to')
      .preload('levels', (q) => {
        void q.preload('level')
      })
      .first()
  },

  async findPublishedVersionsBySkill(
    skillId: string,
    excludeId: string,
    trx?: TransactionClientContract
  ): Promise<SkillRubricVersion[]> {
    return querySkillRubricVersion(trx)
      .where('skill_id', skillId)
      .where('status', 'published')
      .whereNull('effective_to')
      .whereNot('id', excludeId)
  },

  async createDraftVersion(
    skillId: string,
    version: number,
    createdBy?: string,
    changeSummary?: string,
    trx?: TransactionClientContract
  ): Promise<SkillRubricVersion> {
    const payload = {
      skill_id: skillId,
      version,
      status: 'draft' as const,
      created_by: createdBy,
      change_summary: changeSummary,
    }
    if (trx) {
      return SkillRubricVersion.create(payload, { client: trx })
    }
    return SkillRubricVersion.create(payload)
  },

  // ── SkillRubricLevel ──

  async findRubricLevelsByVersion(
    versionId: string,
    trx?: TransactionClientContract
  ): Promise<SkillRubricLevel[]> {
    return querySkillRubricLevel(trx).where('rubric_version_id', versionId)
  },

  async findRubricLevel(
    versionId: string,
    levelId: string,
    trx?: TransactionClientContract
  ): Promise<SkillRubricLevel | null> {
    return querySkillRubricLevel(trx)
      .where('rubric_version_id', versionId)
      .where('proficiency_level_id', levelId)
      .first()
  },

  async createOrUpdateLevel(
    versionId: string,
    levelId: string,
    payload: Record<string, unknown>,
    trx?: TransactionClientContract
  ): Promise<SkillRubricLevel> {
    const existing = await this.findRubricLevel(versionId, levelId, trx)
    if (existing) {
      existing.merge(payload)
      await existing.save()
      return existing
    }
    const createPayload = {
      rubric_version_id: versionId,
      proficiency_level_id: levelId,
      ...payload,
    }
    if (trx) {
      return SkillRubricLevel.create(createPayload, { client: trx })
    }
    return SkillRubricLevel.create(createPayload)
  },

  async findVersionsBySkillWithLevels(
    skillId: string,
    trx?: TransactionClientContract
  ): Promise<SkillRubricVersion[]> {
    return querySkillRubricVersion(trx)
      .where('skill_id', skillId)
      .preload('levels', (q) => {
        void q.preload('level').orderBy('ordinal', 'asc')
      })
      .orderBy('version', 'desc')
  },
}
