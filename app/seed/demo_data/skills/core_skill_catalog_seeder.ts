import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type { SeedRuntime } from '../seed_runtime.js'
import { findRow } from '../seed_utils.js'

import {
  type ProficiencyLevelSeedRow,
  seedProficiencyScales,
} from './proficiency_scale_seeder.js'

import { buildSkillRubricLevelDescriptorFields } from '#modules/skills/infra/adapters/rubric-and-proficiency/build_skill_rubric_level_descriptor_fields'

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

export async function seedPublishedRubric(
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
