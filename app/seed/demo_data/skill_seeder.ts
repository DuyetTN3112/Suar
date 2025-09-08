import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type { SeedRuntime } from './seed_runtime.js'
import { findRow } from './seed_utils.js'
import type { ProjectKey, SeededProject, SeededUser, UserKey } from './types.js'

interface ProficiencyLevelSeedRow {
  id: string
  code: string
  ordinal: number
}

async function seedProficiencyScales(
  runtime: SeedRuntime,
  trx: TransactionClientContract
): Promise<string> {
  const scaleCode = 'system_default'
  const existingScale = await findRow(trx, 'proficiency_scales', { code: scaleCode })
  const scaleId = existingScale?.id ?? runtime.uuid()

  const scalePayload = {
    code: scaleCode,
    name: 'System Default Scale',
    version: 1,
    is_active: true,
    created_at: runtime.isoDaysAgo(90),
    updated_at: runtime.isoDaysAgo(1),
  }

  if (existingScale) {
    await trx.from('proficiency_scales').where('id', scaleId).update(scalePayload)
  } else {
    await trx
      .insertQuery()
      .table('proficiency_scales')
      .insert({ id: scaleId, ...scalePayload })
  }

  const levelSpecs = [
    [1, 'beginner', 'Beginner', 'BG', 0.0],
    [2, 'elementary', 'Elementary', 'EL', 0.1428],
    [3, 'junior', 'Junior', 'JR', 0.2857],
    [4, 'middle', 'Middle', 'MD', 0.4285],
    [5, 'senior', 'Senior', 'SR', 0.5714],
    [6, 'lead', 'Lead', 'LD', 0.7142],
    [7, 'principal', 'Principal', 'PR', 0.8571],
    [8, 'master', 'Master', 'MS', 1.0],
  ] as const

  for (const [ordinal, code, displayName, shortName, normalizedVal] of levelSpecs) {
    const existingLevel = await findRow(trx, 'proficiency_levels', { scale_id: scaleId, ordinal })
    const levelId = existingLevel?.id ?? runtime.uuid()
    const levelPayload = {
      scale_id: scaleId,
      ordinal,
      code,
      display_name: displayName,
      short_name: shortName,
      normalized_value: normalizedVal,
      generic_description: `${displayName} level for skills evaluation`,
      sort_order: ordinal,
      created_at: runtime.isoDaysAgo(90),
      updated_at: runtime.isoDaysAgo(1),
    }

    if (existingLevel) {
      await trx.from('proficiency_levels').where('id', levelId).update(levelPayload)
    } else {
      await trx
        .insertQuery()
        .table('proficiency_levels')
        .insert({ id: levelId, ...levelPayload })
    }
  }

  return scaleId
}

export async function seedSkills(
  runtime: SeedRuntime,
  trx: TransactionClientContract
): Promise<Record<string, string>> {
  await seedProficiencyScales(runtime, trx)

  const skillSpecs = [
    ['react', 'React', 'technical'],
    ['nodejs', 'Node.js', 'technical'],
    ['typescript', 'TypeScript', 'technical'],
    ['svelte', 'Svelte', 'technical'],
    ['postgresql', 'PostgreSQL', 'technical'],
    ['devops', 'DevOps', 'technical'],
    ['testing', 'Testing & QA', 'delivery'],
    ['code_review', 'Code Review', 'delivery'],
    ['communication', 'Communication', 'soft_skill'],
    ['problem_solving', 'Problem Solving', 'soft_skill'],
    ['leadership', 'Leadership', 'soft_skill'],
  ] as const

  const result: Record<string, string> = {}

  for (const [code, name, category] of skillSpecs) {
    const existing = await findRow(trx, 'skills', { skill_code: code })
    const id = existing?.id ?? runtime.uuid()
    const payload = {
      category_code: category,
      display_type: 'spider_chart',
      skill_code: code,
      skill_name: name,
      description: `${name} - seeded demo skill for UI verification`,
      icon_url: `https://cdn.suar.local/skills/${code}.svg`,
      is_active: true,
      sort_order: Object.keys(result).length,
      created_at: runtime.isoDaysAgo(90),
      updated_at: runtime.isoDaysAgo(1),
    }

    if (existing) {
      await trx.from('skills').where('id', id).update(payload)
    } else {
      await trx
        .insertQuery()
        .table('skills')
        .insert({ id, ...payload })
    }

    result[code] = id
  }

  // Seed skill aliases for TypeScript
  const tsId = result.typescript
  if (tsId) {
    const tsAliases = [
      { alias: 'TS', locale: 'en', source: 'manual', is_primary: true },
      { alias: 'TypeScript', locale: 'en', source: 'manual', is_primary: false },
    ]
    for (const item of tsAliases) {
      const norm = item.alias
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]/g, '')
      const existingAlias = await findRow(trx, 'skill_aliases', { normalized_alias: norm })
      const aliasPayload = {
        skill_id: tsId,
        alias: item.alias,
        normalized_alias: norm,
        locale: item.locale,
        source: item.source,
        is_primary: item.is_primary,
        created_at: runtime.isoDaysAgo(90),
        updated_at: runtime.isoDaysAgo(1),
      }
      if (existingAlias) {
        await trx.from('skill_aliases').where('id', existingAlias.id).update(aliasPayload)
      } else {
        await trx
          .insertQuery()
          .table('skill_aliases')
          .insert({ id: runtime.uuid(), ...aliasPayload })
      }
    }
  }

  // Seed skill aliases for PostgreSQL
  const pgId = result.postgresql
  if (pgId) {
    const pgAliases = [
      { alias: 'Postgres', locale: 'en', source: 'manual', is_primary: true },
      { alias: 'pg', locale: 'en', source: 'manual', is_primary: false },
    ]
    for (const item of pgAliases) {
      const norm = item.alias
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]/g, '')
      const existingAlias = await findRow(trx, 'skill_aliases', { normalized_alias: norm })
      const aliasPayload = {
        skill_id: pgId,
        alias: item.alias,
        normalized_alias: norm,
        locale: item.locale,
        source: item.source,
        is_primary: item.is_primary,
        created_at: runtime.isoDaysAgo(90),
        updated_at: runtime.isoDaysAgo(1),
      }
      if (existingAlias) {
        await trx.from('skill_aliases').where('id', existingAlias.id).update(aliasPayload)
      } else {
        await trx
          .insertQuery()
          .table('skill_aliases')
          .insert({ id: runtime.uuid(), ...aliasPayload })
      }
    }
  }

  const rubricSeeds = [
    ['typescript', 'TypeScript', 'type-safe application code'],
    ['react', 'React', 'component architecture and client interaction'],
    ['nodejs', 'Node.js', 'server-side runtime and API behavior'],
    ['communication', 'Communication', 'clear collaboration and expectation management'],
    ['problem_solving', 'Problem Solving', 'structured diagnosis and trade-off decisions'],
    ['testing', 'Testing & QA', 'delivery verification and regression control'],
  ] as const

  for (const [skillCode, displayName, focus] of rubricSeeds) {
    const skillId = result[skillCode]
    if (skillId) {
      await seedPublishedRubric(runtime, trx, skillId, displayName, focus)
    }
  }

  return result
}

async function seedPublishedRubric(
  runtime: SeedRuntime,
  trx: TransactionClientContract,
  skillId: string,
  displayName: string,
  focus: string
): Promise<string> {
  const existingVer = await findRow(trx, 'skill_rubric_versions', { skill_id: skillId, version: 1 })
  const verId = existingVer?.id ?? runtime.uuid()
  const verPayload = {
    skill_id: skillId,
    version: 1,
    status: 'published',
    effective_from: runtime.isoDaysAgo(90),
    effective_to: null,
    created_by: null,
    change_summary: `Initial ${displayName} rubric`,
    created_at: runtime.isoDaysAgo(90),
    updated_at: runtime.isoDaysAgo(1),
  }

  if (existingVer) {
    await trx.from('skill_rubric_versions').where('id', verId).update(verPayload)
  } else {
    await trx
      .insertQuery()
      .table('skill_rubric_versions')
      .insert({ id: verId, ...verPayload })
  }

  const levels = (await trx
    .from('proficiency_levels')
    .select('id', 'code', 'ordinal')) as ProficiencyLevelSeedRow[]
  for (const lvl of levels) {
    const existingLvl = await findRow(trx, 'skill_rubric_levels', {
      rubric_version_id: verId,
      proficiency_level_id: lvl.id,
    })
    const lvlId = existingLvl?.id ?? runtime.uuid()
    const lvlPayload = {
      rubric_version_id: verId,
      proficiency_level_id: lvl.id,
      summary: `${displayName} level ${lvl.code} expectations for ${focus}.`,
      knowledge_expectations: JSON.stringify([
        `Understands ${focus} concepts expected at ${lvl.code} level.`,
      ]),
      observable_behaviors: JSON.stringify([
        `Delivers ${displayName} work with ${lvl.code} level consistency.`,
      ]),
      independence_expectations: `Operates at ${lvl.code} independence for ${displayName}.`,
      complexity_expectations: `Handles ${lvl.code} complexity in ${focus}.`,
      impact_scope_expectations: `Creates ${lvl.code} scope impact through ${displayName}.`,
      positive_examples: JSON.stringify([`Evidence shows reliable ${focus} decisions.`]),
      negative_examples: JSON.stringify([`Evidence lacks repeatable ${focus} behavior.`]),
      evidence_guidance: `Verify ${displayName} via task evidence, review comments, and delivery artifacts.`,
      created_at: runtime.isoDaysAgo(90),
      updated_at: runtime.isoDaysAgo(1),
    }

    if (existingLvl) {
      await trx.from('skill_rubric_levels').where('id', lvlId).update(lvlPayload)
    } else {
      await trx
        .insertQuery()
        .table('skill_rubric_levels')
        .insert({ id: lvlId, ...lvlPayload })
    }
  }

  return verId
}

/**
 * Seed default professional role templates.
 * Idempotent — uses `code` as the unique identifier.
 *
 * @param skillMap  Map of skill_code → UUID from seedSkills()
 * @param levelMap  Map of level_code → UUID, obtained from proficiency_levels table
 */
export async function seedProfessionalRoleTemplates(
  runtime: SeedRuntime,
  trx: TransactionClientContract,
  skillMap: Record<string, string>,
  levelMap: Record<string, string>
): Promise<void> {
  // Define templates: [code, name, description]
  const templates = [
    [
      'frontend_engineer',
      'Frontend Engineer',
      'Designs and builds user interfaces using modern web technologies.',
    ],
    [
      'backend_engineer',
      'Backend Engineer',
      'Designs and builds server-side systems, APIs, and databases.',
    ],
    [
      'fullstack_engineer',
      'Fullstack Engineer',
      'Builds product features across frontend, backend, and data persistence boundaries.',
    ],
    [
      'devops_engineer',
      'DevOps Engineer',
      'Operates deployment, reliability, and delivery automation workflows.',
    ],
    [
      'qa_engineer',
      'QA Engineer',
      'Ensures software quality through systematic testing and review.',
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

    // Define skills per template: [skill_code, min_level_code, target_level_code, ceiling_level_code, is_mandatory, importance]
    const templateSkillSpecs: Record<
      string,
      [string, string, string, string, boolean, 'low' | 'medium' | 'high' | 'critical'][]
    > = {
      frontend_engineer: [
        ['react', 'junior', 'senior', 'principal', true, 'high'],
        ['typescript', 'junior', 'senior', 'master', true, 'critical'],
        ['svelte', 'elementary', 'senior', 'principal', true, 'high'],
        ['testing', 'junior', 'middle', 'lead', false, 'medium'],
        ['communication', 'junior', 'middle', 'senior', false, 'medium'],
      ],
      backend_engineer: [
        ['nodejs', 'junior', 'senior', 'master', true, 'critical'],
        ['typescript', 'junior', 'senior', 'master', true, 'critical'],
        ['postgresql', 'junior', 'senior', 'master', true, 'high'],
        ['devops', 'elementary', 'middle', 'lead', false, 'medium'],
        ['testing', 'junior', 'senior', 'principal', true, 'high'],
      ],
      fullstack_engineer: [
        ['react', 'junior', 'senior', 'principal', true, 'high'],
        ['nodejs', 'junior', 'senior', 'master', true, 'critical'],
        ['typescript', 'junior', 'senior', 'master', true, 'critical'],
        ['postgresql', 'elementary', 'middle', 'lead', false, 'medium'],
        ['communication', 'junior', 'middle', 'senior', false, 'medium'],
      ],
      devops_engineer: [
        ['devops', 'middle', 'lead', 'master', true, 'critical'],
        ['testing', 'junior', 'senior', 'principal', true, 'high'],
        ['postgresql', 'elementary', 'middle', 'lead', false, 'medium'],
        ['communication', 'junior', 'middle', 'senior', false, 'medium'],
      ],
      qa_engineer: [
        ['testing', 'middle', 'lead', 'master', true, 'critical'],
        ['code_review', 'junior', 'senior', 'principal', true, 'high'],
        ['communication', 'middle', 'senior', 'master', false, 'high'],
        ['problem_solving', 'junior', 'senior', 'principal', false, 'medium'],
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

export async function seedProjectSkillCatalog(
  runtime: SeedRuntime,
  trx: TransactionClientContract,
  users: Record<UserKey, SeededUser>,
  projects: Record<ProjectKey, SeededProject>,
  skillMap: Record<string, string>
): Promise<Record<string, string>> {
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
    { project: 'orgAPlatform', skill: 'communication', addedBy: 'orgAdmin' },
    { project: 'orgAPlatform', skill: 'problem_solving', addedBy: 'orgAdmin' },
    { project: 'orgAPlatform', skill: 'testing', addedBy: 'orgAdmin' },
    { project: 'orgAOperations', skill: 'testing', addedBy: 'orgAdmin' },
    { project: 'orgAOperations', skill: 'code_review', addedBy: 'orgAdmin' },
    { project: 'orgAOperations', skill: 'communication', addedBy: 'orgAdmin' },
    { project: 'orgAOperations', skill: 'problem_solving', addedBy: 'orgAdmin' },
    { project: 'orgEDataOps', skill: 'postgresql', addedBy: 'freelancerTwo' },
    { project: 'orgEDataOps', skill: 'nodejs', addedBy: 'freelancerTwo' },
    { project: 'orgEDataOps', skill: 'devops', addedBy: 'freelancerTwo' },
    { project: 'orgEDataOps', skill: 'testing', addedBy: 'orgAdmin' },
  ]

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
      description: 'Customized project role focused on product UI delivery.',
      sourceTemplate: 'frontend_engineer',
      createdBy: 'owner',
      skills: [
        {
          skill: 'react',
          minimum: 'junior',
          target: 'senior',
          ceiling: 'principal',
          mandatory: true,
          importance: 'high',
          weight: 1.1,
          notes: 'React required for marketplace/profile surfaces.',
        },
        {
          skill: 'typescript',
          minimum: 'junior',
          target: 'senior',
          ceiling: 'master',
          mandatory: true,
          importance: 'critical',
          weight: 1.2,
          notes: 'Type safety required across task and review pages.',
        },
        {
          skill: 'communication',
          minimum: 'junior',
          target: 'middle',
          ceiling: 'senior',
          mandatory: false,
          importance: 'medium',
          weight: 0.8,
          notes: 'Collaboration skill, not authorization role.',
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
          minimum: 'junior',
          target: 'senior',
          ceiling: 'master',
          mandatory: true,
          importance: 'critical',
          weight: 1.2,
          notes: 'Backend runtime capability for AdonisJS flows.',
        },
        {
          skill: 'postgresql',
          minimum: 'junior',
          target: 'middle',
          ceiling: 'lead',
          mandatory: true,
          importance: 'high',
          weight: 1.0,
          notes: 'Persistence work for profile/review aggregation.',
        },
        {
          skill: 'problem_solving',
          minimum: 'middle',
          target: 'senior',
          ceiling: 'principal',
          mandatory: false,
          importance: 'high',
          weight: 1.0,
          notes: 'Used for debugging and architecture trade-offs.',
        },
      ],
    },
    {
      project: 'orgAOperations',
      code: 'quality_reviewer',
      name: 'Quality Reviewer',
      description: 'Project role for review and regression verification.',
      sourceTemplate: 'qa_engineer',
      createdBy: 'orgAdmin',
      skills: [
        {
          skill: 'testing',
          minimum: 'middle',
          target: 'lead',
          ceiling: 'master',
          mandatory: true,
          importance: 'critical',
          weight: 1.2,
          notes: 'Delivery dimension represented as skill catalog item by ADR.',
        },
        {
          skill: 'code_review',
          minimum: 'junior',
          target: 'senior',
          ceiling: 'principal',
          mandatory: true,
          importance: 'high',
          weight: 1.0,
          notes: 'Review contribution role remains separate from professional role.',
        },
      ],
    },
    {
      project: 'orgEDataOps',
      code: 'devops_data_operator',
      name: 'DevOps Data Operator',
      description: 'Project role for data ops deployment and reliability checks.',
      sourceTemplate: 'devops_engineer',
      createdBy: 'freelancerTwo',
      skills: [
        {
          skill: 'devops',
          minimum: 'middle',
          target: 'lead',
          ceiling: 'master',
          mandatory: true,
          importance: 'critical',
          weight: 1.2,
          notes: 'Operational capability, not organization permission.',
        },
        {
          skill: 'postgresql',
          minimum: 'junior',
          target: 'middle',
          ceiling: 'lead',
          mandatory: true,
          importance: 'high',
          weight: 1.0,
          notes: 'Database operations for seeded data platform scenario.',
        },
        {
          skill: 'testing',
          minimum: 'junior',
          target: 'senior',
          ceiling: 'principal',
          mandatory: false,
          importance: 'medium',
          weight: 0.8,
          notes: 'Verification of deployment changes.',
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
