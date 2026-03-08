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
