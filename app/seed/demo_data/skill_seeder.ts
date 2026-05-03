import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type { SeedRuntime } from './seed_runtime.js'
import { findRow } from './seed_utils.js'
import type { ProjectKey, SeededProject, SeededUser, UserKey } from './types.js'

import { buildSkillRubricLevelDescriptorFields } from '#modules/skills/infra/adapters/rubric-and-proficiency/build_skill_rubric_level_descriptor_fields'
import { getSystemDefaultProficiencyScaleSeed } from '#modules/skills/infra/adapters/rubric-and-proficiency/system_default_proficiency_scale'
import { CanonicalProficiencyLevelCode } from '#modules/skills/public_contracts/rubric-and-proficiency/proficiency_level_constants'

interface ProficiencyLevelSeedRow {
  id: string
  code: string
  ordinal: number
  expected_knowledge: string | null
  expected_execution: string | null
  autonomy_descriptor: string | null
  complexity_descriptor: string | null
  quality_descriptor: string | null
  collaboration_descriptor: string | null
  observable_behaviors: string[] | null
  positive_examples: string[] | null
  negative_examples: string[] | null
  evidence_guidance: string | null
  ceiling_guidance: string | null
}

const L2 = CanonicalProficiencyLevelCode.L2
const L4 = CanonicalProficiencyLevelCode.L4
const L7 = CanonicalProficiencyLevelCode.L7
const L10 = CanonicalProficiencyLevelCode.L10
const L12 = CanonicalProficiencyLevelCode.L12
const L13 = CanonicalProficiencyLevelCode.L13
const L14 = CanonicalProficiencyLevelCode.L14

async function seedProficiencyScales(
  runtime: SeedRuntime,
  trx: TransactionClientContract
): Promise<string> {
  const scaleSeed = getSystemDefaultProficiencyScaleSeed()
  const scaleCode = scaleSeed.code
  const existingScale = await findRow(trx, 'proficiency_scales', { code: scaleCode })
  const scaleId = existingScale?.id ?? runtime.uuid()

  const scalePayload = {
    code: scaleCode,
    name: scaleSeed.name,
    version: scaleSeed.version,
    is_active: scaleSeed.isActive,
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

  for (const levelSpec of scaleSeed.levels) {
    const {
      ordinal,
      code,
      displayName,
      shortName,
      normalizedValue,
      sortOrder,
      genericDescription,
      expectedKnowledge,
      expectedExecution,
      autonomyDescriptor,
      complexityDescriptor,
      qualityDescriptor,
      collaborationDescriptor,
      observableBehaviors,
      positiveExamples,
      negativeExamples,
      evidenceGuidance,
      ceilingGuidance,
    } = levelSpec
    const existingLevel = await findRow(trx, 'proficiency_levels', { scale_id: scaleId, ordinal })
    const levelId = existingLevel?.id ?? runtime.uuid()
    const levelPayload = {
      scale_id: scaleId,
      ordinal,
      code,
      display_name: displayName,
      short_name: shortName,
      normalized_value: normalizedValue,
      generic_description: genericDescription,
      sort_order: sortOrder,
      expected_knowledge: expectedKnowledge,
      expected_execution: expectedExecution,
      autonomy_descriptor: autonomyDescriptor,
      complexity_descriptor: complexityDescriptor,
      quality_descriptor: qualityDescriptor,
      collaboration_descriptor: collaborationDescriptor,
      observable_behaviors: JSON.stringify(observableBehaviors),
      positive_examples: JSON.stringify(positiveExamples),
      negative_examples: JSON.stringify(negativeExamples),
      evidence_guidance: evidenceGuidance,
      ceiling_guidance: ceilingGuidance,
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
    ['react', 'React', 'technology'],
    ['nodejs', 'Node.js', 'technology'],
    ['typescript', 'TypeScript', 'technology'],
    ['svelte', 'Svelte', 'technology'],
    ['adonisjs', 'AdonisJS', 'technology'],
    ['vue', 'Vue', 'technology'],
    ['angular', 'Angular', 'technology'],
    ['nextjs', 'Next.js', 'technology'],
    ['postgresql', 'PostgreSQL', 'technology'],
    ['redis', 'Redis', 'technology'],
    ['docker', 'Docker', 'technology'],
    ['kubernetes', 'Kubernetes', 'technology'],
    ['elasticsearch', 'Elasticsearch', 'technology'],
    ['graphql', 'GraphQL', 'technology'],
    ['rest_api', 'REST API', 'technology'],
    ['python', 'Python', 'technology'],
    ['go', 'Go', 'technology'],
    ['java', 'Java', 'technology'],
    ['aws', 'AWS', 'technology'],
    ['gcp', 'Google Cloud', 'technology'],
    ['devops', 'DevOps', 'technology'],
    ['testing', 'Testing & QA', 'engineering'],
    ['test_automation', 'Test Automation', 'engineering'],
    ['tdd', 'Test-Driven Development', 'engineering'],
    ['code_review', 'Code Review', 'engineering'],
    ['refactoring', 'Refactoring', 'engineering'],
    ['oop', 'Object-Oriented Programming', 'engineering'],
    ['design_patterns', 'Design Patterns', 'engineering'],
    ['clean_code', 'Clean Code', 'engineering'],
    ['api_design', 'API Design', 'engineering'],
    ['system_design', 'System Design', 'engineering'],
    ['design_system', 'Design System', 'engineering'],
    ['technical_design', 'Technical Design', 'engineering'],
    ['ci_cd', 'CI/CD', 'engineering'],
    ['observability', 'Observability', 'engineering'],
    ['security_engineering', 'Security Engineering', 'engineering'],
    ['data_modeling', 'Data Modeling', 'engineering'],
    ['performance_engineering', 'Performance Engineering', 'engineering'],
    ['accessibility', 'Accessibility', 'engineering'],
    ['integration_testing', 'Integration Testing', 'engineering'],
    ['communication', 'Communication', 'soft_skill'],
    ['problem_solving', 'Problem Solving', 'soft_skill'],
    ['leadership', 'Leadership', 'soft_skill'],
    ['teamwork', 'Teamwork', 'soft_skill'],
    ['stakeholder_management', 'Stakeholder Management', 'soft_skill'],
    ['mentoring', 'Mentoring', 'soft_skill'],
    ['conflict_resolution', 'Conflict Resolution', 'soft_skill'],
    ['product_thinking', 'Product Thinking', 'soft_skill'],
    ['ownership', 'Ownership', 'soft_skill'],
    ['adaptability', 'Adaptability', 'soft_skill'],
    ['planning', 'Planning', 'delivery'],
    ['estimation', 'Estimation', 'delivery'],
    ['release_management', 'Release Management', 'delivery'],
    ['risk_tracking', 'Risk Tracking', 'delivery'],
    ['documentation', 'Documentation', 'delivery'],
    ['sprint_management', 'Sprint Management', 'delivery'],
    ['incident_response', 'Incident Response', 'delivery'],
    ['qa_signoff', 'QA Sign-off', 'delivery'],
    ['rollout_planning', 'Rollout Planning', 'delivery'],
    ['monitoring', 'Monitoring', 'delivery'],
    ['requirements_breakdown', 'Requirements Breakdown', 'delivery'],
    ['customer_feedback', 'Customer Feedback', 'delivery'],
  ] as const

  const skillDescriptions: Record<string, string> = {
    react: 'Xây dựng giao diện web theo component với React và hệ sinh thái đi kèm.',
    nodejs: 'Phát triển dịch vụ phía máy chủ và công cụ dòng lệnh trên nền Node.js.',
    typescript: 'Viết mã JavaScript an toàn kiểu với TypeScript cho cả frontend và backend.',
    svelte: 'Xây dựng giao diện phản ứng nhanh, gọn nhẹ với Svelte và SvelteKit.',
    adonisjs: 'Phát triển ứng dụng web đầy đủ tầng với framework AdonisJS.',
    vue: 'Xây dựng giao diện web theo component với Vue và hệ sinh thái đi kèm.',
    angular: 'Phát triển ứng dụng web quy mô lớn với Angular và kiến trúc module.',
    nextjs: 'Xây dựng ứng dụng React kết xuất phía máy chủ và tối ưu SEO với Next.js.',
    postgresql: 'Thiết kế lược đồ, tối ưu truy vấn và vận hành cơ sở dữ liệu PostgreSQL.',
    redis: 'Sử dụng Redis cho cache, hàng đợi và dữ liệu phiên với độ trễ thấp.',
    docker: 'Đóng gói, phân phối và chạy ứng dụng nhất quán bằng container Docker.',
    kubernetes: 'Triển khai và điều phối ứng dụng container hóa trên Kubernetes.',
    elasticsearch: 'Xây dựng tìm kiếm toàn văn và phân tích dữ liệu với Elasticsearch.',
    graphql: 'Thiết kế và triển khai API linh hoạt theo chuẩn GraphQL.',
    rest_api: 'Thiết kế API REST nhất quán, dễ mở rộng và có tài liệu rõ ràng.',
    python: 'Phát triển dịch vụ, tự động hóa và xử lý dữ liệu bằng Python.',
    go: 'Xây dựng dịch vụ hiệu năng cao và công cụ hạ tầng bằng ngôn ngữ Go.',
    java: 'Phát triển hệ thống doanh nghiệp ổn định trên nền tảng Java.',
    aws: 'Thiết kế và vận hành hạ tầng đám mây trên Amazon Web Services.',
    gcp: 'Thiết kế và vận hành hạ tầng đám mây trên Google Cloud.',
    devops: 'Kết nối phát triển và vận hành: tự động hóa hạ tầng, giám sát và triển khai.',
    testing: 'Lập kế hoạch và thực thi kiểm thử bảo đảm chất lượng bàn giao.',
    test_automation: 'Xây dựng bộ kiểm thử tự động ổn định cho pipeline phát hành.',
    tdd: 'Phát triển theo hướng kiểm thử: viết test trước, cài đặt sau.',
    code_review: 'Đánh giá mã nguồn có căn cứ, phản hồi mang tính xây dựng.',
    refactoring: 'Cải thiện cấu trúc mã an toàn mà không thay đổi hành vi.',
    oop: 'Vận dụng lập trình hướng đối tượng để mô hình hóa nghiệp vụ.',
    design_patterns: 'Áp dụng mẫu thiết kế phù hợp cho các bài toán lặp lại.',
    clean_code: 'Viết mã dễ đọc, dễ bảo trì theo nguyên tắc clean code.',
    api_design: 'Thiết kế hợp đồng API rõ ràng, ổn định và dễ tích hợp.',
    system_design: 'Thiết kế kiến trúc hệ thống cân bằng hiệu năng, chi phí và độ tin cậy.',
    design_system: 'Xây dựng hệ thống thiết kế nhất quán cho sản phẩm số.',
    technical_design: 'Soạn tài liệu thiết kế kỹ thuật làm căn cứ triển khai và nghiệm thu.',
    ci_cd: 'Thiết lập pipeline tích hợp và triển khai liên tục tin cậy.',
    observability: 'Thiết kế log, metric và trace để chẩn đoán hệ thống nhanh chóng.',
    security_engineering: 'Rà soát và gia cố bảo mật ở tầng ứng dụng và hạ tầng.',
    data_modeling: 'Mô hình hóa dữ liệu phản ánh đúng nghiệp vụ và dễ mở rộng.',
    performance_engineering: 'Đo lường và tối ưu hiệu năng dựa trên số liệu thực tế.',
    accessibility: 'Bảo đảm sản phẩm tiếp cận được với mọi nhóm người dùng.',
    integration_testing: 'Kiểm thử tích hợp giữa các module và dịch vụ phụ thuộc.',
    communication: 'Trao đổi rõ ràng, đúng trọng tâm với các bên liên quan.',
    problem_solving: 'Phân tích nguyên nhân gốc và đề xuất phương án khả thi.',
    leadership: 'Dẫn dắt đội ngũ, định hướng mục tiêu và ra quyết định.',
    teamwork: 'Phối hợp hiệu quả trong nhóm đa chức năng.',
    stakeholder_management: 'Quản lý kỳ vọng và cam kết với các bên liên quan.',
    mentoring: 'Kèm cặp và phát triển năng lực cho thành viên khác.',
    conflict_resolution: 'Hòa giải bất đồng dựa trên dữ kiện và lợi ích chung.',
    product_thinking: 'Ra quyết định kỹ thuật gắn với giá trị người dùng và sản phẩm.',
    ownership: 'Chịu trách nhiệm trọn vẹn từ nhận việc đến bàn giao.',
    adaptability: 'Thích ứng nhanh với thay đổi phạm vi và ưu tiên.',
    planning: 'Lập kế hoạch công việc với mốc bàn giao và phụ thuộc rõ ràng.',
    estimation: 'Ước lượng khối lượng công việc sát thực tế và có căn cứ.',
    release_management: 'Điều phối phát hành an toàn, có phương án rollback.',
    risk_tracking: 'Nhận diện, theo dõi và giảm thiểu rủi ro trong dự án.',
    documentation: 'Soạn tài liệu kỹ thuật và nghiệp vụ đầy đủ, dễ tra cứu.',
    sprint_management: 'Vận hành sprint: lập kế hoạch, theo dõi và tổng kết.',
    incident_response: 'Ứng phó sự cố có quy trình, ưu tiên khôi phục dịch vụ.',
    qa_signoff: 'Nghiệm thu chất lượng trước khi phát hành theo tiêu chí thống nhất.',
    rollout_planning: 'Lập kế hoạch triển khai theo giai đoạn với tiêu chí dừng rõ ràng.',
    monitoring: 'Theo dõi sức khỏe hệ thống và cảnh báo chủ động.',
    requirements_breakdown: 'Phân rã yêu cầu thành hạng mục triển khai được và đo được.',
    customer_feedback: 'Thu thập và chuyển hóa phản hồi người dùng thành cải tiến sản phẩm.',
  }

  const result: Record<string, string> = {}

  for (const [code, name, category] of skillSpecs) {
    const existing = await findRow(trx, 'skills', { skill_code: code })
    const id = existing?.id ?? runtime.uuid()
    const payload = {
      category_code: category,
      display_type: 'spider_chart',
      skill_code: code,
      skill_name: name,
      description: skillDescriptions[code] ?? `Năng lực chuyên môn ${name} được xác thực qua chứng cứ bàn giao.`,
      icon_url: null,
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
  const tsId = result['typescript']
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
  const pgId = result['postgresql']
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
    ['api_design', 'API Design', 'clear API contracts and integration boundaries'],
    ['clean_code', 'Clean Code', 'maintainable implementation structure'],
    ['system_design', 'System Design', 'scalable architecture decisions'],
    ['communication', 'Communication', 'clear collaboration and expectation management'],
    ['problem_solving', 'Problem Solving', 'structured diagnosis and trade-off decisions'],
    ['testing', 'Testing & QA', 'quality verification and regression control'],
    ['planning', 'Planning', 'delivery planning and work sequencing'],
    ['release_management', 'Release Management', 'release readiness and rollback coordination'],
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
    .select(
      'id',
      'code',
      'ordinal',
      'expected_knowledge',
      'expected_execution',
      'autonomy_descriptor',
      'complexity_descriptor',
      'quality_descriptor',
      'collaboration_descriptor',
      'observable_behaviors',
      'positive_examples',
      'negative_examples',
      'evidence_guidance',
      'ceiling_guidance'
    )) as ProficiencyLevelSeedRow[]
  for (const lvl of levels) {
    const existingLvl = await findRow(trx, 'skill_rubric_levels', {
      rubric_version_id: verId,
      proficiency_level_id: lvl.id,
    })
    const lvlId = existingLvl?.id ?? runtime.uuid()
    const descriptorFields = buildSkillRubricLevelDescriptorFields(lvl)
    const lvlPayload = {
      rubric_version_id: verId,
      proficiency_level_id: lvl.id,
      summary: `${displayName} level ${lvl.code} expectations for ${focus}.`,
      knowledge_expectations: JSON.stringify(
        descriptorFields.knowledge_expectations ?? [
          `Understands ${focus} concepts expected at ${lvl.code} level.`,
        ]
      ),
      observable_behaviors: JSON.stringify(
        descriptorFields.observable_behaviors ?? [
          `Delivers ${displayName} work with ${lvl.code} level consistency.`,
        ]
      ),
      independence_expectations: `Operates at ${lvl.code} independence for ${displayName}.`,
      complexity_expectations: `Handles ${lvl.code} complexity in ${focus}.`,
      impact_scope_expectations: `Creates ${lvl.code} scope impact through ${displayName}.`,
      positive_examples: JSON.stringify(
        descriptorFields.positive_examples ?? [`Evidence shows reliable ${focus} decisions.`]
      ),
      negative_examples: JSON.stringify(
        descriptorFields.negative_examples ?? [`Evidence lacks repeatable ${focus} behavior.`]
      ),
      evidence_guidance:
        descriptorFields.evidence_guidance ??
        `Verify ${displayName} via task evidence, review comments, and delivery artifacts.`,
      expected_execution: descriptorFields.expected_execution,
      autonomy_descriptor: descriptorFields.autonomy_descriptor,
      complexity_descriptor: descriptorFields.complexity_descriptor,
      quality_descriptor: descriptorFields.quality_descriptor,
      collaboration_descriptor: descriptorFields.collaboration_descriptor,
      ceiling_guidance: descriptorFields.ceiling_guidance,
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
 * @param levelMap  Map of public proficiency code → UUID, obtained from proficiency_levels table
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

    // Define skills per template: [skill_code, minimum public code, target public code, ceiling public code, is_mandatory, importance]
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

export async function seedProjectSkillCatalog(
  runtime: SeedRuntime,
  trx: TransactionClientContract,
  users: Record<UserKey, SeededUser>,
  projects: Record<ProjectKey, SeededProject>,
  skillMap: Record<string, string>
): Promise<Record<string, string>> {
  const { getSeededTaskSpecs } = await import('./task_specs.js')
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
