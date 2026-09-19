import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type { SeedRuntime } from '../seed_runtime.js'
import { findRow } from '../seed_utils.js'

import { CanonicalProficiencyLevelCode } from '#modules/skills/public_contracts/rubric-and-proficiency/proficiency_level_constants'

const L2 = CanonicalProficiencyLevelCode.L2
const L4 = CanonicalProficiencyLevelCode.L4
const L7 = CanonicalProficiencyLevelCode.L7
const L10 = CanonicalProficiencyLevelCode.L10
const L12 = CanonicalProficiencyLevelCode.L12
const L13 = CanonicalProficiencyLevelCode.L13
const L14 = CanonicalProficiencyLevelCode.L14

/**
 * Seed default professional role templates.
 * Idempotent — uses `code` as the unique identifier.
 *
 * @param skillMap  Map of skill_code → UUID from seedSkills()
 * @param levelMap  Map of public proficiency code → UUID, obtained from proficiency_levels table
 */
export async function seedProfessionalRoleTemplates(
  runtime: SeedRuntime,
  trx: TransactionClientContract,
  skillMap: Record<string, string>,
  levelMap: Record<string, string>
): Promise<void> {
  const templates = [
    [
      'frontend_engineer',
      'Frontend Engineer',
      'Thiết kế và xây dựng giao diện người dùng với các công nghệ web hiện đại.',
    ],
    [
      'backend_engineer',
      'Backend Engineer',
      'Thiết kế và xây dựng hệ thống phía máy chủ, API và cơ sở dữ liệu.',
    ],
    [
      'fullstack_engineer',
      'Fullstack Engineer',
      'Phát triển tính năng sản phẩm xuyên suốt giao diện, máy chủ và tầng lưu trữ dữ liệu.',
    ],
    [
      'devops_engineer',
      'DevOps Engineer',
      'Vận hành quy trình triển khai, độ tin cậy và tự động hóa bàn giao.',
    ],
    [
      'qa_engineer',
      'QA Engineer',
      'Bảo đảm chất lượng phần mềm qua kiểm thử và đánh giá có hệ thống.',
    ],
  ] as const

  for (const [code, name, description] of templates) {
    const existing = await findRow(trx, 'professional_role_templates', { code })
    const templateId = existing?.id ?? runtime.uuid()
    const payload = {
      code,
      name,
      description,
      is_active: true,
      created_at: runtime.isoDaysAgo(60),
      updated_at: runtime.isoDaysAgo(1),
    }

    if (existing) {
      await trx.from('professional_role_templates').where('id', templateId).update(payload)
    } else {
      await trx
        .insertQuery()
        .table('professional_role_templates')
        .insert({ id: templateId, ...payload })
    }

    const templateSkillSpecs: Record<
      string,
      [string, string, string, string, boolean, 'low' | 'medium' | 'high' | 'critical'][]
    > = {
      frontend_engineer: [
        ['react', L4, L10, L13, true, 'high'],
        ['typescript', L4, L10, L14, true, 'critical'],
        ['svelte', L2, L10, L13, true, 'high'],
        ['design_system', L4, L10, L13, false, 'high'],
        ['testing', L4, L7, L12, false, 'medium'],
        ['communication', L4, L7, L10, false, 'medium'],
      ],
      backend_engineer: [
        ['nodejs', L4, L10, L14, true, 'critical'],
        ['typescript', L4, L10, L14, true, 'critical'],
        ['postgresql', L4, L10, L14, true, 'high'],
        ['api_design', L4, L10, L13, true, 'high'],
        ['devops', L2, L7, L12, false, 'medium'],
        ['testing', L4, L10, L13, true, 'high'],
      ],
      fullstack_engineer: [
        ['react', L4, L10, L13, true, 'high'],
        ['nodejs', L4, L10, L14, true, 'critical'],
        ['typescript', L4, L10, L14, true, 'critical'],
        ['postgresql', L2, L7, L12, false, 'medium'],
        ['system_design', L4, L10, L13, false, 'high'],
        ['communication', L4, L7, L10, false, 'medium'],
      ],
      devops_engineer: [
        ['devops', L7, L12, L14, true, 'critical'],
        ['testing', L4, L10, L13, true, 'high'],
        ['release_management', L4, L10, L13, true, 'high'],
        ['postgresql', L2, L7, L12, false, 'medium'],
        ['communication', L4, L7, L10, false, 'medium'],
      ],
      qa_engineer: [
        ['testing', L7, L12, L14, true, 'critical'],
        ['code_review', L4, L10, L13, true, 'high'],
        ['risk_tracking', L4, L10, L13, false, 'high'],
        ['communication', L7, L10, L14, false, 'high'],
        ['problem_solving', L4, L10, L13, false, 'medium'],
      ],
    }

    const specs = templateSkillSpecs[code] ?? []
    let sortOrder = 0

    for (const [
      skillCode,
      minLevelCode,
      targetLevelCode,
      ceilingLevelCode,
      isMandatory,
      importance,
    ] of specs) {
      const skillId = skillMap[skillCode]
      const minLevelId = levelMap[minLevelCode]
      const targetLevelId = levelMap[targetLevelCode]
      const ceilingLevelId = levelMap[ceilingLevelCode]

      if (!skillId || !minLevelId || !targetLevelId || !ceilingLevelId) continue

      const existingSkill = await findRow(trx, 'professional_role_template_skills', {
        role_template_id: templateId,
        skill_id: skillId,
      })
      const skillRowId = existingSkill?.id ?? runtime.uuid()
      const skillPayload = {
        role_template_id: templateId,
        skill_id: skillId,
        minimum_level_id: minLevelId,
        target_level_id: targetLevelId,
        assessment_ceiling_level_id: ceilingLevelId,
        is_mandatory: isMandatory,
        importance,
        weight: 1.0,
        sort_order: sortOrder++,
        created_at: runtime.isoDaysAgo(60),
        updated_at: runtime.isoDaysAgo(1),
      }

      if (existingSkill) {
        await trx
          .from('professional_role_template_skills')
          .where('id', skillRowId)
          .update(skillPayload)
      } else {
        await trx
          .insertQuery()
          .table('professional_role_template_skills')
          .insert({ id: skillRowId, ...skillPayload })
      }
    }
  }
}
