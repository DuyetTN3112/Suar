import type { GeneratedProjectTaskSeedConfig, ProjectKey, TaskSpec } from './types.js'

export const TASK_SPECS: TaskSpec[] = [
  {
    key: 'member-org-switch',
    organization: 'orgA',
    project: 'orgAPlatform',
    creator: 'owner',
    assignee: 'member',
    title: 'Hoàn thiện luồng chuyển organization theo role',
    description:
      'Kiểm tra khi user đang là org_owner ở tổ chức A nhưng chỉ là org_member ở tổ chức B thì layout, menu và redirect phải đổi đúng theo role hiện tại.',
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
      'Chuyển organization bằng team switcher không bị giữ quyền cũ',
      'Org member vào org B phải về workspace user thường thay vì org admin layout',
    ],
    verificationMethod: 'manual_qa',
    expectedDeliverables: ['Role-aware switch flow', 'Regression checklist', 'Screen capture demo'],
    contextBackground:
      'Task này được tạo để kiểm thử trực tiếp issue chuyển context khi đổi tổ chức trên cùng một tài khoản.',
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
    estimatedBudget: 12000000,
    requiredSkills: ['typescript', 'svelte', 'communication'],
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
      | 'estimatedBudget'
      | 'applicationDeadlineDaysAhead'
    >
  >

function createScenarioTask(input: ScenarioTaskInput): TaskSpec {
  const assignmentEstimatedHours = input.assignmentEstimatedHours ?? 10
  const assignmentActualHours =
    input.assignmentActualHours ?? (input.status === 'done' ? assignmentEstimatedHours : 0)
  const taskStatus = input.taskStatus ?? input.status

  return {
    key: input.key,
    organization: input.organization,
    project: input.project,
    creator: input.creator,
    assignee: input.assignee,
    title: input.title,
    description: input.description,
    status: input.status,
    taskStatus,
    label: input.label,
    priority: input.priority,
    difficulty: input.difficulty,
    visibility: input.visibility ?? 'internal',
    dueDaysOffset: input.dueDaysOffset ?? (input.status === 'done' ? -5 : 7),
    assignmentCompletedDaysAgo:
      input.assignmentCompletedDaysAgo ?? (input.status === 'done' ? 3 : undefined),
    assignmentEstimatedHours,
    assignmentActualHours,
    taskType: input.taskType,
    acceptanceCriteria: [
      `Seed scenario ${input.key} hiện diện trên task board`,
      'Dữ liệu liên quan review, profile, notification không bị thiếu khóa ngoại',
    ],
    verificationMethod: input.verificationMethod ?? 'manual_qa',
    expectedDeliverables: ['Seeded task record', 'Linked review/profile/demo data'],
    contextBackground: `Scenario task cho seed:${input.key}.`,
    impactScope: input.impactScope ?? 'project',
    techStack: input.techStack ?? ['AdonisJS', 'Svelte', 'PostgreSQL'],
    environment: input.environment ?? 'staging',
    collaborationType: input.collaborationType ?? 'small_team',
    complexityNotes: 'Scenario seed dùng để giữ dữ liệu demo có đủ liên kết.',
    measurableOutcomes: [{ metric: 'seed_integrity', target: 'linked' }],
    learningObjectives: ['Deterministic seed data', 'Cross-module QA'],
    domainTags: [input.organization, input.project, input.key],
    roleInTask: input.roleInTask ?? 'contributor',
    autonomyLevel: input.autonomyLevel ?? 'autonomous',
    problemCategory: input.problemCategory,
    businessDomain: input.businessDomain,
    estimatedUsersAffected: input.estimatedUsersAffected ?? 20,
    estimatedBudget: input.estimatedBudget ?? 5_000_000,
    applicationDeadlineDaysAhead: input.applicationDeadlineDaysAhead,
    requiredSkills: input.requiredSkills,
  }
}

const SCENARIO_TASK_SPECS: TaskSpec[] = [
  createScenarioTask({
    key: 'member-profile-proof',
    organization: 'orgA',
    project: 'orgAPlatform',
    creator: 'owner',
    assignee: 'member',
    title: 'Xuất profile proof và snapshot công khai',
    description: 'Tạo dữ liệu review, skill và snapshot để profile public có proof hoàn chỉnh.',
    status: 'done',
    label: 'feature',
    priority: 'high',
    difficulty: 'hard',
    taskType: 'feature_development',
    problemCategory: 'new_capability',
    businessDomain: 'saas',
    requiredSkills: ['postgresql', 'testing', 'problem_solving'],
  }),
  createScenarioTask({
    key: 'member-admin-regression',
    organization: 'orgA',
    project: 'orgAOperations',
    creator: 'orgAdmin',
    assignee: 'member',
    title: 'Chuẩn bị regression pack cho admin redirect',
    description: 'Đóng gói checklist kiểm thử redirect, back button và current organization.',
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
    title: 'Kiểm thử navigation sau khi quay lại từ admin mode',
    description: 'Xác minh user là member ở org B không bị giữ quyền owner từ org A.',
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
    title: 'Đồng bộ profile scoring sau khi review được xác nhận',
    description: 'Kiểm tra vòng cập nhật aggregate, trust data và profile snapshot sau review.',
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
    key: 'owner-seed-governance',
    organization: 'orgA',
    project: 'orgAOperations',
    creator: 'owner',
    assignee: 'owner',
    title: 'Điều phối seed data đa vai trò cho demo local',
    description: 'Chuẩn hóa seed nhiều role, nhiều organization và dữ liệu admin demo.',
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
    key: 'owner-active-platform-work',
    organization: 'orgA',
    project: 'orgAPlatform',
    creator: 'owner',
    assignee: 'owner',
    title: 'Hoàn thiện luồng task board cho account test chính',
    description:
      'Task đang làm để test My Tasks, current assignment và trạng thái in_progress cho tranngocduyet31@gmail.com.',
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
    title: 'Xử lý dispute review cho profile scoring của owner',
    description:
      'Task hoàn thành nhưng phiên review bị tranh chấp để test dispute flow trên chính account tranngocduyet31@gmail.com.',
    status: 'done',
    label: 'feature',
    priority: 'high',
    difficulty: 'hard',
    taskType: 'qa_testing',
    problemCategory: 'compliance',
    businessDomain: 'internal_tooling',
    requiredSkills: ['testing', 'communication', 'problem_solving'],
  }),
  createScenarioTask({
    key: 'orgc-marketplace-ranking',
    organization: 'orgC',
    project: 'orgCMarketplaceLab',
    creator: 'peerReviewer',
    assignee: 'owner',
    title: 'So sánh package Pro và ProMax trong ranking của marketplace',
    description: 'Seed dữ liệu ranking package adoption cho dashboard marketplace đa tenant.',
    status: 'done',
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
    title: 'Dựng chi tiết review dispute cho trang moderation',
    description: 'Tạo phiên review disputed có evidence để superadmin kiểm tra moderation.',
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
    title: 'Chuẩn hóa nội dung marketplace task public',
    description: 'Task public dùng để seed application list, notification và pending applications view.',
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
    creator: 'freelancerOne',
    title: 'Public profile showcase copywriting pass',
    description: 'External marketplace task để owner apply với trạng thái pending.',
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
    creator: 'freelancerTwo',
    title: 'Public data quality QA pipeline',
    description: 'External marketplace task để owner apply và được approve thành freelancer assignment.',
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
    creator: 'freelancerOne',
    title: 'Public Svelte profile widget polish',
    description: 'External marketplace task để owner apply với trạng thái rejected.',
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
    creator: 'freelancerTwo',
    title: 'Public analytics documentation cleanup',
    description: 'External marketplace task để owner apply rồi withdraw.',
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
    title: 'Thiết kế QA pipeline cho marketplace applicants',
    description: 'Task public thứ hai để application seed có nhiều trạng thái và applicant.',
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
    title: 'Cập nhật widget profile proof realtime',
    description: 'Task đang review để notification và profile widget có trạng thái live.',
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
    title: 'Làm mới role state trong design system',
    description: 'Task design system để org admin nhận notification và kiểm tra visual states.',
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
    title: 'Thiết kế và hoàn thiện chương trình học EdTech cốt lõi',
    description: 'Phát triển giáo trình chi tiết cho các khóa học EdTech của Open Education Guild, tập trung vào thiết kế trải nghiệm học tập số và áp dụng AI vào quản lý lớp học. Yêu cầu định nghĩa rõ ràng các tiêu chí kiểm tra, bối cảnh nghiệp vụ và mục tiêu học tập.',
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
    requiredSkills: ['testing', 'communication', 'problem_solving'],
    acceptanceCriteria: [
      'Hoàn thiện đề cương 5 môn học cốt lõi',
      'Định nghĩa 10 chỉ số đánh giá năng lực học tập số',
      'Tạo tài liệu hướng dẫn giảng viên áp dụng AI trong chấm điểm'
    ],
    verificationMethod: 'code_review',
    expectedDeliverables: ['Curriculum proposal document', 'Competency rubrics guide', 'AI-assisted grading workflow specification'],
    contextBackground: 'Tổ chức đang mở rộng mô hình đào tạo trực tuyến kết hợp AI. Giáo trình này đóng vai trò quan trọng trong việc chuẩn hóa chất lượng và là cơ sở giải quyết các tranh chấp về kết quả học tập sau này.',
    impactScope: 'project',
    techStack: ['Svelte', 'TypeScript', 'PostgreSQL', 'AI Engine'],
    environment: 'production',
    collaborationType: 'small_team',
    complexityNotes: 'Yêu cầu sự phối hợp chặt chẽ giữa chuyên gia thiết kế bài giảng và kỹ sư hệ thống để tích hợp tính năng tự động chấm điểm.',
    measurableOutcomes: [{ metric: 'curriculum_coverage', target: '95%' }],
    learningObjectives: ['EdTech design methodology', 'AI application in education workflows', 'Skill-based evaluation models'],
    domainTags: ['education', 'curriculum', 'ai-assisted', 'edtech'],
    roleInTask: 'lead',
    autonomyLevel: 'autonomous',
    estimatedUsersAffected: 1200,
    estimatedBudget: 50000000,
  },
]

const BULK_STATUS_SEQUENCE: TaskSpec['status'][] = ['todo', 'in_progress', 'in_review', 'done']
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
const BULK_AUTONOMY_SEQUENCE: TaskSpec['autonomyLevel'][] = ['supervised', 'autonomous', 'led_others']
const BULK_ROLE_SEQUENCE: TaskSpec['roleInTask'][] = ['contributor', 'lead', 'reviewer', 'architect']
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

  for (const [project, config] of Object.entries(GENERATED_PROJECT_TASK_CONFIG) as [ProjectKey, GeneratedProjectTaskSeedConfig][]) {
    const currentCount = currentCounts[project] ?? 0

    for (
      let targetIndex = currentCount;
      targetIndex < config.targetTaskCount;
      targetIndex += 1
    ) {
      const ordinal = targetIndex - currentCount + 1
      const status = pickCycled(BULK_STATUS_SEQUENCE, targetIndex, `${project}:status`)
      const taskStatus: TaskSpec['taskStatus'] = status
      const creator = pickCycled(config.creators, targetIndex, `${project}:creator`)
      const assignee =
        status === 'todo' && ordinal % 3 === 0
          ? undefined
          : pickCycled(config.assignees, targetIndex, `${project}:assignee`)
      const visibility: TaskSpec['visibility'] =
        status === 'todo' && ordinal % 6 === 0
          ? 'all'
          : status === 'todo' && ordinal % 4 === 0
            ? 'external'
            : 'internal'
      const estimatedHours = 6 + (ordinal % 5) * 2
      const actualHours =
        status === 'done'
          ? Math.max(estimatedHours - 1, estimatedHours + ((ordinal % 3) - 1))
          : Math.max(2, estimatedHours - 3)
      const dueDaysOffset = status === 'done' ? -(ordinal % 9) - 1 : (ordinal % 10) + 2
      const requiredSkills = config.requiredSkills
        .slice(ordinal % config.requiredSkills.length)
        .concat(config.requiredSkills.slice(0, ordinal % config.requiredSkills.length))
        .slice(0, 2)

      generated.push({
        key: `${project}-bulk-${String(ordinal).padStart(2, '0')}`,
        organization: config.organization,
        project,
        creator,
        assignee,
        title: `${config.titlePrefix} ${String(targetIndex + 1).padStart(2, '0')}`,
        description:
          `Seed thêm dữ liệu dày cho project ${project} để dashboard, board và analytics không còn thưa.` +
          ` Mục này dùng cho QA local nhiều trạng thái hơn.`,
        status,
        taskStatus,
        label: pickCycled(BULK_LABEL_SEQUENCE, targetIndex, `${project}:label`),
        priority: pickCycled(BULK_PRIORITY_SEQUENCE, targetIndex, `${project}:priority`),
        difficulty: pickCycled(BULK_DIFFICULTY_SEQUENCE, targetIndex, `${project}:difficulty`),
        visibility,
        dueDaysOffset,
        assignmentCompletedDaysAgo: status === 'done' ? (ordinal % 7) + 1 : undefined,
        assignmentEstimatedHours: estimatedHours,
        assignmentActualHours: actualHours,
        taskType: pickCycled(BULK_TASK_TYPE_SEQUENCE, targetIndex, `${project}:taskType`),
        acceptanceCriteria: [
          `Board của project ${project} có thêm dữ liệu trạng thái ${status}`,
          'Project detail và dashboard đọc được số liệu seeded mới',
        ],
        verificationMethod: pickCycled(
          BULK_VERIFICATION_SEQUENCE,
          targetIndex,
          `${project}:verificationMethod`
        ),
        expectedDeliverables: ['Updated seeded task record', 'Board card with realistic metadata'],
        contextBackground:
          `Generated filler task cho project ${project} trong ${config.organization} để project này có đủ task seed cho QA local.`,
        impactScope: pickCycled(BULK_IMPACT_SEQUENCE, targetIndex, `${project}:impactScope`),
        techStack: config.techStack,
        environment: pickCycled(BULK_ENVIRONMENT_SEQUENCE, targetIndex, `${project}:environment`),
        collaborationType: pickCycled(
          BULK_COLLABORATION_SEQUENCE,
          targetIndex,
          `${project}:collaborationType`
        ),
        complexityNotes:
          'Generated seed task giữ metadata thật nhưng không gắn thêm review scenario chuyên biệt.',
        measurableOutcomes: [
          { metric: 'seeded_project_task_density', target: config.targetTaskCount },
          { metric: 'status_bucket', value: status },
        ],
        learningObjectives: [
          'High-density local QA',
          'Cross-organization navigation verification',
        ],
        domainTags: [config.organization, project, 'seed-density', 'task-board'],
        roleInTask: pickCycled(BULK_ROLE_SEQUENCE, targetIndex, `${project}:roleInTask`),
        autonomyLevel: pickCycled(
          BULK_AUTONOMY_SEQUENCE,
          targetIndex,
          `${project}:autonomyLevel`
        ),
        problemCategory: pickCycled(
          config.problemCategories,
          targetIndex,
          `${project}:problemCategory`
        ),
        businessDomain: config.businessDomain,
        estimatedUsersAffected: 12 + ordinal * 3,
        estimatedBudget: 3_000_000 + ordinal * 350_000,
        applicationDeadlineDaysAhead: visibility === 'internal' ? undefined : (ordinal % 6) + 3,
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
    titlePrefix: 'Org A platform backlog',
    businessDomain: 'saas',
    problemCategories: ['new_capability', 'maintainability', 'automation', 'ux_improvement'],
    techStack: ['AdonisJS', 'Svelte', 'PostgreSQL', 'Redis'],
    requiredSkills: ['typescript', 'testing', 'postgresql', 'communication'],
  },
  orgAOperations: {
    organization: 'orgA',
    targetTaskCount: 4,
    creators: ['owner', 'orgAdmin'],
    assignees: ['owner', 'member', 'orgAdmin'],
    titlePrefix: 'Org A admin quality backlog',
    businessDomain: 'internal_tooling',
    problemCategories: ['maintainability', 'automation', 'new_capability', 'ux_improvement'],
    techStack: ['AdonisJS', 'PostgreSQL', 'Redis'],
    requiredSkills: ['testing', 'communication', 'problem_solving'],
  },
  orgADesignSystem: {
    organization: 'orgA',
    targetTaskCount: 3,
    creators: ['owner', 'orgAdmin'],
    assignees: ['orgAdmin', 'member'],
    titlePrefix: 'Org A design system backlog',
    businessDomain: 'saas',
    problemCategories: ['ux_improvement', 'new_capability', 'maintainability'],
    techStack: ['Svelte', 'TypeScript', 'Design System'],
    requiredSkills: ['svelte', 'communication', 'testing'],
  },
  orgAAnalytics: {
    organization: 'orgA',
    targetTaskCount: 5,
    creators: ['owner', 'orgAdmin'],
    assignees: ['owner', 'peerReviewer', 'orgAdmin'],
    titlePrefix: 'Org A analytics backlog',
    businessDomain: 'saas',
    problemCategories: ['automation', 'new_capability', 'performance', 'maintainability'],
    techStack: ['PostgreSQL', 'Redis', 'AdonisJS', 'Charts'],
    requiredSkills: ['postgresql', 'problem_solving', 'testing'],
  },
  orgBKnowledgeBase: {
    organization: 'orgB',
    targetTaskCount: 10,
    creators: ['orgBOwner'],
    assignees: ['orgBOwner', 'owner', 'member'],
    titlePrefix: 'Org B knowledge backlog',
    businessDomain: 'edtech',
    problemCategories: ['maintainability', 'automation', 'ux_improvement', 'new_capability'],
    techStack: ['Documentation', 'Svelte', 'PostgreSQL'],
    requiredSkills: ['communication', 'testing', 'problem_solving'],
  },
  orgBCurriculumOps: {
    organization: 'orgB',
    targetTaskCount: 10,
    creators: ['orgBOwner'],
    assignees: ['orgBOwner', 'owner', 'member'],
    titlePrefix: 'Org B curriculum backlog',
    businessDomain: 'edtech',
    problemCategories: ['automation', 'maintainability', 'new_capability', 'ux_improvement'],
    techStack: ['Documentation', 'PostgreSQL', 'Svelte'],
    requiredSkills: ['communication', 'testing', 'problem_solving'],
  },
  orgCMarketplaceLab: {
    organization: 'orgC',
    targetTaskCount: 20,
    creators: ['peerReviewer', 'orgAdmin'],
    assignees: ['peerReviewer', 'owner', 'orgAdmin'],
    titlePrefix: 'Org C marketplace backlog',
    businessDomain: 'saas',
    problemCategories: ['automation', 'new_capability', 'maintainability', 'performance'],
    techStack: ['AdonisJS', 'Charts', 'PostgreSQL', 'Redis'],
    requiredSkills: ['postgresql', 'problem_solving', 'testing', 'communication'],
  },
  orgDTalentShowcase: {
    organization: 'orgD',
    targetTaskCount: 20,
    creators: ['freelancerOne'],
    assignees: ['freelancerOne', 'owner', 'freelancerTwo'],
    titlePrefix: 'Org D talent backlog',
    businessDomain: 'saas',
    problemCategories: ['new_capability', 'ux_improvement', 'automation', 'technical_debt'],
    techStack: ['Svelte', 'TypeScript', 'PostgreSQL'],
    requiredSkills: ['svelte', 'communication', 'testing'],
  },
  orgEDataOps: {
    organization: 'orgE',
    targetTaskCount: 10,
    creators: ['freelancerTwo', 'orgAdmin'],
    assignees: ['freelancerTwo', 'owner', 'member', 'orgAdmin'],
    titlePrefix: 'Org E data ops backlog',
    businessDomain: 'data_platform',
    problemCategories: ['automation', 'new_capability', 'performance', 'maintainability'],
    techStack: ['PostgreSQL', 'Redis', 'AdonisJS', 'TypeScript'],
    requiredSkills: ['postgresql', 'testing', 'communication', 'problem_solving'],
  },
  orgEInsightEngine: {
    organization: 'orgE',
    targetTaskCount: 10,
    creators: ['freelancerTwo', 'orgAdmin'],
    assignees: ['freelancerTwo', 'owner', 'member', 'orgAdmin'],
    titlePrefix: 'Org E insight backlog',
    businessDomain: 'data_platform',
    problemCategories: ['automation', 'new_capability', 'performance', 'maintainability'],
    techStack: ['PostgreSQL', 'Redis', 'AdonisJS', 'TypeScript'],
    requiredSkills: ['postgresql', 'testing', 'communication', 'problem_solving'],
  },
}

const CORE_TASK_SPECS = [...TASK_SPECS, ...SCENARIO_TASK_SPECS]
const GENERATED_TASK_SPECS = buildGeneratedTaskSpecs(CORE_TASK_SPECS)
export const SEEDED_TASK_SPECS = [...CORE_TASK_SPECS, ...GENERATED_TASK_SPECS]

export function getTaskSpec(taskKey: string): TaskSpec {
  const spec = SEEDED_TASK_SPECS.find((item) => item.key === taskKey)
  if (!spec) {
    throw new Error(`Missing task spec for ${taskKey}`)
  }

  return spec
}
