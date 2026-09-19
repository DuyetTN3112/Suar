import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type { SeedRuntime } from '../seed_runtime.js'
import { findRow } from '../seed_utils.js'
import type { ProjectKey, SeededProject, SeededUser, UserKey } from '../types.js'

import { CanonicalProficiencyLevelCode } from '#modules/skills/public_contracts/rubric-and-proficiency/proficiency_level_constants'

const L4 = CanonicalProficiencyLevelCode.L4
const L7 = CanonicalProficiencyLevelCode.L7
const L10 = CanonicalProficiencyLevelCode.L10
const L12 = CanonicalProficiencyLevelCode.L12
const L13 = CanonicalProficiencyLevelCode.L13
const L14 = CanonicalProficiencyLevelCode.L14

export async function seedProjectSkillCatalog(
  runtime: SeedRuntime,
  trx: TransactionClientContract,
  users: Record<UserKey, SeededUser>,
  projects: Record<ProjectKey, SeededProject>,
  skillMap: Record<string, string>
): Promise<Record<string, string>> {
  const { getSeededTaskSpecs } = await import('../task_specs.js')
  const publishedRubrics = (await trx
    .from('skill_rubric_versions')
    .where('status', 'published')
    .select('id', 'skill_id')) as { id: string; skill_id: string }[]
  const rubricBySkillId = new Map(publishedRubrics.map((row) => [row.skill_id, row.id]))

  const catalogSpecs: {
    project: ProjectKey
    skill: string
    displayName?: string
    description?: string
    addedBy: UserKey
  }[] = [
    {
      project: 'orgAPlatform',
      skill: 'react',
      displayName: 'React Product UI',
      description: 'Project-specific UI skill for interactive product surfaces.',
      addedBy: 'owner',
    },
    { project: 'orgAPlatform', skill: 'typescript', addedBy: 'owner' },
    { project: 'orgAPlatform', skill: 'nodejs', addedBy: 'owner' },
    { project: 'orgAPlatform', skill: 'postgresql', addedBy: 'orgAdmin' },
    { project: 'orgAPlatform', skill: 'api_design', addedBy: 'owner' },
    { project: 'orgAPlatform', skill: 'planning', addedBy: 'owner' },
    { project: 'orgAPlatform', skill: 'communication', addedBy: 'orgAdmin' },
    { project: 'orgAPlatform', skill: 'problem_solving', addedBy: 'orgAdmin' },
    { project: 'orgAPlatform', skill: 'testing', addedBy: 'orgAdmin' },
    { project: 'orgAOperations', skill: 'testing', addedBy: 'orgAdmin' },
    { project: 'orgAOperations', skill: 'code_review', addedBy: 'orgAdmin' },
    { project: 'orgAOperations', skill: 'risk_tracking', addedBy: 'orgAdmin' },
    { project: 'orgAOperations', skill: 'communication', addedBy: 'orgAdmin' },
    { project: 'orgAOperations', skill: 'problem_solving', addedBy: 'orgAdmin' },
    { project: 'orgADesignSystem', skill: 'svelte', addedBy: 'owner' },
    { project: 'orgADesignSystem', skill: 'design_system', addedBy: 'owner' },
    { project: 'orgADesignSystem', skill: 'documentation', addedBy: 'orgAdmin' },
    { project: 'orgEDataOps', skill: 'postgresql', addedBy: 'externalContributorTwo' },
    { project: 'orgEDataOps', skill: 'nodejs', addedBy: 'externalContributorTwo' },
    { project: 'orgEDataOps', skill: 'devops', addedBy: 'externalContributorTwo' },
    { project: 'orgEDataOps', skill: 'testing', addedBy: 'orgAdmin' },
    { project: 'orgEDataOps', skill: 'release_management', addedBy: 'orgAdmin' },
  ]

  const existingCatalogKeys = new Set(
    catalogSpecs.map((spec) => `${spec.project}:${spec.skill}`)
  )
  const projectCatalogSizes = new Map<ProjectKey, number>()
  for (const spec of catalogSpecs) {
    projectCatalogSizes.set(spec.project, (projectCatalogSizes.get(spec.project) ?? 0) + 1)
  }
  for (const task of getSeededTaskSpecs({ dense: true })) {
    for (const skill of task.requiredSkills) {
      const catalogKey = `${task.project}:${skill}`
      if (
        existingCatalogKeys.has(catalogKey) ||
        (projectCatalogSizes.get(task.project) ?? 0) >= 8
      ) {
        continue
      }
      catalogSpecs.push({
        project: task.project,
        skill,
        addedBy: task.creator,
      })
      existingCatalogKeys.add(catalogKey)
      projectCatalogSizes.set(task.project, (projectCatalogSizes.get(task.project) ?? 0) + 1)
    }
  }

  const projectSkillMap: Record<string, string> = {}

  for (const spec of catalogSpecs) {
    const project = runtime.requireValue(projects[spec.project], `project:${spec.project}`)
    const skillId = runtime.requireValue(skillMap[spec.skill], `project-skill:${spec.skill}`)
    const where = {
      project_id: project.id,
      skill_id: skillId,
    }
    const existing = await findRow(trx, 'project_skills', where)
    const rowId = existing?.id ?? runtime.uuid()
    const payload = {
      display_name_override: spec.displayName ?? null,
      description_override: spec.description ?? null,
      rubric_version_id: rubricBySkillId.get(skillId) ?? null,
      is_active: true,
      is_selectable_for_tasks: true,
      is_visible_in_project: true,
      added_by: users[spec.addedBy].id,
      created_at: runtime.isoDaysAgo(45),
      updated_at: runtime.isoDaysAgo(1),
    }

    if (existing) {
      await trx.from('project_skills').where('id', rowId).update(payload)
    } else {
      await trx
        .insertQuery()
        .table('project_skills')
        .insert({ id: rowId, ...where, ...payload })
    }

    projectSkillMap[`${spec.project}:${spec.skill}`] = rowId
  }

  return projectSkillMap
}

export async function seedProjectProfessionalRoles(
  runtime: SeedRuntime,
  trx: TransactionClientContract,
  users: Record<UserKey, SeededUser>,
  projects: Record<ProjectKey, SeededProject>,
  projectSkillMap: Record<string, string>,
  levelMap: Record<string, string>
): Promise<void> {
  const templates = (await trx.from('professional_role_templates').select('id', 'code')) as {
    id: string
    code: string
  }[]
  const templateIdByCode = new Map(templates.map((row) => [row.code, row.id]))

  const roleSpecs: {
    project: ProjectKey
    code: string
    name: string
    description: string
    sourceTemplate: string | null
    createdBy: UserKey
    skills: {
      skill: string
      minimum: string
      target: string
      ceiling: string
      mandatory: boolean
      importance: 'low' | 'medium' | 'high' | 'critical'
      weight: number
      notes: string
    }[]
  }[] = [
    {
      project: 'orgAPlatform',
      code: 'frontend_product_engineer',
      name: 'Frontend Product Engineer',
      description: 'Vai trò dự án tập trung vào bàn giao giao diện sản phẩm.',
      sourceTemplate: 'frontend_engineer',
      createdBy: 'owner',
      skills: [
        {
          skill: 'react',
          minimum: L4,
          target: L10,
          ceiling: L13,
          mandatory: true,
          importance: 'high',
          weight: 1.1,
          notes: 'Cần React cho các màn hình marketplace và hồ sơ năng lực.',
        },
        {
          skill: 'typescript',
          minimum: L4,
          target: L10,
          ceiling: L14,
          mandatory: true,
          importance: 'critical',
          weight: 1.2,
          notes: 'Cần an toàn kiểu dữ liệu xuyên suốt các trang công việc và đánh giá.',
        },
        {
          skill: 'communication',
          minimum: L4,
          target: L7,
          ceiling: L10,
          mandatory: false,
          importance: 'medium',
          weight: 0.8,
          notes: 'Kỹ năng phối hợp, không phải vai trò phân quyền.',
        },
      ],
    },
    {
      project: 'orgAPlatform',
      code: 'fullstack_platform_engineer',
      name: 'Fullstack Platform Engineer',
      description: 'Customized project role spanning UI, API, and persistence work.',
      sourceTemplate: 'fullstack_engineer',
      createdBy: 'owner',
      skills: [
        {
          skill: 'nodejs',
          minimum: L4,
          target: L10,
          ceiling: L14,
          mandatory: true,
          importance: 'critical',
          weight: 1.2,
          notes: 'Năng lực backend cho các luồng AdonisJS.',
        },
        {
          skill: 'postgresql',
          minimum: L4,
          target: L7,
          ceiling: L12,
          mandatory: true,
          importance: 'high',
          weight: 1.0,
          notes: 'Xử lý lưu trữ cho tổng hợp dữ liệu hồ sơ và đánh giá.',
        },
        {
          skill: 'problem_solving',
          minimum: L7,
          target: L10,
          ceiling: L13,
          mandatory: false,
          importance: 'high',
          weight: 1.0,
          notes: 'Dùng khi gỡ lỗi và cân nhắc đánh đổi kiến trúc.',
        },
      ],
    },
    {
      project: 'orgAOperations',
      code: 'quality_reviewer',
      name: 'Quality Reviewer',
      description: 'Vai trò dự án phụ trách review và kiểm chứng hồi quy.',
      sourceTemplate: 'qa_engineer',
      createdBy: 'orgAdmin',
      skills: [
        {
          skill: 'testing',
          minimum: L7,
          target: L12,
          ceiling: L14,
          mandatory: true,
          importance: 'critical',
          weight: 1.2,
          notes: 'Kỹ năng chất lượng kỹ thuật phục vụ review và độ tin cậy hồi quy.',
        },
        {
          skill: 'code_review',
          minimum: L4,
          target: L10,
          ceiling: L13,
          mandatory: true,
          importance: 'high',
          weight: 1.0,
          notes: 'Vai trò đóng góp review tách biệt với vai trò chuyên môn.',
        },
      ],
    },
    {
      project: 'orgEDataOps',
      code: 'devops_data_operator',
      name: 'DevOps Data Operator',
      description: 'Vai trò dự án phụ trách triển khai vận hành dữ liệu và kiểm tra độ tin cậy.',
      sourceTemplate: 'devops_engineer',
      createdBy: 'externalContributorTwo',
      skills: [
        {
          skill: 'devops',
          minimum: L7,
          target: L12,
          ceiling: L14,
          mandatory: true,
          importance: 'critical',
          weight: 1.2,
          notes: 'Năng lực vận hành, không phải quyền hạn trong tổ chức.',
        },
        {
          skill: 'postgresql',
          minimum: L4,
          target: L7,
          ceiling: L12,
          mandatory: true,
          importance: 'high',
          weight: 1.0,
          notes: 'Vận hành cơ sở dữ liệu cho nền tảng dữ liệu của dự án.',
        },
        {
          skill: 'testing',
          minimum: L4,
          target: L10,
          ceiling: L13,
          mandatory: false,
          importance: 'medium',
          weight: 0.8,
          notes: 'Kiểm chứng các thay đổi khi triển khai.',
        },
      ],
    },
  ]

  for (const spec of roleSpecs) {
    const project = runtime.requireValue(projects[spec.project], `role-project:${spec.project}`)
    const where = {
      project_id: project.id,
      code: spec.code,
    }
    const existing = await findRow(trx, 'project_professional_roles', where)
    const roleId = existing?.id ?? runtime.uuid()
    const rolePayload = {
      source_template_id: spec.sourceTemplate
        ? (templateIdByCode.get(spec.sourceTemplate) ?? null)
        : null,
      name: spec.name,
      description: spec.description,
      is_active: true,
      version: 1,
      created_by: users[spec.createdBy].id,
      created_at: runtime.isoDaysAgo(40),
      updated_at: runtime.isoDaysAgo(1),
    }

    if (existing) {
      await trx.from('project_professional_roles').where('id', roleId).update(rolePayload)
    } else {
      await trx
        .insertQuery()
        .table('project_professional_roles')
        .insert({ id: roleId, ...where, ...rolePayload })
    }

    let sortOrder = 0
    for (const skill of spec.skills) {
      const projectSkillId = runtime.requireValue(
        projectSkillMap[`${spec.project}:${skill.skill}`],
        `project-role-skill:${spec.project}:${skill.skill}`
      )
      const skillWhere = {
        project_professional_role_id: roleId,
        project_skill_id: projectSkillId,
      }
      const existingSkill = await findRow(trx, 'project_professional_role_skills', skillWhere)
      const roleSkillId = existingSkill?.id ?? runtime.uuid()
      const skillPayload = {
        minimum_level_id: levelMap[skill.minimum],
        target_level_id: levelMap[skill.target],
        assessment_ceiling_level_id: levelMap[skill.ceiling],
        is_mandatory: skill.mandatory,
        importance: skill.importance,
        weight: skill.weight,
        sort_order: sortOrder++,
        notes: skill.notes,
        created_at: runtime.isoDaysAgo(40),
        updated_at: runtime.isoDaysAgo(1),
      }

      if (existingSkill) {
        await trx
          .from('project_professional_role_skills')
          .where('id', roleSkillId)
          .update(skillPayload)
      } else {
        await trx
          .insertQuery()
          .table('project_professional_role_skills')
          .insert({ id: roleSkillId, ...skillWhere, ...skillPayload })
      }
    }
  }
}
