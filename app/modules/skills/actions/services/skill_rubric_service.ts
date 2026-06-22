import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

import { ProficiencyScaleService } from './proficiency_scale_service.js'

import { SkillRubricRepository } from '#modules/skills/infra/repositories/skill_rubric_repository'

export const SkillRubricService = {
  /**
   * Create a new draft rubric version for a skill.
   */
  async createDraftVersion(
    skillId: string,
    createdBy?: string,
    changeSummary?: string
  ) {
    const skill = await SkillRubricRepository.findSkill(skillId)
    if (!skill) {
      throw new Error('Skill not found')
    }

    const existingDraft = await SkillRubricRepository.findDraftBySkill(skillId)
    if (existingDraft) {
      throw new Error('Draft version already exists for this skill')
    }

    const maxVersion = await SkillRubricRepository.findMaxVersionBySkill(skillId)
    const nextVersion = maxVersion + 1

    return await SkillRubricRepository.createDraftVersion(skillId, nextVersion, createdBy, changeSummary)
  },

  /**
   * Add or update a rubric level definition in a draft version.
   */
  async addOrUpdateLevel(
    versionId: string,
    levelId: string,
    payload: Record<string, unknown>
  ) {
    const version = await SkillRubricRepository.findRubricVersion(versionId)
    if (!version) {
      throw new Error('Rubric version not found')
    }

    if (version.status !== 'draft') {
      throw new Error('Cannot modify a published rubric version')
    }

    return await SkillRubricRepository.createOrUpdateLevel(versionId, levelId, payload)
  },

  /**
   * Publish a draft version, making it active and archiving the previous version.
   */
  async publishVersion(versionId: string) {
    const version = await SkillRubricRepository.findRubricVersion(versionId)
    if (!version) {
      throw new Error('Rubric version not found')
    }

    if (version.status !== 'draft') {
      throw new Error('Version is not in draft status')
    }

    const activeScale = await ProficiencyScaleService.getActiveScale()
    if (!activeScale) {
      throw new Error('No active default proficiency scale found')
    }

    const scaleLevels = activeScale.levels
    const definedLevels = await SkillRubricRepository.findRubricLevelsByVersion(versionId)

    const definedLevelIds = new Set(definedLevels.map((dl) => dl.proficiency_level_id))
    const missingLevels = scaleLevels.filter((sl) => !definedLevelIds.has(sl.id))

    if (missingLevels.length > 0) {
      throw new Error(
        `Incomplete rubric: missing definitions for levels [${missingLevels.map((l) => l.code).join(', ')}]`
      )
    }

    const now = DateTime.now()

    const trx = await db.transaction()
    try {
      version.useTransaction(trx)
      version.status = 'published'
      version.effective_from = now
      await version.save()

      const prevVersions = await SkillRubricRepository.findPublishedVersionsBySkill(
        version.skill_id,
        version.id,
        trx
      )

      for (const prev of prevVersions) {
        prev.useTransaction(trx)
        prev.effective_to = now
        await prev.save()
      }

      await trx.commit()
      return version
    } catch (err) {
      await trx.rollback()
      throw err
    }
  },

  /**
   * Retrieve the current published rubric version for a skill.
   */
  async getPublishedVersion(skillId: string) {
    return SkillRubricRepository.findPublishedBySkill(skillId)
  },

  /**
   * Resolve a search phrase or input to a canonical Skill entity.
   */
  async resolveSkill(phrase: string) {
    const trimmed = phrase.trim()
    if (!trimmed) return null

    let skill = await SkillRubricRepository.findActiveSkillByCode(trimmed)
    if (skill) return skill

    skill = await SkillRubricRepository.findActiveSkillByName(trimmed)
    if (skill) return skill

    const normalized = trimmed.toLowerCase().replace(/[^a-z0-9]/g, '')
    const alias = await SkillRubricRepository.findAliasByNormalized(normalized)
    const aliasSkill = alias?.skill
    if (aliasSkill?.is_active) {
      return aliasSkill
    }

    return null
  },
}
