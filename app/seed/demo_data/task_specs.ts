import type { GeneratedProjectTaskSeedConfig, ProjectKey, TaskSpec } from './types.js'

export type TaskRequiredSkillCategory = 'technology' | 'engineering' | 'soft_skill' | 'delivery'

const TASK_REQUIRED_SKILL_CATEGORY_ORDER: TaskRequiredSkillCategory[] = [
  'technology',
  'engineering',
  'soft_skill',
  'delivery',
]

const TASK_REQUIRED_SKILL_CATEGORY_BY_CODE: Record<string, TaskRequiredSkillCategory> = {
  react: 'technology',
  nodejs: 'technology',
  typescript: 'technology',
  svelte: 'technology',
  postgresql: 'technology',
  devops: 'technology',
  testing: 'engineering',
  code_review: 'engineering',
  oop: 'engineering',
  design_patterns: 'engineering',
  clean_code: 'engineering',
  api_design: 'engineering',
  system_design: 'engineering',
  design_system: 'engineering',
  communication: 'soft_skill',
  problem_solving: 'soft_skill',
  leadership: 'soft_skill',
  planning: 'delivery',
  estimation: 'delivery',
  release_management: 'delivery',
  risk_tracking: 'delivery',
  documentation: 'delivery',
}

const TASK_REQUIRED_SKILL_FALLBACKS: Record<TaskRequiredSkillCategory, string> = {
  technology: 'typescript',
  engineering: 'api_design',
  soft_skill: 'communication',
  delivery: 'planning',
}

export function getTaskRequiredSkillCategory(skillCode: string): TaskRequiredSkillCategory | null {
  return TASK_REQUIRED_SKILL_CATEGORY_BY_CODE[skillCode] ?? null
}

function ensureFourCategoryRequiredSkills(skills: string[]): string[] {
  const requiredSkills = [...skills]

  for (const category of TASK_REQUIRED_SKILL_CATEGORY_ORDER) {
    const hasCategory = requiredSkills.some(
      (skillCode) => TASK_REQUIRED_SKILL_CATEGORY_BY_CODE[skillCode] === category
    )

    if (!hasCategory) {
      requiredSkills.push(TASK_REQUIRED_SKILL_FALLBACKS[category])
    }
  }

  return [...new Set(requiredSkills)]
}

export const TASK_SPECS: TaskSpec[] = [
  {
    key: 'member-org-switch',
    organization: 'orgA',
    project: 'orgAPlatform',
    creator: 'owner',
    assignee: 'member',
    title: 'Phân quyền theo không gian làm việc đa tổ chức',
    description:
      'Bảo đảm quyền truy cập, thanh điều hướng và màn hình mặc định luôn phản ánh đúng vai trò của người dùng tại từng tổ chức.',
    status: 'done',
    taskStatus: 'done',
    label: 'feature',
    priority: 'high',
    difficulty: 'medium',
    visibility: 'internal',
    dueDaysOffset: -14,
    assignmentCompletedDaysAgo: 12,
    assignmentEstimatedHours: 18,
    assignmentActualHours: 16,
    taskType: 'feature_development',
    acceptanceCriteria: [
      'Khi chuyển tổ chức, quyền và điều hướng cũ không còn được giữ trong phiên làm việc',
      'Thành viên tại học viện đối tác chỉ nhìn thấy chức năng phù hợp với vai trò được cấp',
    ],
    verificationMethod: 'manual_qa',
    expectedDeliverables: [
      'Luồng chuyển tổ chức theo vai trò',
      'Bộ kịch bản kiểm định phân quyền',
      'Video hướng dẫn nghiệm thu',
    ],
    contextBackground:
      'Suar phục vụ người dùng tham gia nhiều tổ chức với vai trò khác nhau, vì vậy ngữ cảnh phân quyền phải được tách biệt tuyệt đối.',
    impactScope: 'organization',
    techStack: ['Svelte', 'AdonisJS', 'PostgreSQL'],
    environment: 'staging',
    collaborationType: 'small_team',
    complexityNotes: 'Luồng phụ thuộc session current_organization_id và membership role.',
    measurableOutcomes: [
      { metric: 'role_switch_pass_rate', target: '100%' },
      { metric: 'wrong_redirect_count', target: 0 },
    ],
    learningObjectives: ['Role-based navigation', 'Organization context resolution'],
    domainTags: ['organization', 'rbac', 'navigation'],
    roleInTask: 'contributor',
    autonomyLevel: 'autonomous',
    problemCategory: 'new_capability',
    businessDomain: 'saas',
    estimatedUsersAffected: 42,
    requiredSkills: ensureFourCategoryRequiredSkills(['typescript', 'svelte', 'communication']),
  },
]

type ScenarioTaskInput = Pick<
  TaskSpec,
  | 'key'
  | 'organization'
  | 'project'
  | 'creator'
  | 'title'
  | 'description'
  | 'status'
  | 'label'
  | 'priority'
  | 'difficulty'
  | 'taskType'
  | 'problemCategory'
  | 'businessDomain'
  | 'requiredSkills'
> &
  Partial<
    Pick<
      TaskSpec,
      | 'assignee'
      | 'visibility'
      | 'taskStatus'
      | 'dueDaysOffset'
      | 'assignmentCompletedDaysAgo'
      | 'assignmentEstimatedHours'
      | 'assignmentActualHours'
      | 'verificationMethod'
      | 'impactScope'
      | 'techStack'
      | 'environment'
      | 'collaborationType'
      | 'roleInTask'
      | 'autonomyLevel'
      | 'estimatedUsersAffected'
      | 'applicationDeadlineDaysAhead'
      | 'acceptanceCriteria'
      | 'expectedDeliverables'
      | 'contextBackground'
      | 'complexityNotes'
      | 'measurableOutcomes'
      | 'learningObjectives'
      | 'domainTags'
    >
  >

function createScenarioTask(input: ScenarioTaskInput): TaskSpec {
  const assignmentEstimatedHours = input.assignmentEstimatedHours ?? 10
  const assignmentActualHours =
    input.assignmentActualHours ?? (input.status === 'done' ? assignmentEstimatedHours : 0)
  const taskStatus: TaskSpec['taskStatus'] =
    input.taskStatus ?? (input.status === 'in_review' ? 'in_testing' : input.status)
  const assignmentCompletedDaysAgo =
    input.assignmentCompletedDaysAgo ?? (input.status === 'done' ? 6 : undefined)

  return {
    key: input.key,
    organization: input.organization,
    project: input.project,
    creator: input.creator,
    ...(input.assignee !== undefined ? { assignee: input.assignee } : {}),
    title: input.title,
    description: input.description,
    status: input.status,
    taskStatus,
    label: input.label,
    priority: input.priority,
    difficulty: input.difficulty,
    visibility: input.visibility ?? 'internal',
    dueDaysOffset: input.dueDaysOffset ?? (input.status === 'done' ? -5 : 7),
    ...(assignmentCompletedDaysAgo !== undefined ? { assignmentCompletedDaysAgo } : {}),
    assignmentEstimatedHours,
    assignmentActualHours,
    taskType: input.taskType,
    acceptanceCriteria: input.acceptanceCriteria ?? [
      'Phạm vi, người phụ trách và trạng thái bàn giao được thể hiện nhất quán trên bảng dự án',
      'Chứng cứ bàn giao, đánh giá và lịch sử năng lực cùng tham chiếu một ngữ cảnh công việc',
    ],
    verificationMethod: input.verificationMethod ?? 'manual_qa',
    expectedDeliverables: input.expectedDeliverables ?? [
      'Kết quả bàn giao có thể nghiệm thu',
      'Bộ chứng cứ và đánh giá liên kết',
    ],
    contextBackground:
      input.contextBackground ??
      'Hạng mục thuộc lộ trình sản phẩm liên tổ chức, yêu cầu truy vết rõ trách nhiệm, chứng cứ bàn giao và kết quả đánh giá.',
    impactScope: input.impactScope ?? 'project',
    techStack: input.techStack ?? ['AdonisJS', 'Svelte', 'PostgreSQL'],
    environment: input.environment ?? 'staging',
    collaborationType: input.collaborationType ?? 'small_team',
    complexityNotes:
      input.complexityNotes ??
      'Công việc liên kết nhiều bên và nhiều giai đoạn nghiệm thu, vì vậy mốc thời gian và trách nhiệm phải được ghi nhận thống nhất.',
    measurableOutcomes: input.measurableOutcomes ?? [
      { metric: 'ty_le_nghiem_thu_dat', target: '100%' },
      { metric: 'so_chung_cu_lien_ket', target: 3 },
    ],
    learningObjectives: input.learningObjectives ?? [
      'Vận hành bàn giao liên chức năng',
      'Đánh giá dựa trên chứng cứ',
    ],
    domainTags: input.domainTags ?? [
      input.businessDomain.replace(/_/g, '-'),
      input.problemCategory.replace(/_/g, '-'),
      input.label,
    ],
    roleInTask: input.roleInTask ?? 'contributor',
    autonomyLevel: input.autonomyLevel ?? 'autonomous',
    problemCategory: input.problemCategory,
    businessDomain: input.businessDomain,
    estimatedUsersAffected: input.estimatedUsersAffected ?? 20,
    ...(input.applicationDeadlineDaysAhead !== undefined
      ? { applicationDeadlineDaysAhead: input.applicationDeadlineDaysAhead }
      : {}),
    requiredSkills: ensureFourCategoryRequiredSkills(input.requiredSkills),
  }
}

const SCENARIO_TASK_SPECS: TaskSpec[] = [
  createScenarioTask({
    key: 'member-profile-proof',
    organization: 'orgA',
    project: 'orgAPlatform',
    creator: 'owner',
    assignee: 'member',
    title: 'Xuất bản hồ sơ năng lực có chứng cứ',
    description:
      'Tổng hợp kết quả công việc, kỹ năng đã xác thực và chỉ số hiệu suất thành một hồ sơ năng lực có thể chia sẻ.',
    status: 'done',
    label: 'feature',
    priority: 'high',
    difficulty: 'hard',
    taskType: 'feature_development',
    problemCategory: 'new_capability',
    businessDomain: 'saas',
    acceptanceCriteria: [
      'Hồ sơ công khai hiển thị đúng kỹ năng đã xác thực, lịch sử bàn giao và chỉ số hiệu suất từ dữ liệu đánh giá',
      'Mỗi kỹ năng trên hồ sơ dẫn được về ít nhất một chứng cứ bàn giao đã nghiệm thu',
      'Liên kết chia sẻ hồ sơ hoạt động ở chế độ ẩn danh và không lộ dữ liệu nội bộ tổ chức',
    ],
    expectedDeliverables: [
      'Trang hồ sơ năng lực công khai kèm liên kết chia sẻ',
      'Bảng đối chiếu kỹ năng - chứng cứ - phiên đánh giá',
      'Ghi chú kiểm thử phân quyền khi xem hồ sơ từ ngoài tổ chức',
    ],
    contextBackground:
      'Hồ sơ năng lực là đầu ra trọng tâm của Suar: nhà tuyển dụng cần xem nhanh kỹ năng đã được xác thực qua chứng cứ thay vì tự khai.',
    complexityNotes:
      'Dữ liệu hồ sơ tổng hợp từ nhiều nguồn (đánh giá, bàn giao, kỹ năng) nên cần thống nhất thời điểm chốt số liệu trước khi xuất bản.',
    measurableOutcomes: [
      { metric: 'ty_le_ky_nang_co_chung_cu', target: '100%' },
      { metric: 'thoi_gian_tai_trang_ho_so', target: '<2s' },
    ],
    learningObjectives: ['Tổng hợp hồ sơ từ dữ liệu đánh giá', 'Kiểm soát quyền xem hồ sơ công khai'],
    domainTags: ['profile', 'evidence', 'trust-review'],
    requiredSkills: ['postgresql', 'testing', 'problem_solving'],
  }),
  createScenarioTask({
    key: 'member-admin-regression',
    organization: 'orgA',
    project: 'orgAOperations',
    creator: 'orgAdmin',
    assignee: 'member',
    title: 'Kiểm định điều hướng theo vai trò quản trị',
    description:
      'Hoàn thiện bộ tiêu chí nghiệm thu cho điều hướng quản trị, lịch sử trình duyệt và tổ chức đang hoạt động.',
    status: 'done',
    label: 'documentation',
    priority: 'medium',
    difficulty: 'medium',
    taskType: 'qa_testing',
    problemCategory: 'maintainability',
    businessDomain: 'internal_tooling',
    requiredSkills: ['testing', 'communication'],
  }),
  createScenarioTask({
    key: 'orgb-navigation-qa',
    organization: 'orgB',
    project: 'orgBKnowledgeBase',
    creator: 'orgBOwner',
    assignee: 'owner',
    title: 'Chuẩn hóa hành trình học viên giữa các học viện',
    description:
      'Bảo đảm cố vấn khi chuyển sang học viện đối tác chỉ sử dụng quyền thành viên và không kế thừa quyền điều hành từ Suar.',
    status: 'done',
    label: 'bug',
    priority: 'high',
    difficulty: 'medium',
    taskType: 'qa_testing',
    problemCategory: 'ux_improvement',
    businessDomain: 'edtech',
    requiredSkills: ['testing', 'communication'],
  }),
  createScenarioTask({
    key: 'owner-profile-scoring-loop',
    organization: 'orgA',
    project: 'orgAAnalytics',
    creator: 'owner',
    assignee: 'owner',
    title: 'Đồng bộ điểm năng lực sau phiên đánh giá',
    description:
      'Cập nhật chỉ số tổng hợp, mức độ tin cậy và hồ sơ năng lực ngay khi phiên đánh giá được xác nhận.',
    status: 'done',
    label: 'enhancement',
    priority: 'high',
    difficulty: 'hard',
    taskType: 'feature_development',
    problemCategory: 'automation',
    businessDomain: 'saas',
    requiredSkills: ['postgresql', 'problem_solving'],
  }),
  createScenarioTask({
    key: 'owner-data-governance',
    organization: 'orgA',
    project: 'orgAOperations',
    creator: 'owner',
    assignee: 'owner',
    title: 'Xây dựng quy chuẩn quản trị dữ liệu đánh giá',
    description:
      'Chuẩn hóa quyền sở hữu, nguồn gốc và quy trình đối soát dữ liệu đánh giá xuyên suốt vòng đời dự án.',
    status: 'done',
    label: 'enhancement',
    priority: 'medium',
    difficulty: 'medium',
    taskType: 'technical_writing',
    problemCategory: 'automation',
    businessDomain: 'internal_tooling',
    requiredSkills: ['leadership', 'code_review'],
  }),
  createScenarioTask({
    key: 'owner-evidence-architecture',
    organization: 'orgA',
    project: 'orgAPlatform',
    creator: 'orgAdmin',
    assignee: 'owner',
    title: 'Thiết kế kiến trúc hồ sơ chứng cứ liên mô-đun',
    description:
      'Thiết kế mô hình liên kết công việc, bản bàn giao, tiêu chí nghiệm thu, đánh giá kỹ năng và lịch sử hồ sơ thành một chuỗi chứng cứ có thể truy vết.',
    status: 'done',
    label: 'feature',
    priority: 'high',
    difficulty: 'expert',
    dueDaysOffset: -10,
    assignmentCompletedDaysAgo: 11,
    assignmentEstimatedHours: 28,
    assignmentActualHours: 26,
    taskType: 'feature_development',
    problemCategory: 'new_capability',
    businessDomain: 'saas',
    roleInTask: 'architect',
    autonomyLevel: 'led_others',
    collaborationType: 'cross_team',
    requiredSkills: ['typescript', 'system_design', 'leadership', 'planning'],
  }),
  createScenarioTask({
    key: 'owner-release-governance',
    organization: 'orgA',
    project: 'orgAOperations',
    creator: 'orgAdmin',
    assignee: 'owner',
    title: 'Thiết lập cổng quản trị chất lượng cho phiên phát hành',
    description:
      'Xây dựng tiêu chí go/no-go, ma trận rủi ro và cơ chế phân công trách nhiệm cho mỗi phiên phát hành của nền tảng.',
    status: 'done',
    label: 'enhancement',
    priority: 'urgent',
    difficulty: 'hard',
    dueDaysOffset: -8,
    assignmentCompletedDaysAgo: 9,
    assignmentEstimatedHours: 22,
    assignmentActualHours: 21,
    taskType: 'devops_deployment',
    problemCategory: 'compliance',
    businessDomain: 'internal_tooling',
    roleInTask: 'lead',
    autonomyLevel: 'led_others',
    collaborationType: 'cross_team',
    requiredSkills: ['typescript', 'code_review', 'leadership', 'risk_tracking'],
  }),
  createScenarioTask({
    key: 'owner-impact-analytics',
    organization: 'orgA',
    project: 'orgAAnalytics',
    creator: 'owner',
    assignee: 'owner',
    title: 'Xây dựng bảng chỉ số tác động và độ tin cậy',
    description:
      'Tổng hợp chất lượng bàn giao, độ nhất quán đánh giá và tốc độ phản hồi thành bộ chỉ số phục vụ quyết định sản phẩm.',
    status: 'done',
    label: 'feature',
    priority: 'high',
    difficulty: 'hard',
    dueDaysOffset: -6,
    assignmentCompletedDaysAgo: 7,
    assignmentEstimatedHours: 24,
    assignmentActualHours: 23,
    taskType: 'feature_development',
    problemCategory: 'automation',
    businessDomain: 'data_platform',
    roleInTask: 'lead',
    autonomyLevel: 'autonomous',
    collaborationType: 'small_team',
    requiredSkills: ['postgresql', 'api_design', 'problem_solving', 'planning'],
  }),
  createScenarioTask({
    key: 'owner-profile-api-contract',
    organization: 'orgA',
    project: 'orgAPlatform',
    creator: 'orgAdmin',
    assignee: 'owner',
    title: 'Chuẩn hóa hợp đồng API cho hồ sơ năng lực',
    description:
      'Chuẩn hóa dữ liệu công khai, quyền riêng tư và khả năng tương thích phiên bản cho API hồ sơ năng lực.',
    status: 'done',
    label: 'enhancement',
    priority: 'high',
    difficulty: 'hard',
    dueDaysOffset: -4,
    assignmentCompletedDaysAgo: 5,
    assignmentEstimatedHours: 18,
    assignmentActualHours: 17,
    taskType: 'feature_development',
    problemCategory: 'maintainability',
    businessDomain: 'saas',
    roleInTask: 'architect',
    autonomyLevel: 'autonomous',
    collaborationType: 'small_team',
    requiredSkills: ['typescript', 'api_design', 'communication', 'documentation'],
  }),
  createScenarioTask({
    key: 'owner-active-platform-work',
    organization: 'orgA',
    project: 'orgAPlatform',
    creator: 'owner',
    assignee: 'owner',
    title: 'Hoàn thiện trung tâm theo dõi chất lượng phát hành',
    description:
      'Xây dựng góc nhìn tập trung về công việc đang triển khai, rủi ro chất lượng và các mốc bàn giao của phiên phát hành.',
    status: 'in_progress',
    label: 'enhancement',
    priority: 'medium',
    difficulty: 'medium',
    taskType: 'feature_development',
    problemCategory: 'new_capability',
    businessDomain: 'saas',
    requiredSkills: ['typescript', 'testing', 'communication'],
  }),
  createScenarioTask({
    key: 'owner-review-dispute-case',
    organization: 'orgA',
    project: 'orgAOperations',
    creator: 'orgAdmin',
    assignee: 'owner',
    title: 'Đối soát bộ tiêu chí kiểm định chất lượng dữ liệu',
    description:
      'Đối chiếu kết quả kiểm định với chứng cứ bàn giao khi điểm đánh giá chưa phản ánh đầy đủ phạm vi và chất lượng thực hiện.',
    status: 'done',
    label: 'feature',
    priority: 'high',
    difficulty: 'hard',
    assignmentCompletedDaysAgo: 3,
    taskType: 'qa_testing',
    problemCategory: 'compliance',
    businessDomain: 'internal_tooling',
    acceptanceCriteria: [
      'Từng tiêu chí kiểm định được đối chiếu với chứng cứ bàn giao và ghi rõ đạt hay chưa đạt',
      'Điểm đánh giá cuối cùng có diễn giải căn cứ trên rubric đã thống nhất với người thực hiện',
      'Các điểm chưa thống nhất giữa reviewer và người thực hiện được ghi nhận kèm chứng cứ hai phía',
    ],
    expectedDeliverables: [
      'Biên bản đối soát tiêu chí kiểm định kèm liên kết chứng cứ',
      'Bảng chấm rubric có diễn giải theo từng tiêu chí',
      'Danh sách điểm tranh chấp cần hội đồng xem xét',
    ],
    contextBackground:
      'Phiên đánh giá chất lượng dữ liệu có điểm số thấp hơn kỳ vọng trong khi chứng cứ bàn giao cho thấy phạm vi đã hoàn thành; cần đối soát lại theo rubric trước khi chốt hồ sơ năng lực.',
    complexityNotes:
      'Tranh chấp liên quan tới trọng số tiêu chí giữa reviewer ngang hàng và quản lý, nên mọi kết luận phải dẫn được về chứng cứ và rubric gốc.',
    measurableOutcomes: [
      { metric: 'ty_le_tieu_chi_co_chung_cu', target: '100%' },
      { metric: 'so_diem_tranh_chap_ton_dong', target: 0 },
    ],
    learningObjectives: ['Đối soát đánh giá dựa trên rubric', 'Chuẩn hóa chứng cứ nghiệm thu'],
    domainTags: ['quality-audit', 'rubric', 'dispute-resolution'],
    requiredSkills: ensureFourCategoryRequiredSkills([
      'testing',
      'communication',
      'problem_solving',
    ]),
  }),
  createScenarioTask({
    key: 'orgc-marketplace-ranking',
    organization: 'orgC',
    project: 'orgCMarketplaceLab',
    creator: 'peerReviewer',
    assignee: 'orgAdmin',
    title: 'Xây dựng mô hình xếp hạng đề xuất cộng tác',
    description:
      'Phân tích mức độ phù hợp giữa hồ sơ năng lực, đề xuất chuyên môn và yêu cầu dự án để cải thiện thứ tự gợi ý cộng tác viên.',
    status: 'done',
    visibility: 'external',
    label: 'feature',
    priority: 'high',
    difficulty: 'hard',
    taskType: 'feature_development',
    problemCategory: 'performance',
    businessDomain: 'saas',
    requiredSkills: ['postgresql', 'problem_solving'],
  }),
  createScenarioTask({
    key: 'orga-review-dispute-detail',
    organization: 'orgA',
    project: 'orgAOperations',
    creator: 'orgAdmin',
    assignee: 'member',
    title: 'Hoàn thiện hồ sơ tranh chấp cho hội đồng kiểm duyệt',
    description:
      'Tập hợp rubric, nhận xét của các bên và chứng cứ bàn giao thành hồ sơ có thể kiểm tra và ra quyết định.',
    status: 'done',
    label: 'feature',
    priority: 'medium',
    difficulty: 'medium',
    taskType: 'qa_testing',
    problemCategory: 'new_capability',
    businessDomain: 'internal_tooling',
    requiredSkills: ['testing', 'communication'],
  }),
  createScenarioTask({
    key: 'marketplace-content-pass',
    organization: 'orgA',
    project: 'orgAPlatform',
    creator: 'owner',
    title: 'Nghiên cứu hành trình cộng tác viên trên marketplace',
    description:
      'Khảo sát và đề xuất nội dung cho hành trình khám phá dự án, gửi đề xuất và theo dõi phản hồi của cộng tác viên.',
    status: 'todo',
    label: 'documentation',
    priority: 'medium',
    difficulty: 'easy',
    visibility: 'all',
    taskType: 'technical_writing',
    problemCategory: 'new_capability',
    businessDomain: 'saas',
    requiredSkills: ['communication', 'testing'],
    applicationDeadlineDaysAhead: 6,
  }),
  createScenarioTask({
    key: 'owner-marketplace-pending',
    organization: 'orgD',
    project: 'orgDTalentShowcase',
    creator: 'externalContributorOne',
    title: 'Biên soạn câu chuyện hồ sơ chuyên gia',
    description:
      'Xây dựng nội dung giới thiệu năng lực và các dấu mốc nghề nghiệp cho cổng hồ sơ chuyên gia.',
    status: 'todo',
    label: 'documentation',
    priority: 'medium',
    difficulty: 'medium',
    visibility: 'external',
    taskType: 'technical_writing',
    problemCategory: 'new_capability',
    businessDomain: 'saas',
    requiredSkills: ['communication', 'testing'],
    applicationDeadlineDaysAhead: 8,
  }),
  createScenarioTask({
    key: 'owner-marketplace-approved',
    organization: 'orgE',
    project: 'orgEDataOps',
    creator: 'externalContributorTwo',
    title: 'Kiểm định pipeline chất lượng dữ liệu',
    description:
      'Rà soát quy tắc kiểm tra, khả năng truy vết và báo cáo sai lệch trong pipeline dữ liệu vận hành.',
    status: 'todo',
    label: 'feature',
    priority: 'high',
    difficulty: 'hard',
    visibility: 'external',
    taskType: 'qa_testing',
    problemCategory: 'automation',
    businessDomain: 'data_platform',
    requiredSkills: ['postgresql', 'testing', 'communication'],
    applicationDeadlineDaysAhead: 7,
  }),
  createScenarioTask({
    key: 'owner-marketplace-rejected',
    organization: 'orgD',
    project: 'orgDTalentShowcase',
    creator: 'externalContributorOne',
    title: 'Thiết kế bộ thẻ hồ sơ chuyên gia',
    description:
      'Thiết kế hệ thống thẻ trực quan giúp khách hàng đọc nhanh kỹ năng, kinh nghiệm và mức độ tin cậy của chuyên gia.',
    status: 'todo',
    label: 'enhancement',
    priority: 'medium',
    difficulty: 'medium',
    visibility: 'all',
    taskType: 'ui_ux_design',
    problemCategory: 'ux_improvement',
    businessDomain: 'saas',
    requiredSkills: ['svelte', 'communication'],
    applicationDeadlineDaysAhead: 9,
  }),
  createScenarioTask({
    key: 'owner-marketplace-withdrawn',
    organization: 'orgE',
    project: 'orgEInsightEngine',
    creator: 'externalContributorTwo',
    title: 'Biên soạn tài liệu chỉ số tác động',
    description:
      'Chuẩn hóa định nghĩa, nguồn dữ liệu và hướng dẫn diễn giải các chỉ số tác động của chương trình.',
    status: 'todo',
    label: 'documentation',
    priority: 'low',
    difficulty: 'easy',
    visibility: 'external',
    taskType: 'technical_writing',
    problemCategory: 'maintainability',
    businessDomain: 'data_platform',
    requiredSkills: ['communication', 'postgresql'],
    applicationDeadlineDaysAhead: 10,
  }),
  createScenarioTask({
    key: 'marketplace-qa-pipeline',
    organization: 'orgA',
    project: 'orgAPlatform',
    creator: 'owner',
    title: 'Xây dựng quy trình sàng lọc đề xuất cộng tác',
    description:
      'Xây dựng tiêu chí sàng lọc đề xuất, phân công người đánh giá và cơ chế phản hồi minh bạch cho ứng viên.',
    status: 'todo',
    label: 'feature',
    priority: 'medium',
    difficulty: 'medium',
    visibility: 'external',
    taskType: 'qa_testing',
    problemCategory: 'automation',
    businessDomain: 'saas',
    requiredSkills: ['testing', 'communication'],
    applicationDeadlineDaysAhead: 5,
  }),
  createScenarioTask({
    key: 'member-profile-live',
    organization: 'orgA',
    project: 'orgAPlatform',
    creator: 'owner',
    assignee: 'member',
    title: 'Cập nhật thẻ năng lực theo kết quả đánh giá',
    description:
      'Đồng bộ kỹ năng đã xác thực và điểm chất lượng mới nhất lên thẻ hồ sơ ngay sau phiên đánh giá.',
    status: 'in_review',
    label: 'feature',
    priority: 'medium',
    difficulty: 'medium',
    taskType: 'feature_development',
    problemCategory: 'ux_improvement',
    businessDomain: 'saas',
    requiredSkills: ['svelte', 'testing'],
  }),
  createScenarioTask({
    key: 'orga-design-refresh',
    organization: 'orgA',
    project: 'orgADesignSystem',
    creator: 'owner',
    assignee: 'orgAdmin',
    title: 'Chuẩn hóa trạng thái phân quyền trong hệ thống thiết kế',
    description:
      'Hoàn thiện thành phần giao diện cho các vai trò chủ sở hữu, quản trị viên, thành viên và cộng tác viên.',
    status: 'in_progress',
    label: 'enhancement',
    priority: 'medium',
    difficulty: 'medium',
    taskType: 'ui_ux_design',
    problemCategory: 'ux_improvement',
    businessDomain: 'saas',
    requiredSkills: ['svelte', 'communication'],
  }),
  {
    key: 'owner-orgb-curriculum-todo',
    organization: 'orgB',
    project: 'orgBCurriculumOps',
    creator: 'orgBOwner',
    assignee: 'owner',
    title: 'Hoàn thiện khung năng lực AI ứng dụng',
    description:
      'Phát triển chương trình học theo dự án về ứng dụng AI trong vận hành, phân tích và ra quyết định; mỗi năng lực đều có tiêu chí và minh chứng rõ ràng.',
    status: 'todo',
    taskStatus: 'todo',
    label: 'feature',
    priority: 'high',
    difficulty: 'medium',
    visibility: 'internal',
    dueDaysOffset: 7,
    taskType: 'feature_development',
    problemCategory: 'new_capability',
    businessDomain: 'edtech',
    requiredSkills: ['postgresql', 'testing', 'communication', 'planning'],
    acceptanceCriteria: [
      'Hoàn thiện đề cương 5 môn học cốt lõi',
      'Định nghĩa 10 chỉ số đánh giá năng lực học tập số',
      'Tạo tài liệu hướng dẫn giảng viên áp dụng AI trong chấm điểm',
    ],
    verificationMethod: 'code_review',
    expectedDeliverables: [
      'Curriculum proposal document',
      'Competency rubrics guide',
      'AI-assisted grading workflow specification',
    ],
    contextBackground:
      'Tổ chức đang mở rộng mô hình đào tạo trực tuyến kết hợp AI. Giáo trình này đóng vai trò quan trọng trong việc chuẩn hóa chất lượng và là cơ sở giải quyết các tranh chấp về kết quả học tập sau này.',
    impactScope: 'project',
    techStack: ['Svelte', 'TypeScript', 'PostgreSQL', 'AI Engine'],
    environment: 'production',
    collaborationType: 'small_team',
    complexityNotes:
      'Yêu cầu sự phối hợp chặt chẽ giữa chuyên gia thiết kế bài giảng và kỹ sư hệ thống để tích hợp tính năng tự động chấm điểm.',
    measurableOutcomes: [{ metric: 'curriculum_coverage', target: '95%' }],
    learningObjectives: [
      'EdTech design methodology',
      'AI application in education workflows',
      'Skill-based evaluation models',
    ],
    domainTags: ['education', 'curriculum', 'ai-assisted', 'edtech'],
    roleInTask: 'lead',
    autonomyLevel: 'autonomous',
    estimatedUsersAffected: 1200,
  },
]

const CANONICAL_STATUS_SEQUENCE: TaskSpec['taskStatus'][] = [
  'todo',
  'in_progress',
  'done_dev',
  'in_testing',
  'rejected',
  'done',
  'cancelled',
]
const BULK_LABEL_SEQUENCE: TaskSpec['label'][] = ['feature', 'enhancement', 'documentation', 'bug']
const BULK_PRIORITY_SEQUENCE: TaskSpec['priority'][] = ['medium', 'high', 'low', 'urgent']
const BULK_DIFFICULTY_SEQUENCE: TaskSpec['difficulty'][] = ['easy', 'medium', 'hard', 'expert']
const BULK_TASK_TYPE_SEQUENCE: TaskSpec['taskType'][] = [
  'feature_development',
  'technical_writing',
  'qa_testing',
  'bug_fix',
  'code_review',
  'ui_ux_design',
]
const BULK_COLLABORATION_SEQUENCE: TaskSpec['collaborationType'][] = [
  'solo',
  'small_team',
  'pair_programming',
  'cross_team',
]
const BULK_AUTONOMY_SEQUENCE: TaskSpec['autonomyLevel'][] = [
  'supervised',
  'autonomous',
  'led_others',
]
const BULK_ROLE_SEQUENCE: TaskSpec['roleInTask'][] = [
  'contributor',
  'lead',
  'reviewer',
  'architect',
]
const BULK_ENVIRONMENT_SEQUENCE: TaskSpec['environment'][] = [
  'development',
  'staging',
  'mixed',
  'production',
]
const BULK_IMPACT_SEQUENCE: TaskSpec['impactScope'][] = [
  'team',
  'project',
  'organization',
  'end_users',
]
const BULK_VERIFICATION_SEQUENCE: TaskSpec['verificationMethod'][] = [
  'code_review',
  'manual_qa',
  'documentation_review',
  'manager_approval',
]

/**
 * The dense demo pack is intentionally an explicit editorial catalogue.  The
 * generator below only supplies deterministic operational metadata; titles,
 * stories and evidence remain project-specific and reviewable here.
 */
const PROJECT_NARRATIVE_TITLES: Record<ProjectKey, readonly string[]> = {
  orgAPlatform: [],
  orgAOperations: [],
  orgADesignSystem: [
    'Chuẩn hóa thẻ chứng cứ năng lực trên mobile',
    'Hoàn thiện trạng thái rỗng cho bảng đánh giá',
  ],
  orgAAnalytics: [
    'Đối soát tỷ lệ bàn giao đúng hạn theo quý',
    'Cảnh báo sai lệch điểm tự đánh giá',
    'Bảng nhiệt kỹ năng còn thiếu chứng cứ',
  ],
  orgBKnowledgeBase: [
    'Biên soạn playbook phỏng vấn dựa trên năng lực',
    'Chuẩn hóa rubric nghề Frontend Engineer',
    'Xây thư viện mẫu chứng cứ cho học viên',
    'Rà soát thuật ngữ kỹ năng song ngữ',
    'Thiết kế lộ trình học từ khoảng trống năng lực',
    'Xuất bản hướng dẫn phản hồi có tính xây dựng',
    'Kiểm định nguồn tài liệu về quản trị dữ liệu',
    'Gắn phiên bản rubric vào từng bài thực hành',
    'Thiết lập quy trình duyệt bài viết chuyên gia',
  ],
  orgBCurriculumOps: [
    'Thiết kế sprint mô phỏng phát hành sản phẩm',
    'Xây bài tập điều tra sự cố API',
    'Tổ chức phiên review chéo giữa các nhóm học viên',
    'Đo độ khó bài tập bằng dữ liệu hoàn thành',
    'Chuẩn hóa checklist bàn giao capstone',
    'Thiết kế bài học quản lý rủi ro dự án',
    'Thử nghiệm mentoring clinic hằng tuần',
    'Đồng bộ chuẩn đầu ra với rubric doanh nghiệp',
    'Tổng kết cohort bằng hồ sơ năng lực công khai',
  ],
  orgCMarketplaceLab: [
    'Khảo sát nhu cầu chuyên gia cho chiến dịch xanh',
    'Thiết kế brief nhận diện lễ hội sáng tạo',
    'Mở tuyển cộng tác viên dựng phim ngắn',
    'Chấm shortlist bằng bằng chứng năng lực',
    'Tổ chức phiên hỏi đáp công khai với ứng viên',
    'Xây landing page giới thiệu dự án cộng đồng',
    'Kiểm thử trải nghiệm ứng tuyển trên điện thoại',
    'Chuẩn hóa tiêu chí lựa chọn nhiếp ảnh gia',
    'Lập lịch bàn giao nội dung đa kênh',
    'Theo dõi ngân sách cộng tác viên theo mốc',
    'Thử nghiệm ghép ứng viên theo kỹ năng liền kề',
    'Rà soát quyền sử dụng tài sản sáng tạo',
    'Thiết kế dashboard sức khỏe chiến dịch',
    'Thu thập phản hồi đối tác sau nghiệm thu',
    'Xử lý hồ sơ ứng viên thiếu portfolio',
    'Xây bộ câu hỏi phỏng vấn content strategist',
    'Công bố minh bạch kết quả tuyển chọn',
    'Tổng kết tác động truyền thông của chiến dịch',
    'Lưu trữ bộ chứng cứ bàn giao cộng đồng',
  ],
  orgDTalentShowcase: [
    'Kể câu chuyện chuyển nghề của kỹ sư dữ liệu',
    'Thiết kế case study ra mắt sản phẩm giáo dục',
    'Biên tập portfolio cho chuyên gia UX độc lập',
    'Xác minh số liệu tác động trong hồ sơ năng lực',
    'Dựng video giới thiệu đội ngũ sáng lập',
    'Chuẩn hóa ảnh đại diện và bộ nhận diện cá nhân',
    'Viết bài phân tích một quyết định kiến trúc',
    'Tạo timeline chứng cứ cho dự án đã hoàn thành',
    'Thiết kế trang hồ sơ tối ưu cho nhà tuyển dụng',
    'Kiểm tra quyền riêng tư của liên kết chia sẻ',
    'Phỏng vấn khách hàng để xác thực lời chứng thực',
    'Chuyển review đồng cấp thành điểm nhấn portfolio',
    'Xây mẫu proposal cho dự án ngắn hạn',
    'Tối ưu nội dung hồ sơ bằng dữ liệu tìm kiếm',
    'Rà soát tính nhất quán giữa CV và chứng cứ',
    'Thiết kế bộ lọc cơ hội theo phong cách làm việc',
    'Thử nghiệm hồ sơ song ngữ cho thị trường khu vực',
    'Tổng kết chiến dịch giới thiệu chuyên gia',
  ],
  orgEDataOps: [
    'Lập data contract cho sự kiện hoàn thành nhiệm vụ',
    'Đối soát nguồn gốc điểm đánh giá kỹ năng',
    'Cảnh báo bản ghi notification mất outbox',
    'Kiểm tra drift giữa assignment và task assignee',
    'Xây bộ quy tắc phát hiện review trùng lặp',
    'Chuẩn hóa từ điển chỉ số hiệu suất',
    'Lập báo cáo chất lượng dữ liệu hằng ngày',
    'Diễn tập phục hồi projection hồ sơ năng lực',
    'Thiết kế checklist phê duyệt thay đổi schema',
  ],
  orgEInsightEngine: [
    'Phân tích kỹ năng tăng trưởng sau mỗi sprint',
    'Đo tác động mentoring lên chất lượng bàn giao',
    'So sánh độ tin cậy giữa tự đánh giá và review',
    'Phát hiện nhóm dự án có rủi ro trễ hạn',
    'Giải thích thành phần điểm ghép ứng viên',
    'Theo dõi tỷ lệ tranh chấp được giải quyết',
    'Xây cohort năng lực theo vai trò chuyên môn',
    'Đánh giá tác động của bằng chứng chất lượng cao',
    'Xuất báo cáo điều hành có provenance đầy đủ',
  ],
  orgFReviewOps: [
    'Chuẩn hóa template mô tả pull request có mục tiêu và phạm vi',
    'Thiết lập ngưỡng kích thước thay đổi để review hiệu quả',
    'Phân loại thay đổi theo ý định sửa lỗi tính năng và tài liệu',
    'Đo thời gian phản hồi đầu tiên của reviewer',
    'Rà soát chất lượng checklist kiểm thử trước khi gửi review',
    'Xây playbook xử lý pull request có nhiều vòng yêu cầu sửa',
    'Cảnh báo thay đổi lõi thiếu kế hoạch rollback',
    'Đối soát tỷ lệ merge theo kinh nghiệm tác giả',
    'Thiết kế rubric cho nhận xét review có tính hành động',
    'Theo dõi pull request chờ review quá ngưỡng',
    'Chuẩn hóa bằng chứng CI và kiểm thử trong gói bàn giao',
    'Phân tích mối liên hệ giữa code churn và độ trễ review',
    'Tổng kết chất lượng review theo repository và nhóm kỹ năng',
  ],
  orgFDeveloperExperience: [
    'Thiết kế issue template có bước tái hiện và kết quả mong đợi',
    'Chuẩn hóa môi trường tái hiện lỗi cho người đóng góp mới',
    'Rút gọn thời gian thiết lập workspace phát triển',
    'Xây hướng dẫn chọn label và mức ưu tiên cho issue',
    'Đo tỷ lệ issue thiếu thông tin phải hỏi lại',
    'Thiết kế hành trình contributor từ issue đầu tiên đến merge',
    'Chuẩn hóa decision record cho thay đổi kiến trúc',
    'Tạo catalogue lỗi thiết lập thường gặp theo tech stack',
    'Cải thiện thông báo thất bại của pipeline kiểm thử',
    'Đồng bộ tài liệu API với phiên bản đang phát hành',
    'Thiết kế dashboard ma sát trong vòng đời phát triển',
    'Tổ chức clinic hỗ trợ contributor theo tuần',
    'Đánh giá tác động của template mới lên chất lượng issue',
  ],
  orgFReleaseReliability: [
    'Thiết lập cổng phát hành dựa trên rủi ro thay đổi',
    'Chuẩn hóa bằng chứng smoke test trước khi triển khai',
    'Xây runbook rollback cho migration dữ liệu',
    'Đo tỷ lệ pipeline thất bại theo nguyên nhân',
    'Cảnh báo flaky test ảnh hưởng quyết định phát hành',
    'Diễn tập phục hồi dịch vụ sau lỗi cấu hình',
    'Thiết kế ma trận chủ sở hữu tín hiệu vận hành',
    'Theo dõi lead time từ merge đến production',
    'Chuẩn hóa release note theo tác động người dùng',
    'Đánh giá độ bao phủ quan sát cho luồng nghiệp vụ trọng yếu',
    'Xây checklist bàn giao trực vận hành',
    'Phân tích sự cố phát sinh sau phiên phát hành',
    'Tổng kết mức độ sẵn sàng của phiên bản theo bằng chứng',
  ],
  orgGCitizenPortal: [
    'Thiết kế trang theo dõi trạng thái hồ sơ của người dân',
    'Chuẩn hóa ngôn ngữ thông báo yêu cầu bổ sung giấy tờ',
    'Cải thiện hành trình nộp hồ sơ trên thiết bị di động',
    'Xây chế độ lưu nháp cho biểu mẫu nhiều bước',
    'Kiểm định khả năng dùng bàn phím trên cổng dịch vụ',
    'Thiết kế lịch hẹn và nhắc việc theo ngữ cảnh hồ sơ',
    'Giải thích thời hạn xử lý bằng timeline dễ hiểu',
    'Chuẩn hóa bằng chứng xác nhận đã tiếp nhận yêu cầu',
    'Thử nghiệm hướng dẫn điền biểu mẫu theo từng trường',
    'Đo tỷ lệ hoàn thành hành trình không cần hỗ trợ',
    'Thiết kế kênh phản hồi sau khi nhận kết quả',
    'Rà soát quyền riêng tư của tài liệu đính kèm',
    'Tổng kết điểm nghẽn trong hành trình dịch vụ công',
  ],
  orgGComplaintResolution: [
    'Phân loại phản hồi theo dịch vụ và mức độ ảnh hưởng',
    'Thiết lập SLA phản hồi đầu tiên cho từng nhóm vấn đề',
    'Chuẩn hóa lý do chuyển tuyến giữa các đơn vị xử lý',
    'Xây hồ sơ bằng chứng cho phản hồi có tranh chấp',
    'Phát hiện phản hồi trùng lặp từ nhiều kênh',
    'Thiết kế trạng thái chờ người dân bổ sung thông tin',
    'Theo dõi cam kết khắc phục và người chịu trách nhiệm',
    'Rà soát chất lượng câu trả lời trước khi đóng phản hồi',
    'Đo tỷ lệ mở lại sau khi thông báo đã giải quyết',
    'Xây playbook xử lý phản hồi có rủi ro cao',
    'Phân tích nguyên nhân gốc theo cụm phản hồi',
    'Chuẩn hóa khảo sát hài lòng sau xử lý',
    'Tổng kết tác động cải tiến từ phản hồi người dân',
  ],
  orgGAccessibilityAnalytics: [
    'Lập baseline accessibility cho các hành trình trọng yếu',
    'Đo tỷ lệ lỗi tương phản theo nhóm giao diện',
    'Theo dõi trường biểu mẫu thiếu nhãn hỗ trợ',
    'Phân tích điểm thoát của người dùng dùng thiết bị trợ năng',
    'Xây heatmap lỗi điều hướng bằng bàn phím',
    'Đối soát accessibility giữa mobile và desktop',
    'Thiết kế chỉ số thời gian hoàn thành theo nhóm nhu cầu',
    'Cảnh báo regression accessibility sau phát hành',
    'Chuẩn hóa cách ghi nhận bằng chứng kiểm định',
    'Phân tích phản hồi hỗ trợ liên quan khả năng tiếp cận',
    'Xây cohort cải tiến theo mức độ ảnh hưởng',
    'Đánh giá tác động của component chuẩn lên số lỗi',
    'Xuất báo cáo accessibility có provenance đầy đủ',
  ],
  orgHFarmOperations: [
    'Lập kế hoạch mùa vụ theo vùng canh tác',
    'Phân công kiểm tra đồng ruộng theo lịch',
    'Theo dõi bàn giao vật tư giữa các nhóm nông hộ',
    'Chuẩn hóa nhật ký chăm sóc cây trồng',
    'Cảnh báo công việc hiện trường trễ hạn',
    'Thiết kế quy trình xác nhận hoàn thành bằng ảnh',
    'Đối soát định mức vật tư với diện tích thực tế',
    'Xây bảng điều phối nhân lực theo thời tiết',
    'Ghi nhận sự cố mùa vụ và hành động khắc phục',
    'Theo dõi tỷ lệ hoàn thành checklist canh tác',
    'Thiết kế lịch nghiệm thu theo từng lô ruộng',
    'Tổng hợp bài học sau mỗi giai đoạn mùa vụ',
    'Đánh giá hiệu quả điều phối bằng dữ liệu bàn giao',
  ],
  orgHIotFieldMonitoring: [
    'Chuẩn hóa payload cảm biến độ ẩm hiện trường',
    'Thiết kế hàng đợi đồng bộ khi thiết bị mất mạng',
    'Cảnh báo cảm biến gửi dữ liệu ngoài ngưỡng',
    'Theo dõi chất lượng pin của thiết bị ngoài đồng',
    'Phát hiện chuỗi dữ liệu bị thiếu theo trạm',
    'Xây bản đồ trạng thái thiết bị theo khu vực',
    'Thiết kế xác nhận cảnh báo của người vận hành',
    'Đối soát thời gian thiết bị với thời gian máy chủ',
    'Kiểm thử ứng dụng hiện trường trong mạng yếu',
    'Chuẩn hóa runbook thay thế thiết bị lỗi',
    'Phân tích false alarm theo loại cảm biến',
    'Diễn tập phục hồi dữ liệu sau gián đoạn gateway',
    'Tổng kết độ tin cậy hệ thống giám sát hiện trường',
  ],
  orgHKnowledgeHub: [
    'Biên soạn quy trình kiểm tra đất trước mùa vụ',
    'Chuẩn hóa bài học nhận diện sâu bệnh bằng hình ảnh',
    'Xây rubric đánh giá thực hành tưới tiết kiệm',
    'Thiết kế glossary thuật ngữ nông nghiệp số',
    'Gắn phiên bản tài liệu với mùa vụ áp dụng',
    'Tổ chức review chéo giữa chuyên gia và nông hộ',
    'Xây thư viện bằng chứng thực hành đạt chuẩn',
    'Rà soát nguồn tham khảo cho hướng dẫn canh tác',
    'Thiết kế lộ trình học cho thành viên mới',
    'Chuyển bài học sự cố thành checklist phòng ngừa',
    'Đo mức độ sử dụng tài liệu tại hiện trường',
    'Chuẩn hóa quy trình duyệt nội dung chuyên gia',
    'Tổng kết tri thức được tái sử dụng giữa các mùa vụ',
  ],
  orgISecureDelivery: [
    'Xây threat model cho luồng đăng nhập liên kết',
    'Chuẩn hóa checklist bảo mật trước khi merge',
    'Thiết lập kiểm tra secret trong pipeline',
    'Rà soát quyền truy cập của service account',
    'Thiết kế bằng chứng kiểm thử authorization',
    'Xây cổng phê duyệt cho thay đổi nhạy cảm',
    'Đối soát audit event với hành động nghiệp vụ',
    'Kiểm định cách xử lý dữ liệu cá nhân trong log',
    'Diễn tập rollback khi policy mới gây gián đoạn',
    'Cảnh báo thay đổi bypass kiểm soát bảo mật',
    'Chuẩn hóa hồ sơ chấp nhận rủi ro tạm thời',
    'Đánh giá độ bao phủ threat scenario trọng yếu',
    'Tổng kết readiness bảo mật của phiên phát hành',
  ],
  orgIIncidentReadiness: [
    'Xây runbook xử lý lỗi kết nối cơ sở dữ liệu',
    'Thiết kế ma trận severity và kênh escalation',
    'Chuẩn hóa timeline sự cố từ tín hiệu đầu tiên',
    'Diễn tập mất Redis và chiến lược graceful degradation',
    'Kiểm thử phục hồi notification projection',
    'Xác định chủ sở hữu dashboard vận hành',
    'Thiết kế mẫu cập nhật tình hình cho stakeholder',
    'Đo thời gian phát hiện và khôi phục theo sự cố',
    'Rà soát alert thiếu hành động cụ thể',
    'Xây checklist thu thập bằng chứng sau sự cố',
    'Tổ chức game day cho lỗi dependency bên ngoài',
    'Chuyển postmortem thành hành động có người nhận',
    'Tổng kết năng lực sẵn sàng sự cố theo quý',
  ],
  orgIDependencyGovernance: [
    'Lập inventory dependency theo dịch vụ',
    'Đánh giá rủi ro phiên bản đã hết hỗ trợ',
    'Chuẩn hóa provenance của package nguồn mở',
    'Thiết kế SLA xử lý lỗ hổng theo severity',
    'Phát hiện dependency không còn được sử dụng',
    'Xây quy trình thử nghiệm bản nâng cấp lớn',
    'Đối soát lockfile với manifest phát hành',
    'Thiết kế hồ sơ ngoại lệ cho package chưa thể nâng cấp',
    'Cảnh báo thay đổi license ảnh hưởng sản phẩm',
    'Theo dõi tỷ lệ dependency có owner rõ ràng',
    'Diễn tập thu hồi package bị xâm phạm',
    'Đánh giá tác động supply-chain theo project',
    'Xuất báo cáo dependency governance có bằng chứng',
  ],
  orgJSustainableCommerce: [
    'Chuẩn hóa tiêu chí xác minh nhà cung cấp bền vững',
    'Thiết kế trang giải thích nguồn gốc sản phẩm',
    'Xây quy trình duyệt tuyên bố tác động môi trường',
    'Theo dõi cam kết giao hàng của đối tác',
    'Kiểm định trải nghiệm thanh toán trên mobile',
    'Thiết kế cơ chế phản hồi sau mỗi đơn hàng',
    'Phân loại khiếu nại theo nhà cung cấp và sản phẩm',
    'Xây dashboard tỷ lệ hoàn hàng có nguyên nhân',
    'Thử nghiệm bộ lọc sản phẩm theo giá trị bền vững',
    'Chuẩn hóa bằng chứng cho chiến dịch cộng đồng',
    'Đối soát nội dung marketing với hồ sơ sản phẩm',
    'Thiết kế playbook xử lý đối tác vi phạm cam kết',
    'Tổng kết tác động marketplace theo quý',
  ],
  orgJCustomerInsight: [
    'Phân nhóm phản hồi khách hàng theo hành trình',
    'Thiết kế phỏng vấn người mua quay lại',
    'Đo nguyên nhân bỏ giỏ theo thiết bị',
    'Xây taxonomy nhu cầu từ phản hồi đa kênh',
    'Đối soát sentiment với hành vi mua hàng',
    'Thiết kế thử nghiệm thông tin giao hàng',
    'Phân tích cohort khách hàng theo lần mua đầu',
    'Theo dõi tác động của cải tiến tìm kiếm',
    'Chuẩn hóa repository insight có bằng chứng gốc',
    'Xây scorecard chất lượng nghiên cứu',
    'Phát hiện kết luận vượt quá dữ liệu quan sát',
    'Chuyển insight thành yêu cầu có tiêu chí nghiệm thu',
    'Tổng kết quyết định sản phẩm dựa trên nghiên cứu',
  ],
  orgJCreatorMarketplace: [
    'Thiết kế brief tuyển creator theo năng lực',
    'Xây rubric chấm portfolio sáng tạo',
    'Tổ chức phiên hỏi đáp trước khi ứng tuyển',
    'Chuẩn hóa timeline onboarding cộng tác viên',
    'Theo dõi milestone bàn giao nội dung',
    'Thiết kế gói bằng chứng nghiệm thu chiến dịch',
    'Xử lý hồ sơ creator thiếu quyền sử dụng tài sản',
    'Đo chất lượng phản hồi giữa creator và nhãn hàng',
    'Xây cơ chế ghép creator theo phong cách làm việc',
    'Công bố kết quả tuyển chọn minh bạch',
    'Thiết kế quy trình giải quyết tranh chấp bàn giao',
    'Chuyển đánh giá dự án thành điểm nhấn hồ sơ',
    'Tổng kết hiệu quả mạng lưới creator theo quý',
  ],
}

function pickCycled<T>(items: readonly T[], index: number, label: string): T {
  const item = items[index % items.length]
  if (item === undefined) {
    throw new Error(`Missing generated seed item for ${label}`)
  }

  return item
}

export function buildGeneratedTaskSpecs(existingSpecs: TaskSpec[]): TaskSpec[] {
  const currentCounts = existingSpecs.reduce<Partial<Record<ProjectKey, number>>>(
    (counts, spec) => {
      counts[spec.project] = (counts[spec.project] ?? 0) + 1
      return counts
    },
    {}
  )

  const generated: TaskSpec[] = []

  for (const [project, config] of Object.entries(GENERATED_PROJECT_TASK_CONFIG) as [
    ProjectKey,
    GeneratedProjectTaskSeedConfig,
  ][]) {
    const currentCount = currentCounts[project] ?? 0

    for (let targetIndex = currentCount; targetIndex < config.targetTaskCount; targetIndex += 1) {
      const ordinal = targetIndex - currentCount + 1
      const taskStatus = pickCycled(
        CANONICAL_STATUS_SEQUENCE,
        targetIndex,
        `${project}:taskStatus`
      )
      const status: TaskSpec['status'] =
        taskStatus === 'todo' || taskStatus === 'cancelled'
          ? 'todo'
          : taskStatus === 'in_progress' || taskStatus === 'rejected'
            ? 'in_progress'
            : taskStatus === 'done'
              ? 'done'
              : 'in_review'
      const creator = pickCycled(config.creators, targetIndex, `${project}:creator`)
      const assignee =
        (taskStatus === 'todo' && ordinal % 3 === 0) || taskStatus === 'cancelled'
          ? undefined
          : pickCycled(config.assignees, targetIndex, `${project}:assignee`)
      const visibility: TaskSpec['visibility'] =
        taskStatus === 'todo' && ordinal % 6 === 0
          ? 'all'
          : taskStatus === 'todo' && ordinal % 4 === 0
            ? 'external'
            : 'internal'
      const estimatedHours = 6 + (ordinal % 5) * 2
      const actualHours =
        taskStatus === 'done'
          ? Math.max(estimatedHours - 1, estimatedHours + ((ordinal % 3) - 1))
          : Math.max(2, estimatedHours - 3)
      const dueDaysOffset = taskStatus === 'done' ? -(ordinal % 9) - 1 : (ordinal % 10) + 2
      const rotatedRequiredSkills = config.requiredSkills
        .slice(ordinal % config.requiredSkills.length)
        .concat(config.requiredSkills.slice(0, ordinal % config.requiredSkills.length))
      const requiredSkills = ensureFourCategoryRequiredSkills(rotatedRequiredSkills)

      const narrativeTitle = PROJECT_NARRATIVE_TITLES[project][ordinal - 1]
      if (!narrativeTitle) {
        throw new Error(`Missing explicit narrative for ${project} generated item ${ordinal}`)
      }

      generated.push({
        key: `${project}-bulk-${String(ordinal).padStart(2, '0')}`,
        organization: config.organization,
        project,
        creator,
        ...(assignee !== undefined ? { assignee } : {}),
        title: narrativeTitle,
        description:
          `${narrativeTitle} là một lát cắt có chủ đích trong câu chuyện ${config.titlePrefix.toLowerCase()}; nhóm phải lưu được quyết định, người chịu trách nhiệm và kết quả kiểm chứng.`,
        status,
        taskStatus,
        label: pickCycled(BULK_LABEL_SEQUENCE, targetIndex, `${project}:label`),
        priority: pickCycled(BULK_PRIORITY_SEQUENCE, targetIndex, `${project}:priority`),
        difficulty: pickCycled(BULK_DIFFICULTY_SEQUENCE, targetIndex, `${project}:difficulty`),
        visibility,
        dueDaysOffset,
        ...(taskStatus === 'done' ? { assignmentCompletedDaysAgo: (ordinal % 7) + 1 } : {}),
        assignmentEstimatedHours: estimatedHours,
        assignmentActualHours: actualHours,
        taskType: pickCycled(BULK_TASK_TYPE_SEQUENCE, targetIndex, `${project}:taskType`),
        acceptanceCriteria: [
          `Kết quả “${narrativeTitle}” được người phụ trách dự án nghiệm thu theo tiêu chí đã công bố`,
          'Timeline thể hiện đủ người thực hiện, người review, quyết định và thời điểm bàn giao',
        ],
        verificationMethod: pickCycled(
          BULK_VERIFICATION_SEQUENCE,
          targetIndex,
          `${project}:verificationMethod`
        ),
        expectedDeliverables: [
          `Hồ sơ bàn giao: ${narrativeTitle}`,
          `Biên bản kiểm chứng và liên kết chứng cứ cho ${project}`,
        ],
        contextBackground:
          `Dự án ${config.titlePrefix} cần chứng minh tác động bằng dữ liệu thật thay vì chỉ liệt kê đầu việc; hạng mục này bổ sung một mắt xích cụ thể vào hành trình đó.`,
        impactScope: pickCycled(BULK_IMPACT_SEQUENCE, targetIndex, `${project}:impactScope`),
        techStack: config.techStack,
        environment: pickCycled(BULK_ENVIRONMENT_SEQUENCE, targetIndex, `${project}:environment`),
        collaborationType: pickCycled(
          BULK_COLLABORATION_SEQUENCE,
          targetIndex,
          `${project}:collaborationType`
        ),
        complexityNotes:
          `Nhóm phải thống nhất nguồn dữ liệu, tiêu chí nghiệm thu và quyền xem chứng cứ cho “${narrativeTitle}” trước khi chuyển trạng thái.`,
        measurableOutcomes: [
          { metric: `evidence_${project}_${String(ordinal).padStart(2, '0')}`, target: 1 },
          { metric: 'trang_thai_ban_giao', value: taskStatus },
        ],
        learningObjectives: [`Thực hành ${narrativeTitle.toLowerCase()}`, 'Ra quyết định dựa trên chứng cứ'],
        domainTags: [
          config.businessDomain.replace(/_/g, '-'),
          'quan-tri-du-an',
          'theo-doi-tien-do',
        ],
        roleInTask: pickCycled(BULK_ROLE_SEQUENCE, targetIndex, `${project}:roleInTask`),
        autonomyLevel: pickCycled(BULK_AUTONOMY_SEQUENCE, targetIndex, `${project}:autonomyLevel`),
        problemCategory: pickCycled(
          config.problemCategories,
          targetIndex,
          `${project}:problemCategory`
        ),
        businessDomain: config.businessDomain,
        estimatedUsersAffected: 12 + ordinal * 3,
        ...(visibility !== 'internal' ? { applicationDeadlineDaysAhead: (ordinal % 6) + 3 } : {}),
        requiredSkills,
      })
    }
  }

  return generated
}

const GENERATED_PROJECT_TASK_CONFIG: Record<ProjectKey, GeneratedProjectTaskSeedConfig> = {
  orgAPlatform: {
    organization: 'orgA',
    targetTaskCount: 8,
    creators: ['owner', 'orgAdmin'],
    assignees: ['owner', 'member', 'orgAdmin', 'peerReviewer'],
    titlePrefix: 'Năng lực số và hồ sơ chứng cứ',
    businessDomain: 'saas',
    problemCategories: ['new_capability', 'maintainability', 'automation', 'ux_improvement'],
    techStack: ['AdonisJS', 'Svelte', 'PostgreSQL', 'Redis'],
    requiredSkills: ['typescript', 'api_design', 'postgresql', 'communication', 'planning'],
  },
  orgAOperations: {
    organization: 'orgA',
    targetTaskCount: 4,
    creators: ['owner', 'orgAdmin'],
    assignees: ['owner', 'member', 'orgAdmin'],
    titlePrefix: 'Quản trị chất lượng và tranh chấp',
    businessDomain: 'internal_tooling',
    problemCategories: ['maintainability', 'automation', 'new_capability', 'ux_improvement'],
    techStack: ['AdonisJS', 'PostgreSQL', 'Redis'],
    requiredSkills: ['testing', 'code_review', 'communication', 'risk_tracking', 'postgresql'],
  },
  orgADesignSystem: {
    organization: 'orgA',
    targetTaskCount: 3,
    creators: ['owner', 'orgAdmin'],
    assignees: ['orgAdmin', 'member'],
    titlePrefix: 'Thành phần trải nghiệm Suar',
    businessDomain: 'saas',
    problemCategories: ['ux_improvement', 'new_capability', 'maintainability'],
    techStack: ['Svelte', 'TypeScript', 'Design System'],
    requiredSkills: ['svelte', 'design_system', 'communication', 'documentation'],
  },
  orgAAnalytics: {
    organization: 'orgA',
    targetTaskCount: 5,
    creators: ['owner', 'orgAdmin'],
    assignees: ['owner', 'peerReviewer', 'orgAdmin'],
    titlePrefix: 'Chỉ số chất lượng sản phẩm',
    businessDomain: 'saas',
    problemCategories: ['automation', 'new_capability', 'performance', 'maintainability'],
    techStack: ['PostgreSQL', 'Redis', 'AdonisJS', 'Charts'],
    requiredSkills: ['postgresql', 'system_design', 'problem_solving', 'risk_tracking'],
  },
  orgBKnowledgeBase: {
    organization: 'orgB',
    targetTaskCount: 10,
    creators: ['orgBOwner'],
    assignees: ['owner', 'member', 'orgBOwner'],
    titlePrefix: 'Thư viện năng lực số',
    businessDomain: 'edtech',
    problemCategories: ['maintainability', 'automation', 'ux_improvement', 'new_capability'],
    techStack: ['Documentation', 'Svelte', 'PostgreSQL'],
    requiredSkills: ['svelte', 'design_system', 'communication', 'documentation'],
  },
  orgBCurriculumOps: {
    organization: 'orgB',
    targetTaskCount: 10,
    creators: ['orgBOwner'],
    assignees: ['owner', 'member', 'orgBOwner'],
    titlePrefix: 'Chương trình học theo dự án',
    businessDomain: 'edtech',
    problemCategories: ['automation', 'maintainability', 'new_capability', 'ux_improvement'],
    techStack: ['Documentation', 'PostgreSQL', 'Svelte'],
    requiredSkills: ['postgresql', 'system_design', 'communication', 'documentation'],
  },
  orgCMarketplaceLab: {
    organization: 'orgC',
    targetTaskCount: 20,
    creators: ['peerReviewer', 'orgAdmin'],
    assignees: ['peerReviewer', 'orgAdmin'],
    titlePrefix: 'Dự án sáng tạo cộng đồng',
    businessDomain: 'saas',
    problemCategories: ['automation', 'new_capability', 'maintainability', 'performance'],
    techStack: ['AdonisJS', 'Charts', 'PostgreSQL', 'Redis'],
    requiredSkills: ['postgresql', 'api_design', 'communication', 'planning'],
  },
  orgDTalentShowcase: {
    organization: 'orgD',
    targetTaskCount: 20,
    creators: ['externalContributorOne'],
    assignees: ['externalContributorOne', 'externalContributorTwo'],
    titlePrefix: 'Hồ sơ và cơ hội chuyên gia',
    businessDomain: 'saas',
    problemCategories: ['new_capability', 'ux_improvement', 'automation', 'technical_debt'],
    techStack: ['Svelte', 'TypeScript', 'PostgreSQL'],
    requiredSkills: ['svelte', 'design_system', 'communication', 'documentation'],
  },
  orgEDataOps: {
    organization: 'orgE',
    targetTaskCount: 10,
    creators: ['externalContributorTwo', 'orgAdmin'],
    assignees: ['member', 'orgAdmin', 'externalContributorTwo'],
    titlePrefix: 'Quy trình chất lượng dữ liệu',
    businessDomain: 'data_platform',
    problemCategories: ['automation', 'new_capability', 'performance', 'maintainability'],
    techStack: ['PostgreSQL', 'Redis', 'AdonisJS', 'TypeScript'],
    requiredSkills: ['postgresql', 'system_design', 'problem_solving', 'risk_tracking'],
  },
  orgEInsightEngine: {
    organization: 'orgE',
    targetTaskCount: 10,
    creators: ['externalContributorTwo', 'orgAdmin'],
    assignees: ['member', 'orgAdmin', 'externalContributorTwo'],
    titlePrefix: 'Phân tích tác động chương trình',
    businessDomain: 'data_platform',
    problemCategories: ['automation', 'new_capability', 'performance', 'maintainability'],
    techStack: ['PostgreSQL', 'Redis', 'AdonisJS', 'TypeScript'],
    requiredSkills: ['postgresql', 'api_design', 'communication', 'release_management'],
  },
  orgFReviewOps: {
    organization: 'orgF',
    targetTaskCount: 13,
    creators: ['backendSpecialist', 'qaAutomation'],
    assignees: [
      'qaAutomation',
      'backendSpecialist',
      'technicalWriter',
      'frontendSpecialist',
      'securityEngineer',
    ],
    titlePrefix: 'Chất lượng pull request dựa trên bằng chứng',
    businessDomain: 'saas',
    problemCategories: ['maintainability', 'automation', 'performance', 'new_capability'],
    techStack: ['GitHub', 'TypeScript', 'PostgreSQL', 'CI'],
    requiredSkills: ['typescript', 'code_review', 'communication', 'planning'],
  },
  orgFDeveloperExperience: {
    organization: 'orgF',
    targetTaskCount: 13,
    creators: ['frontendSpecialist', 'productResearcher'],
    assignees: [
      'frontendSpecialist',
      'productResearcher',
      'backendSpecialist',
      'qaAutomation',
      'technicalWriter',
    ],
    titlePrefix: 'Trải nghiệm nhà phát triển và contributor',
    businessDomain: 'internal_tooling',
    problemCategories: ['ux_improvement', 'maintainability', 'automation', 'new_capability'],
    techStack: ['Svelte', 'TypeScript', 'Documentation', 'CI'],
    requiredSkills: ['typescript', 'design_system', 'communication', 'documentation'],
  },
  orgFReleaseReliability: {
    organization: 'orgF',
    targetTaskCount: 13,
    creators: ['devopsEngineer', 'qaAutomation'],
    assignees: [
      'devopsEngineer',
      'qaAutomation',
      'securityEngineer',
      'backendSpecialist',
      'technicalWriter',
    ],
    titlePrefix: 'Phát hành tin cậy và khả năng phục hồi',
    businessDomain: 'internal_tooling',
    problemCategories: ['automation', 'performance', 'compliance', 'maintainability'],
    techStack: ['CI/CD', 'PostgreSQL', 'Redis', 'Observability'],
    requiredSkills: ['devops', 'testing', 'communication', 'release_management'],
  },
  orgGCitizenPortal: {
    organization: 'orgG',
    targetTaskCount: 13,
    creators: ['civicServiceLead', 'uxDesigner'],
    assignees: [
      'civicServiceLead',
      'uxDesigner',
      'technicalWriter',
      'qaAutomation',
      'productResearcher',
    ],
    titlePrefix: 'Hành trình dịch vụ công lấy người dân làm trung tâm',
    businessDomain: 'internal_tooling',
    problemCategories: ['ux_improvement', 'new_capability', 'maintainability', 'automation'],
    techStack: ['Svelte', 'TypeScript', 'PostgreSQL', 'Design System'],
    requiredSkills: ['svelte', 'design_system', 'communication', 'documentation'],
  },
  orgGComplaintResolution: {
    organization: 'orgG',
    targetTaskCount: 13,
    creators: ['civicServiceLead', 'productResearcher'],
    assignees: [
      'communityManager',
      'productResearcher',
      'civicServiceLead',
      'dataAnalyst',
      'technicalWriter',
    ],
    titlePrefix: 'Điều phối phản hồi và khắc phục dịch vụ',
    businessDomain: 'internal_tooling',
    problemCategories: ['automation', 'compliance', 'maintainability', 'ux_improvement'],
    techStack: ['AdonisJS', 'PostgreSQL', 'Analytics', 'Documentation'],
    requiredSkills: ['postgresql', 'system_design', 'communication', 'risk_tracking'],
  },
  orgGAccessibilityAnalytics: {
    organization: 'orgG',
    targetTaskCount: 13,
    creators: ['dataAnalyst', 'uxDesigner'],
    assignees: [
      'dataAnalyst',
      'uxDesigner',
      'qaAutomation',
      'productResearcher',
      'civicServiceLead',
    ],
    titlePrefix: 'Chỉ số accessibility và chất lượng hành trình',
    businessDomain: 'data_platform',
    problemCategories: ['automation', 'ux_improvement', 'performance', 'maintainability'],
    techStack: ['PostgreSQL', 'Charts', 'Svelte', 'Accessibility'],
    requiredSkills: ['postgresql', 'testing', 'problem_solving', 'documentation'],
  },
  orgHFarmOperations: {
    organization: 'orgH',
    targetTaskCount: 13,
    creators: ['agriProductOwner', 'productResearcher'],
    assignees: [
      'agriProductOwner',
      'productResearcher',
      'mobileEngineer',
      'dataAnalyst',
      'technicalWriter',
    ],
    titlePrefix: 'Điều phối mùa vụ và công việc hiện trường',
    businessDomain: 'data_platform',
    problemCategories: ['new_capability', 'automation', 'ux_improvement', 'maintainability'],
    techStack: ['Mobile', 'PostgreSQL', 'Svelte', 'Offline Sync'],
    requiredSkills: ['postgresql', 'system_design', 'communication', 'planning'],
  },
  orgHIotFieldMonitoring: {
    organization: 'orgH',
    targetTaskCount: 13,
    creators: ['mobileEngineer', 'devopsEngineer'],
    assignees: [
      'mobileEngineer',
      'devopsEngineer',
      'dataAnalyst',
      'agriProductOwner',
      'productResearcher',
    ],
    titlePrefix: 'Giám sát cảm biến và vận hành offline-first',
    businessDomain: 'data_platform',
    problemCategories: ['performance', 'automation', 'new_capability', 'maintainability'],
    techStack: ['IoT', 'Mobile', 'PostgreSQL', 'Observability'],
    requiredSkills: ['typescript', 'testing', 'problem_solving', 'release_management'],
  },
  orgHKnowledgeHub: {
    organization: 'orgH',
    targetTaskCount: 13,
    creators: ['agriProductOwner', 'technicalWriter'],
    assignees: [
      'technicalWriter',
      'agriProductOwner',
      'productResearcher',
      'mobileEngineer',
      'dataAnalyst',
    ],
    titlePrefix: 'Tri thức thực hành và học tập theo mùa vụ',
    businessDomain: 'edtech',
    problemCategories: ['maintainability', 'new_capability', 'automation', 'ux_improvement'],
    techStack: ['Documentation', 'Svelte', 'PostgreSQL', 'Mobile'],
    requiredSkills: ['svelte', 'design_system', 'communication', 'documentation'],
  },
  orgISecureDelivery: {
    organization: 'orgI',
    targetTaskCount: 13,
    creators: ['securityOwner', 'securityEngineer'],
    assignees: [
      'securityEngineer',
      'securityOwner',
      'backendSpecialist',
      'qaAutomation',
      'devopsEngineer',
    ],
    titlePrefix: 'Secure delivery và bằng chứng kiểm soát',
    businessDomain: 'security',
    problemCategories: ['security', 'compliance', 'automation', 'maintainability'],
    techStack: ['TypeScript', 'PostgreSQL', 'CI/CD', 'Audit'],
    requiredSkills: ['typescript', 'system_design', 'problem_solving', 'risk_tracking'],
  },
  orgIIncidentReadiness: {
    organization: 'orgI',
    targetTaskCount: 13,
    creators: ['securityOwner', 'devopsEngineer'],
    assignees: [
      'securityOwner',
      'devopsEngineer',
      'qaAutomation',
      'securityEngineer',
      'technicalWriter',
    ],
    titlePrefix: 'Sẵn sàng sự cố và phục hồi dịch vụ',
    businessDomain: 'security',
    problemCategories: ['security', 'performance', 'automation', 'compliance'],
    techStack: ['Observability', 'Redis', 'PostgreSQL', 'Runbooks'],
    requiredSkills: ['devops', 'testing', 'communication', 'risk_tracking'],
  },
  orgIDependencyGovernance: {
    organization: 'orgI',
    targetTaskCount: 13,
    creators: ['securityEngineer', 'backendSpecialist'],
    assignees: [
      'mlEngineer',
      'securityEngineer',
      'backendSpecialist',
      'devopsEngineer',
      'securityOwner',
    ],
    titlePrefix: 'Dependency provenance và supply-chain governance',
    businessDomain: 'security',
    problemCategories: ['security', 'compliance', 'maintainability', 'automation'],
    techStack: ['SBOM', 'TypeScript', 'CI/CD', 'PostgreSQL'],
    requiredSkills: ['typescript', 'code_review', 'problem_solving', 'risk_tracking'],
  },
  orgJSustainableCommerce: {
    organization: 'orgJ',
    targetTaskCount: 13,
    creators: ['commerceOwner', 'communityManager'],
    assignees: [
      'commerceOwner',
      'communityManager',
      'uxDesigner',
      'frontendSpecialist',
      'dataAnalyst',
    ],
    titlePrefix: 'Marketplace bền vững và minh bạch đối tác',
    businessDomain: 'saas',
    problemCategories: ['new_capability', 'ux_improvement', 'compliance', 'automation'],
    techStack: ['Svelte', 'AdonisJS', 'PostgreSQL', 'Analytics'],
    requiredSkills: ['svelte', 'api_design', 'communication', 'planning'],
  },
  orgJCustomerInsight: {
    organization: 'orgJ',
    targetTaskCount: 13,
    creators: ['productResearcher', 'dataAnalyst'],
    assignees: [
      'productResearcher',
      'dataAnalyst',
      'uxDesigner',
      'communityManager',
      'commerceOwner',
    ],
    titlePrefix: 'Nghiên cứu khách hàng và quyết định có căn cứ',
    businessDomain: 'data_platform',
    problemCategories: ['automation', 'ux_improvement', 'new_capability', 'maintainability'],
    techStack: ['PostgreSQL', 'Analytics', 'Svelte', 'Research Repository'],
    requiredSkills: ['postgresql', 'testing', 'communication', 'documentation'],
  },
  orgJCreatorMarketplace: {
    organization: 'orgJ',
    targetTaskCount: 13,
    creators: ['communityManager', 'commerceOwner'],
    assignees: [
      'uxDesigner',
      'communityManager',
      'technicalWriter',
      'productResearcher',
      'commerceOwner',
    ],
    titlePrefix: 'Creator marketplace và cộng tác có bằng chứng',
    businessDomain: 'saas',
    problemCategories: ['new_capability', 'automation', 'ux_improvement', 'compliance'],
    techStack: ['Svelte', 'PostgreSQL', 'Marketplace', 'Content'],
    requiredSkills: ['svelte', 'design_system', 'communication', 'planning'],
  },
}

export interface SeededTaskSpecOptions {
  dense?: boolean
}

export const CORE_TASK_SPECS = [...TASK_SPECS, ...SCENARIO_TASK_SPECS]
export const GENERATED_TASK_SPECS = buildGeneratedTaskSpecs(CORE_TASK_SPECS)

export function getSeededTaskSpecs(options: SeededTaskSpecOptions = {}): TaskSpec[] {
  return options.dense ? [...CORE_TASK_SPECS, ...GENERATED_TASK_SPECS] : [...CORE_TASK_SPECS]
}

export function getTaskSpec(taskKey: string): TaskSpec {
  const spec = getSeededTaskSpecs({ dense: true }).find((item) => item.key === taskKey)
  if (!spec) {
    throw new Error(`Missing task spec for ${taskKey}`)
  }

  return spec
}
