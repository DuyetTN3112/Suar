/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-enum-comparison */
import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import db from '@adonisjs/lucid/services/db'
import { randomUUID } from 'node:crypto'
import env from '#start/env'
import mongoose from 'mongoose'
import MongoNotification from '#models/mongo/notification'
import { MongoAuditLogModel } from '#models/mongo/audit_log'
import MongoUserActivityLog from '#models/mongo/user_activity_log'

type UserKey =
  | 'owner'
  | 'superadmin'
  | 'member'
  | 'orgAdmin'
  | 'peerReviewer'
  | 'orgBOwner'
  | 'freelancerOne'
  | 'freelancerTwo'

type OrgKey = 'orgA' | 'orgB' | 'orgC' | 'orgD'
type ProjectKey =
  | 'orgAPlatform'
  | 'orgAOperations'
  | 'orgADesignSystem'
  | 'orgAAnalytics'
  | 'orgBKnowledgeBase'
  | 'orgBCurriculumOps'
  | 'orgCMarketplaceLab'
  | 'orgDTalentShowcase'
type StatusSlug = 'todo' | 'in_progress' | 'in_review' | 'done' | 'cancelled'

type SeededUser = { id: string; username: string; email: string }
type SeededOrg = { id: string; name: string; slug: string }
type SeededProject = { id: string; name: string; organizationId: string }
type SeededTask = { id: string; title: string; organizationId: string; projectId: string | null }
type SeededAssignment = { id: string; taskId: string; assigneeId: string }

type SeedContext = {
  users: Record<UserKey, SeededUser>
  organizations: Record<OrgKey, SeededOrg>
  projects: Record<ProjectKey, SeededProject>
  skills: Record<string, string>
  tasks: Record<string, SeededTask>
  assignments: Record<string, SeededAssignment>
  snapshots: Record<string, string>
}

type TaskSpec = {
  key: string
  organization: OrgKey
  project: ProjectKey
  creator: UserKey
  assignee?: UserKey
  title: string
  description: string
  status: 'todo' | 'in_progress' | 'in_review' | 'done'
  taskStatus: StatusSlug
  label: 'bug' | 'feature' | 'enhancement' | 'documentation'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  difficulty: 'easy' | 'medium' | 'hard' | 'expert'
  visibility: 'internal' | 'external' | 'all'
  dueDaysOffset: number
  assignmentCompletedDaysAgo?: number
  assignmentEstimatedHours?: number
  assignmentActualHours?: number
  taskType:
    | 'feature_development'
    | 'bug_fix'
    | 'documentation'
    | 'ui_ux_design'
    | 'qa_testing'
    | 'code_review'
    | 'devops_deployment'
    | 'technical_writing'
  acceptanceCriteria: string[]
  verificationMethod:
    | 'code_review'
    | 'manual_qa'
    | 'demo_presentation'
    | 'manager_approval'
    | 'documentation_review'
  expectedDeliverables: string[]
  contextBackground: string
  impactScope: 'team' | 'project' | 'organization' | 'end_users'
  techStack: string[]
  environment: 'development' | 'staging' | 'production' | 'mixed'
  collaborationType: 'solo' | 'small_team' | 'cross_team' | 'mentoring_junior' | 'pair_programming'
  complexityNotes: string
  measurableOutcomes: Array<Record<string, unknown>>
  learningObjectives: string[]
  domainTags: string[]
  roleInTask: 'lead' | 'contributor' | 'reviewer' | 'architect' | 'mentor'
  autonomyLevel: 'supervised' | 'autonomous' | 'led_others'
  problemCategory:
    | 'performance'
    | 'security'
    | 'maintainability'
    | 'new_capability'
    | 'automation'
    | 'technical_debt'
    | 'ux_improvement'
  businessDomain: 'saas' | 'edtech' | 'internal_tooling' | 'data_platform' | 'security'
  estimatedUsersAffected: number
  estimatedBudget: number
  applicationDeadlineDaysAhead?: number
  requiredSkills: string[]
}

const TASK_SPECS: TaskSpec[] = [
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
  {
    key: 'member-profile-proof',
    organization: 'orgA',
    project: 'orgAPlatform',
    creator: 'orgAdmin',
    assignee: 'member',
    title: 'Xuất profile proof và snapshot công khai',
    description:
      'Seed đủ dữ liệu review, work history và snapshot để màn profile không còn tĩnh và có thể share public.',
    status: 'done',
    taskStatus: 'done',
    label: 'feature',
    priority: 'high',
    difficulty: 'hard',
    visibility: 'internal',
    dueDaysOffset: -10,
    assignmentCompletedDaysAgo: 8,
    assignmentEstimatedHours: 22,
    assignmentActualHours: 24,
    taskType: 'feature_development',
    acceptanceCriteria: [
      'Profile hiển thị metrics, skills và featured reviews từ dữ liệu thật',
      'Có current snapshot và lịch sử snapshot để user kiểm tra share link',
    ],
    verificationMethod: 'demo_presentation',
    expectedDeliverables: [
      'Published profile snapshot',
      'Verified work history',
      'Review evidence links',
    ],
    contextBackground:
      'Task này phục vụ trực tiếp cho tài khoản user thường cần có hồ sơ đã hoàn thiện và đã được hệ thống tổng hợp.',
    impactScope: 'project',
    techStack: ['PostgreSQL', 'MongoDB', 'Svelte'],
    environment: 'staging',
    collaborationType: 'cross_team',
    complexityNotes:
      'Liên quan đồng thời đến review_sessions, skill_reviews, user_profile_snapshots.',
    measurableOutcomes: [
      { metric: 'profile_snapshot_versions', target: 1 },
      { metric: 'featured_reviews_visible', target: true },
    ],
    learningObjectives: ['Profile aggregation pipeline', 'Snapshot publication'],
    domainTags: ['profile', 'proof', 'review'],
    roleInTask: 'contributor',
    autonomyLevel: 'autonomous',
    problemCategory: 'new_capability',
    businessDomain: 'saas',
    estimatedUsersAffected: 18,
    estimatedBudget: 15000000,
    requiredSkills: ['postgresql', 'testing', 'problem_solving'],
  },
  {
    key: 'member-admin-regression',
    organization: 'orgA',
    project: 'orgAOperations',
    creator: 'owner',
    assignee: 'member',
    title: 'Chuẩn bị regression pack cho admin redirect',
    description:
      'Tạo checklist và tài liệu kiểm thử để xác minh superadmin luôn vào /admin thay vì rơi về organization workspace.',
    status: 'done',
    taskStatus: 'done',
    label: 'documentation',
    priority: 'medium',
    difficulty: 'medium',
    visibility: 'internal',
    dueDaysOffset: -7,
    assignmentCompletedDaysAgo: 6,
    assignmentEstimatedHours: 10,
    assignmentActualHours: 9,
    taskType: 'technical_writing',
    acceptanceCriteria: [
      'Có checklist login superadmin',
      'Có checklist browser back sau khi vào admin',
    ],
    verificationMethod: 'documentation_review',
    expectedDeliverables: ['Admin redirect checklist', 'Back navigation notes'],
    contextBackground:
      'Tài liệu dùng để kiểm tra các lỗi redirect không ổn định giữa admin và organization context.',
    impactScope: 'team',
    techStack: ['Documentation', 'Svelte'],
    environment: 'mixed',
    collaborationType: 'small_team',
    complexityNotes:
      'Phải mô tả rõ các case có current organization và không có current organization.',
    measurableOutcomes: [{ metric: 'regression_cases_documented', target: 8 }],
    learningObjectives: ['Regression planning', 'Navigation bug isolation'],
    domainTags: ['admin', 'redirect', 'qa'],
    roleInTask: 'reviewer',
    autonomyLevel: 'supervised',
    problemCategory: 'maintainability',
    businessDomain: 'internal_tooling',
    estimatedUsersAffected: 8,
    estimatedBudget: 5000000,
    requiredSkills: ['testing', 'communication'],
  },
  {
    key: 'member-profile-live',
    organization: 'orgA',
    project: 'orgAPlatform',
    creator: 'orgAdmin',
    assignee: 'member',
    title: 'Giữ profile user đồng bộ sau mỗi lần review',
    description:
      'Task đang làm dở để kiểm tra profile user còn hiển thị dynamic khi có công việc active và review chưa hoàn tất.',
    status: 'in_review',
    taskStatus: 'in_review',
    label: 'enhancement',
    priority: 'high',
    difficulty: 'medium',
    visibility: 'internal',
    dueDaysOffset: 4,
    assignmentEstimatedHours: 14,
    assignmentActualHours: 8,
    taskType: 'feature_development',
    acceptanceCriteria: [
      'Widget profile lấy số liệu active task mới nhất',
      'Snapshot history reload được ngay sau publish',
    ],
    verificationMethod: 'code_review',
    expectedDeliverables: ['Reactive profile widgets', 'Review-ready merge request'],
    contextBackground: 'Dùng để test trạng thái đang làm của user thường trên workspace profile.',
    impactScope: 'project',
    techStack: ['Svelte', 'Redis'],
    environment: 'development',
    collaborationType: 'pair_programming',
    complexityNotes: 'Cần invalidation cache đúng khi publish snapshot.',
    measurableOutcomes: [{ metric: 'profile_refresh_seconds', target: '< 2' }],
    learningObjectives: ['Cache invalidation', 'Profile UI state'],
    domainTags: ['profile', 'cache', 'reactivity'],
    roleInTask: 'contributor',
    autonomyLevel: 'autonomous',
    problemCategory: 'ux_improvement',
    businessDomain: 'saas',
    estimatedUsersAffected: 16,
    estimatedBudget: 9000000,
    requiredSkills: ['typescript', 'testing'],
  },
  {
    key: 'owner-admin-investigation',
    organization: 'orgA',
    project: 'orgAOperations',
    creator: 'owner',
    assignee: 'owner',
    title: 'Theo dõi lỗi redirect của superadmin sau social login',
    description:
      'Task dành cho tài khoản chủ tổ chức để kiểm thử dữ liệu dashboard, log điều hướng và các case back/forward của giao diện admin.',
    status: 'in_progress',
    taskStatus: 'in_progress',
    label: 'bug',
    priority: 'urgent',
    difficulty: 'hard',
    visibility: 'internal',
    dueDaysOffset: 2,
    assignmentEstimatedHours: 20,
    assignmentActualHours: 11,
    taskType: 'bug_fix',
    acceptanceCriteria: [
      'Superadmin luôn redirect vào /admin sau callback',
      'Không phát sinh redirect ngoài ý muốn về organization khi chưa tắt admin mode',
    ],
    verificationMethod: 'manager_approval',
    expectedDeliverables: ['Issue triage notes', 'Redirect trace', 'Session state summary'],
    contextBackground:
      'Task này gắn trực tiếp với việc kiểm tra hành vi của tài khoản DuyetTN3112(edu).',
    impactScope: 'organization',
    techStack: ['AdonisJS', 'PostgreSQL', 'MongoDB'],
    environment: 'staging',
    collaborationType: 'cross_team',
    complexityNotes: 'Đụng tới auth callback, session và admin mode toggle.',
    measurableOutcomes: [{ metric: 'admin_redirect_failures', target: 0 }],
    learningObjectives: ['Auth redirect tracing', 'Admin mode state'],
    domainTags: ['admin', 'auth', 'session'],
    roleInTask: 'lead',
    autonomyLevel: 'led_others',
    problemCategory: 'maintainability',
    businessDomain: 'internal_tooling',
    estimatedUsersAffected: 6,
    estimatedBudget: 18000000,
    requiredSkills: ['leadership', 'communication', 'postgresql'],
  },
  {
    key: 'owner-seed-governance',
    organization: 'orgA',
    project: 'orgAOperations',
    creator: 'owner',
    assignee: 'orgAdmin',
    title: 'Điều phối seed data đa vai trò cho demo local',
    description:
      'Seed dữ liệu đủ cho ba giao diện: system admin, organization admin/owner và user thường.',
    status: 'done',
    taskStatus: 'done',
    label: 'enhancement',
    priority: 'medium',
    difficulty: 'medium',
    visibility: 'internal',
    dueDaysOffset: -5,
    assignmentCompletedDaysAgo: 3,
    assignmentEstimatedHours: 12,
    assignmentActualHours: 12,
    taskType: 'feature_development',
    acceptanceCriteria: [
      'Có ít nhất hai organization với role khác nhau cho cùng một user',
      'Có review data và audit log cho admin kiểm tra',
    ],
    verificationMethod: 'manager_approval',
    expectedDeliverables: ['Reusable seed command', 'Role coverage matrix'],
    contextBackground: 'Task này tạo dữ liệu nền cho toàn bộ môi trường test local.',
    impactScope: 'organization',
    techStack: ['TypeScript', 'PostgreSQL', 'MongoDB'],
    environment: 'development',
    collaborationType: 'small_team',
    complexityNotes: 'Phải đồng bộ cả PostgreSQL lẫn MongoDB.',
    measurableOutcomes: [{ metric: 'seed_command_success', target: true }],
    learningObjectives: ['Cross-database seeding'],
    domainTags: ['seed', 'local-dev', 'roles'],
    roleInTask: 'lead',
    autonomyLevel: 'led_others',
    problemCategory: 'automation',
    businessDomain: 'internal_tooling',
    estimatedUsersAffected: 10,
    estimatedBudget: 11000000,
    requiredSkills: ['typescript', 'devops', 'problem_solving'],
  },
  {
    key: 'marketplace-content-pass',
    organization: 'orgA',
    project: 'orgAPlatform',
    creator: 'owner',
    title: 'Viết lại nội dung public task cho marketplace',
    description:
      'Task public để test luồng ứng tuyển của freelancer và số liệu external applications trên board.',
    status: 'todo',
    taskStatus: 'todo',
    label: 'documentation',
    priority: 'medium',
    difficulty: 'easy',
    visibility: 'all',
    dueDaysOffset: 9,
    taskType: 'technical_writing',
    acceptanceCriteria: [
      'Mô tả task rõ ràng cho external contributor',
      'Có application deadline và danh sách deliverables',
    ],
    verificationMethod: 'documentation_review',
    expectedDeliverables: ['Marketplace task brief', 'Ready-to-apply scope'],
    contextBackground: 'Dùng để seed marketplace data cho giao diện task applications.',
    impactScope: 'end_users',
    techStack: ['Documentation'],
    environment: 'development',
    collaborationType: 'solo',
    complexityNotes: 'Task không assign sẵn để freelancer có thể apply.',
    measurableOutcomes: [{ metric: 'applications_expected', target: 2 }],
    learningObjectives: ['Marketplace copywriting'],
    domainTags: ['marketplace', 'copy', 'external'],
    roleInTask: 'architect',
    autonomyLevel: 'autonomous',
    problemCategory: 'new_capability',
    businessDomain: 'saas',
    estimatedUsersAffected: 120,
    estimatedBudget: 7000000,
    applicationDeadlineDaysAhead: 5,
    requiredSkills: ['communication', 'code_review'],
  },
  {
    key: 'marketplace-qa-pipeline',
    organization: 'orgA',
    project: 'orgAPlatform',
    creator: 'orgAdmin',
    title: 'Thiết lập checklist QA cho contributor ngoài hệ thống',
    description:
      'Một task open khác để kiểm tra số liệu ứng tuyển, approval và notification liên quan.',
    status: 'todo',
    taskStatus: 'todo',
    label: 'feature',
    priority: 'high',
    difficulty: 'medium',
    visibility: 'external',
    dueDaysOffset: 12,
    taskType: 'qa_testing',
    acceptanceCriteria: [
      'Có checklist xác minh deliverables từ freelancer',
      'Notification gửi về owner khi có ứng viên mới',
    ],
    verificationMethod: 'manual_qa',
    expectedDeliverables: ['QA checklist', 'Approval flow note'],
    contextBackground: 'Task phục vụ kiểm thử application flow và notification dropdown.',
    impactScope: 'project',
    techStack: ['Testing', 'MongoDB'],
    environment: 'staging',
    collaborationType: 'small_team',
    complexityNotes: 'Task public nhưng vẫn cần role owner xem application list.',
    measurableOutcomes: [{ metric: 'new_application_notifications', target: 2 }],
    learningObjectives: ['Freelancer intake flow'],
    domainTags: ['marketplace', 'qa', 'notification'],
    roleInTask: 'reviewer',
    autonomyLevel: 'supervised',
    problemCategory: 'automation',
    businessDomain: 'saas',
    estimatedUsersAffected: 60,
    estimatedBudget: 13000000,
    applicationDeadlineDaysAhead: 7,
    requiredSkills: ['testing', 'communication'],
  },
  {
    key: 'orgb-onboarding',
    organization: 'orgB',
    project: 'orgBKnowledgeBase',
    creator: 'orgBOwner',
    assignee: 'owner',
    title: 'Chuẩn hóa handbook onboarding cho org B',
    description:
      'Task ở organization B để tài khoản tranngocduyet31@gmail.com có thể test khi chuyển sang org mà chỉ là member thường.',
    status: 'in_progress',
    taskStatus: 'in_progress',
    label: 'documentation',
    priority: 'medium',
    difficulty: 'medium',
    visibility: 'internal',
    dueDaysOffset: 6,
    assignmentEstimatedHours: 12,
    assignmentActualHours: 5,
    taskType: 'technical_writing',
    acceptanceCriteria: [
      'Tài khoản owner của org A vẫn xem được task ở org B với role member',
      'Không hiện menu quản trị org khi đang ở org B',
    ],
    verificationMethod: 'documentation_review',
    expectedDeliverables: ['Org B onboarding handbook draft'],
    contextBackground:
      'Task này dùng để test chính xác case chuyển từ org_owner ở A sang org_member ở B.',
    impactScope: 'team',
    techStack: ['Documentation', 'Svelte'],
    environment: 'development',
    collaborationType: 'small_team',
    complexityNotes: 'Tập trung vào UI context của organization switcher.',
    measurableOutcomes: [{ metric: 'org_b_layout_correct', target: true }],
    learningObjectives: ['Context switching'],
    domainTags: ['organization', 'member-view'],
    roleInTask: 'contributor',
    autonomyLevel: 'supervised',
    problemCategory: 'ux_improvement',
    businessDomain: 'edtech',
    estimatedUsersAffected: 14,
    estimatedBudget: 6000000,
    requiredSkills: ['communication'],
  },
]

const EXTRA_TASK_SPECS: TaskSpec[] = [
  {
    key: 'orga-design-refresh',
    organization: 'orgA',
    project: 'orgADesignSystem',
    creator: 'owner',
    assignee: 'orgAdmin',
    title: 'Refactor design tokens cho dashboard đa vai trò',
    description:
      'Mở rộng token và component states để owner/admin/member nhìn khác nhau rõ ràng trên cùng một shell.',
    status: 'in_progress',
    taskStatus: 'in_progress',
    label: 'feature',
    priority: 'high',
    difficulty: 'medium',
    visibility: 'internal',
    dueDaysOffset: 6,
    assignmentEstimatedHours: 18,
    assignmentActualHours: 7,
    taskType: 'ui_ux_design',
    acceptanceCriteria: [
      'Role badge hiển thị rõ trên sidebar và header',
      'State member không còn hiện quick action của owner',
    ],
    verificationMethod: 'code_review',
    expectedDeliverables: ['Updated design tokens', 'Role-aware layout states'],
    contextBackground: 'Task dùng để test sự khác biệt thị giác giữa org owner và org member.',
    impactScope: 'organization',
    techStack: ['Svelte', 'TypeScript', 'Design System'],
    environment: 'development',
    collaborationType: 'small_team',
    complexityNotes: 'Cần đồng bộ component shared giữa app layout, org layout và admin layout.',
    measurableOutcomes: [{ metric: 'role_visual_regressions', target: 0 }],
    learningObjectives: ['Role-aware interface patterns'],
    domainTags: ['design-system', 'rbac', 'layout'],
    roleInTask: 'lead',
    autonomyLevel: 'autonomous',
    problemCategory: 'ux_improvement',
    businessDomain: 'saas',
    estimatedUsersAffected: 80,
    estimatedBudget: 14000000,
    requiredSkills: ['svelte', 'typescript', 'communication'],
  },
  {
    key: 'orga-admin-dashboard-metrics',
    organization: 'orgA',
    project: 'orgAAnalytics',
    creator: 'owner',
    assignee: 'owner',
    title: 'Mở rộng dashboard hệ thống với package và moderation metrics',
    description:
      'Task phục vụ dựng dashboard admin nhiều lát cắt hơn: subscription, flagged reviews, audit activity và adoption.',
    status: 'in_review',
    taskStatus: 'in_review',
    label: 'feature',
    priority: 'urgent',
    difficulty: 'hard',
    visibility: 'internal',
    dueDaysOffset: 3,
    assignmentEstimatedHours: 24,
    assignmentActualHours: 19,
    taskType: 'feature_development',
    acceptanceCriteria: [
      'Dashboard có thêm card package usage và moderation backlog',
      'Admin nhìn được top organizations và top users theo usage',
    ],
    verificationMethod: 'manager_approval',
    expectedDeliverables: ['Admin metric widgets', 'Dashboard drilldown spec'],
    contextBackground: 'Task này dùng để test trực tiếp các màn dashboard của system admin.',
    impactScope: 'organization',
    techStack: ['AdonisJS', 'PostgreSQL', 'MongoDB'],
    environment: 'staging',
    collaborationType: 'cross_team',
    complexityNotes: 'Phải ghép dữ liệu từ PostgreSQL subscriptions và Mongo audit logs.',
    measurableOutcomes: [{ metric: 'admin_dashboard_sections', target: 6 }],
    learningObjectives: ['Cross-store analytics'],
    domainTags: ['admin', 'dashboard', 'analytics'],
    roleInTask: 'architect',
    autonomyLevel: 'led_others',
    problemCategory: 'new_capability',
    businessDomain: 'internal_tooling',
    estimatedUsersAffected: 12,
    estimatedBudget: 22000000,
    requiredSkills: ['postgresql', 'mongodb', 'leadership'],
  },
  {
    key: 'orga-review-dispute-detail',
    organization: 'orgA',
    project: 'orgAAnalytics',
    creator: 'orgAdmin',
    assignee: 'peerReviewer',
    title: 'Dựng màn review dispute detail cho system admin',
    description:
      'Tạo dữ liệu và UI để admin xem chi tiết flagged review, evidence, reviewer và reviewee trước khi resolve.',
    status: 'todo',
    taskStatus: 'todo',
    label: 'enhancement',
    priority: 'high',
    difficulty: 'medium',
    visibility: 'internal',
    dueDaysOffset: 11,
    assignmentEstimatedHours: 13,
    taskType: 'feature_development',
    acceptanceCriteria: [
      'Có detail page cho flagged review',
      'Có resolve action trực tiếp từ detail page',
    ],
    verificationMethod: 'manual_qa',
    expectedDeliverables: ['Flagged review detail view', 'Dispute checklist'],
    contextBackground: 'Task này chốt phần còn thiếu để admin xử lý tranh chấp review.',
    impactScope: 'organization',
    techStack: ['Svelte', 'MongoDB', 'PostgreSQL'],
    environment: 'staging',
    collaborationType: 'small_team',
    complexityNotes: 'Cần ghép flagged review, review session, skill review và evidence.',
    measurableOutcomes: [{ metric: 'review_detail_resolution_steps', target: 2 }],
    learningObjectives: ['Moderation UX'],
    domainTags: ['review', 'moderation', 'detail'],
    roleInTask: 'reviewer',
    autonomyLevel: 'autonomous',
    problemCategory: 'maintainability',
    businessDomain: 'internal_tooling',
    estimatedUsersAffected: 6,
    estimatedBudget: 9000000,
    requiredSkills: ['testing', 'communication', 'problem_solving'],
  },
  {
    key: 'orga-notification-center',
    organization: 'orgA',
    project: 'orgAPlatform',
    creator: 'orgAdmin',
    assignee: 'member',
    title: 'Hoàn thiện notification center với empty state và quick actions',
    description:
      'Bổ sung trạng thái trống, refresh, mark-as-read và hành vi dropdown rõ ràng cho user workspace.',
    status: 'in_progress',
    taskStatus: 'in_progress',
    label: 'enhancement',
    priority: 'high',
    difficulty: 'medium',
    visibility: 'internal',
    dueDaysOffset: 5,
    assignmentEstimatedHours: 12,
    assignmentActualHours: 4,
    taskType: 'feature_development',
    acceptanceCriteria: [
      'Icon notification click ra được dữ liệu seeded thật',
      'Có phân biệt unread/read rõ ràng',
    ],
    verificationMethod: 'manual_qa',
    expectedDeliverables: ['Notification dropdown polish', 'UI state checklist'],
    contextBackground: 'Task dùng để test issue notification icon không hiển thị gì.',
    impactScope: 'project',
    techStack: ['Svelte', 'MongoDB'],
    environment: 'development',
    collaborationType: 'pair_programming',
    complexityNotes: 'Phụ thuộc dữ liệu Mongo và route JSON trong workspace shell.',
    measurableOutcomes: [{ metric: 'notification_dropdown_errors', target: 0 }],
    learningObjectives: ['Async UI state'],
    domainTags: ['notification', 'workspace', 'ux'],
    roleInTask: 'contributor',
    autonomyLevel: 'autonomous',
    problemCategory: 'ux_improvement',
    businessDomain: 'saas',
    estimatedUsersAffected: 140,
    estimatedBudget: 11000000,
    requiredSkills: ['svelte', 'testing'],
  },
  {
    key: 'orgb-member-task-board',
    organization: 'orgB',
    project: 'orgBCurriculumOps',
    creator: 'orgBOwner',
    assignee: 'owner',
    title: 'Chuẩn bị board công việc cho member view của org B',
    description:
      'Tạo thêm task được assign cho Suar khi đang ở org B để task board không còn trống sau khi switch.',
    status: 'in_progress',
    taskStatus: 'in_progress',
    label: 'feature',
    priority: 'medium',
    difficulty: 'medium',
    visibility: 'internal',
    dueDaysOffset: 7,
    assignmentEstimatedHours: 10,
    assignmentActualHours: 3,
    taskType: 'technical_writing',
    acceptanceCriteria: [
      'Member view ở org B nhìn thấy task được giao',
      'Không lộ menu quản trị org',
    ],
    verificationMethod: 'documentation_review',
    expectedDeliverables: ['Org B task board demo content'],
    contextBackground:
      'Task này tồn tại để user test đúng trường hợp member ở org B vẫn có dữ liệu để thao tác.',
    impactScope: 'team',
    techStack: ['Documentation', 'Svelte'],
    environment: 'development',
    collaborationType: 'small_team',
    complexityNotes: 'Quan trọng ở mặt context chứ không phải logic domain sâu.',
    measurableOutcomes: [{ metric: 'org_b_visible_tasks_for_owner_account', target: 2 }],
    learningObjectives: ['Cross-org context testing'],
    domainTags: ['organization', 'member-view', 'tasks'],
    roleInTask: 'contributor',
    autonomyLevel: 'supervised',
    problemCategory: 'ux_improvement',
    businessDomain: 'edtech',
    estimatedUsersAffected: 15,
    estimatedBudget: 5000000,
    requiredSkills: ['communication'],
  },
  {
    key: 'orgb-content-calendar',
    organization: 'orgB',
    project: 'orgBCurriculumOps',
    creator: 'orgBOwner',
    assignee: 'orgBOwner',
    title: 'Lập content calendar cho handbook và onboarding của org B',
    description:
      'Task bổ sung để project detail và task list của org B có mật độ dữ liệu thực tế hơn.',
    status: 'todo',
    taskStatus: 'todo',
    label: 'documentation',
    priority: 'low',
    difficulty: 'easy',
    visibility: 'internal',
    dueDaysOffset: 15,
    assignmentEstimatedHours: 6,
    taskType: 'technical_writing',
    acceptanceCriteria: ['Có lịch nội dung 4 tuần', 'Có owner rõ cho từng bài'],
    verificationMethod: 'documentation_review',
    expectedDeliverables: ['Content calendar draft'],
    contextBackground: 'Task seed density cho org B.',
    impactScope: 'team',
    techStack: ['Documentation'],
    environment: 'development',
    collaborationType: 'solo',
    complexityNotes: 'Low complexity seed task.',
    measurableOutcomes: [{ metric: 'content_slots_seeded', target: 4 }],
    learningObjectives: ['Content operations'],
    domainTags: ['content', 'edtech'],
    roleInTask: 'lead',
    autonomyLevel: 'autonomous',
    problemCategory: 'automation',
    businessDomain: 'edtech',
    estimatedUsersAffected: 9,
    estimatedBudget: 3000000,
    requiredSkills: ['communication'],
  },
  {
    key: 'orgb-navigation-qa',
    organization: 'orgB',
    project: 'orgBKnowledgeBase',
    creator: 'orgBOwner',
    assignee: 'owner',
    title: 'Kiểm thử navigation sau khi quay lại từ admin mode',
    description:
      'Tạo task ở org B để tài khoản Suar có thêm một case member-only liên quan navigation và browser history.',
    status: 'done',
    taskStatus: 'done',
    label: 'documentation',
    priority: 'medium',
    difficulty: 'medium',
    visibility: 'internal',
    dueDaysOffset: -6,
    assignmentCompletedDaysAgo: 4,
    assignmentEstimatedHours: 8,
    assignmentActualHours: 8,
    taskType: 'qa_testing',
    acceptanceCriteria: [
      'Back button không nhảy sai context',
      'Session giữ đúng current organization',
    ],
    verificationMethod: 'manual_qa',
    expectedDeliverables: ['Navigation QA report'],
    contextBackground: 'Giúp profile/history của owner account có thêm dữ liệu ngoài org A.',
    impactScope: 'team',
    techStack: ['Svelte', 'Browser'],
    environment: 'staging',
    collaborationType: 'small_team',
    complexityNotes: 'Phụ thuộc browser history và session state.',
    measurableOutcomes: [{ metric: 'unexpected_redirects', target: 0 }],
    learningObjectives: ['History navigation'],
    domainTags: ['admin', 'navigation', 'session'],
    roleInTask: 'contributor',
    autonomyLevel: 'supervised',
    problemCategory: 'maintainability',
    businessDomain: 'edtech',
    estimatedUsersAffected: 10,
    estimatedBudget: 6000000,
    requiredSkills: ['testing', 'communication'],
  },
  {
    key: 'orgc-marketplace-ranking',
    organization: 'orgC',
    project: 'orgCMarketplaceLab',
    creator: 'peerReviewer',
    assignee: 'owner',
    title: 'So sánh package Pro và ProMax trong ranking của marketplace',
    description:
      'Task ở org C để seed thêm ngữ cảnh cross-org cho account owner và dữ liệu liên quan package management.',
    status: 'in_progress',
    taskStatus: 'in_progress',
    label: 'feature',
    priority: 'high',
    difficulty: 'hard',
    visibility: 'internal',
    dueDaysOffset: 9,
    assignmentEstimatedHours: 16,
    assignmentActualHours: 6,
    taskType: 'feature_development',
    acceptanceCriteria: [
      'Có bảng so sánh package Pro/ProMax',
      'Admin dashboard đọc được adoption theo package',
    ],
    verificationMethod: 'code_review',
    expectedDeliverables: ['Package comparison matrix', 'Adoption counters'],
    contextBackground: 'Task phục vụ trực tiếp cho admin package management page.',
    impactScope: 'organization',
    techStack: ['PostgreSQL', 'Svelte'],
    environment: 'staging',
    collaborationType: 'small_team',
    complexityNotes: 'Phụ thuộc user_subscriptions và admin analytics.',
    measurableOutcomes: [{ metric: 'package_segments_visible', target: 2 }],
    learningObjectives: ['Package analytics'],
    domainTags: ['subscription', 'marketplace', 'admin'],
    roleInTask: 'architect',
    autonomyLevel: 'autonomous',
    problemCategory: 'new_capability',
    businessDomain: 'saas',
    estimatedUsersAffected: 70,
    estimatedBudget: 16000000,
    requiredSkills: ['postgresql', 'typescript', 'problem_solving'],
  },
  {
    key: 'orgc-top-contributors',
    organization: 'orgC',
    project: 'orgCMarketplaceLab',
    creator: 'peerReviewer',
    assignee: 'orgAdmin',
    title: 'Seed top contributors leaderboard cho dashboard hệ thống',
    description:
      'Task tạo thêm scenario analytics để dashboard admin có ranking người dùng và tổ chức nổi bật.',
    status: 'todo',
    taskStatus: 'todo',
    label: 'enhancement',
    priority: 'medium',
    difficulty: 'medium',
    visibility: 'internal',
    dueDaysOffset: 12,
    assignmentEstimatedHours: 9,
    taskType: 'feature_development',
    acceptanceCriteria: ['Dashboard có top users', 'Dashboard có top organizations'],
    verificationMethod: 'manager_approval',
    expectedDeliverables: ['Leaderboard cards'],
    contextBackground: 'Bổ sung đủ data shapes cho system admin dashboard.',
    impactScope: 'organization',
    techStack: ['AdonisJS', 'Charts'],
    environment: 'development',
    collaborationType: 'small_team',
    complexityNotes: 'Cần aggregate qua projects, tasks và memberships.',
    measurableOutcomes: [{ metric: 'dashboard_leaderboards', target: 2 }],
    learningObjectives: ['Aggregation design'],
    domainTags: ['analytics', 'leaderboard', 'dashboard'],
    roleInTask: 'contributor',
    autonomyLevel: 'autonomous',
    problemCategory: 'automation',
    businessDomain: 'saas',
    estimatedUsersAffected: 20,
    estimatedBudget: 8000000,
    requiredSkills: ['typescript', 'testing'],
  },
  {
    key: 'orgd-talent-proof',
    organization: 'orgD',
    project: 'orgDTalentShowcase',
    creator: 'freelancerOne',
    assignee: 'freelancerOne',
    title: 'Xây landing page talent showcase cho external contributors',
    description:
      'Seed thêm một org do freelancer làm owner để admin thấy hệ thống có nhiều loại tổ chức và project hơn.',
    status: 'done',
    taskStatus: 'done',
    label: 'feature',
    priority: 'medium',
    difficulty: 'medium',
    visibility: 'internal',
    dueDaysOffset: -9,
    assignmentCompletedDaysAgo: 5,
    assignmentEstimatedHours: 14,
    assignmentActualHours: 13,
    taskType: 'feature_development',
    acceptanceCriteria: ['Có public showcase draft', 'Có proof links để admin xem'],
    verificationMethod: 'demo_presentation',
    expectedDeliverables: ['Talent showcase landing', 'Portfolio attachments'],
    contextBackground: 'Làm dày dataset cho admin organization overview.',
    impactScope: 'end_users',
    techStack: ['Svelte', 'TypeScript'],
    environment: 'staging',
    collaborationType: 'solo',
    complexityNotes: 'Task seed thêm đa dạng owner type.',
    measurableOutcomes: [{ metric: 'showcase_sections', target: 3 }],
    learningObjectives: ['Portfolio presentation'],
    domainTags: ['portfolio', 'external', 'talent'],
    roleInTask: 'lead',
    autonomyLevel: 'autonomous',
    problemCategory: 'new_capability',
    businessDomain: 'saas',
    estimatedUsersAffected: 55,
    estimatedBudget: 10000000,
    requiredSkills: ['svelte', 'communication'],
  },
  {
    key: 'orgd-package-upsell',
    organization: 'orgD',
    project: 'orgDTalentShowcase',
    creator: 'freelancerOne',
    title: 'Thiết kế nội dung upsell cho gói ProMax',
    description:
      'Task public để admin và user đều có thể test thêm dữ liệu package-related và marketplace.',
    status: 'todo',
    taskStatus: 'todo',
    label: 'documentation',
    priority: 'medium',
    difficulty: 'easy',
    visibility: 'all',
    dueDaysOffset: 10,
    taskType: 'technical_writing',
    acceptanceCriteria: ['Copy nhấn mạnh khác biệt Pro và ProMax', 'Có CTA rõ ràng'],
    verificationMethod: 'documentation_review',
    expectedDeliverables: ['Upsell copy deck'],
    contextBackground: 'Tạo thêm public task và data cho package management narratives.',
    impactScope: 'end_users',
    techStack: ['Documentation'],
    environment: 'development',
    collaborationType: 'solo',
    complexityNotes: 'Task mở cho external apply.',
    measurableOutcomes: [{ metric: 'upsell_copy_variants', target: 2 }],
    learningObjectives: ['Package positioning'],
    domainTags: ['package', 'copy', 'marketplace'],
    roleInTask: 'architect',
    autonomyLevel: 'autonomous',
    problemCategory: 'new_capability',
    businessDomain: 'saas',
    estimatedUsersAffected: 75,
    estimatedBudget: 4500000,
    applicationDeadlineDaysAhead: 6,
    requiredSkills: ['communication', 'testing'],
  },
]

const SEEDED_TASK_SPECS = [...TASK_SPECS, ...EXTRA_TASK_SPECS]

export default class SeedData extends BaseCommand {
  static override commandName = 'seed:data'
  static override description = 'Seed deterministic local demo data for admin/org/user flows'

  static override options: CommandOptions = {
    startApp: true,
    staysAlive: true,
  }

  @flags.boolean({ description: 'Delete all existing seedable data before inserting the demo set' })
  declare fresh: boolean

  private seedCompleted = false

  private installShutdownErrorGuard(): void {
    process.once('uncaughtException', (error) => {
      if (
        this.seedCompleted &&
        error instanceof Error &&
        error.message.startsWith('Connection terminated')
      ) {
        this.logger.warning('Ignoring late PostgreSQL shutdown error after successful seed.')
        process.exit(0)
      }

      this.logger.error(
        `Seed command crashed: ${error instanceof Error ? error.message : String(error)}`
      )
      process.exit(1)
    })
  }

  override async run() {
    this.installShutdownErrorGuard()
    this.logger.info('Starting deterministic seed for admin/org/user demo data...')

    let context!: SeedContext

    await db.transaction(async (trx) => {
      if (this.fresh) {
        this.logger.warning('Clearing PostgreSQL seed scope...')
        await this.resetPostgres(trx)
      }

      const skills = await this.seedSkills(trx)
      const users = await this.seedUsers(trx)
      const organizations = await this.seedOrganizations(trx, users)
      await this.seedOrganizationMemberships(trx, users, organizations)
      const projects = await this.seedProjects(trx, users, organizations)
      await this.seedProjectMembers(trx, users, projects)
      const statuses = await this.seedTaskStatuses(trx, organizations)
      const tasks = await this.seedTasks(trx, users, projects, organizations, statuses)
      const assignments = await this.seedTaskAssignments(trx, users, tasks)
      await this.seedTaskApplications(trx, users, tasks)
      await this.seedTaskRequiredSkills(trx, tasks, skills)
      await this.seedReviewData(trx, users, tasks, assignments, skills, organizations)
      await this.seedUserSkills(trx, users, skills)
      await this.seedUserSubscriptions(trx, users)
      await this.seedProjectAttachments(trx, users, projects)
      await this.updateCurrentOrganizations(trx, users, organizations)

      context = {
        users,
        organizations,
        projects,
        skills,
        tasks,
        assignments,
        snapshots: {},
      }
    })

    await this.ensureMongoConnection()

    if (this.fresh) {
      this.logger.warning('Clearing MongoDB seed scope...')
      await this.resetMongo()
    }

    context = await this.seedProfileAggregates(context)
    await this.seedMongo(context)
    await this.logSummary(context)

    this.seedCompleted = true
    this.logger.success('Seed data inserted successfully.')
    await this.closeSeedConnections()
  }

  private uuid(): string {
    return randomUUID()
  }

  private isoDaysAgo(daysAgo: number, hour = 9): string {
    const value = new Date()
    value.setDate(value.getDate() - daysAgo)
    value.setHours(hour, 0, 0, 0)
    return value.toISOString()
  }

  private isoDaysAhead(daysAhead: number, hour = 17): string {
    const value = new Date()
    value.setDate(value.getDate() + daysAhead)
    value.setHours(hour, 0, 0, 0)
    return value.toISOString()
  }

  private toJson(value: unknown): string {
    return JSON.stringify(value)
  }

  private getTaskSpec(taskKey: string): TaskSpec {
    const spec = SEEDED_TASK_SPECS.find((item) => item.key === taskKey)
    if (!spec) {
      throw new Error(`Missing task spec for ${taskKey}`)
    }

    return spec
  }

  private readNonEmptyString(value: unknown, fallback: string): string {
    return typeof value === 'string' && value.length > 0 ? value : fallback
  }

  private toRecord(value: unknown): Record<string, unknown> {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>
    }

    return {}
  }

  private parseJsonRecord(value: string): Record<string, unknown> {
    const parsed: unknown = JSON.parse(value)
    return this.toRecord(parsed)
  }

  private requireValue<T>(value: T | undefined, label: string): T {
    if (value === undefined) {
      throw new Error(`Missing seeded value for ${label}`)
    }

    return value
  }

  private applyWhere(query: any, where: Record<string, unknown>) {
    for (const [key, value] of Object.entries(where)) {
      query.where(key, value)
    }
    return query
  }

  private async findRow(trx: any, table: string, where: Record<string, unknown>) {
    return await this.applyWhere(trx.from(table), where).first()
  }

  private async deleteTableIfExists(trx: any, table: string): Promise<void> {
    const exists = await trx
      .from('information_schema.tables')
      .where('table_schema', 'public')
      .where('table_name', table)
      .first()

    if (!exists) {
      return
    }

    await trx.from(table).delete()
  }

  private async ensureMongoConnection(): Promise<void> {
    const mongoUrl = env.get('MONGODB_URL', '')
    if (!mongoUrl) {
      this.logger.warning('MONGODB_URL is not configured, skipping MongoDB seed.')
      return
    }

    if (mongoose.connection.readyState === 1) {
      return
    }

    if (mongoose.connection.readyState === 2) {
      await mongoose.connection.asPromise()
      return
    }

    await mongoose.connect(mongoUrl)
  }

  private async closeSeedConnections(): Promise<void> {
    if (mongoose.connection.readyState === 1 || mongoose.connection.readyState === 2) {
      await mongoose.disconnect()
    }

    await db.manager.closeAll()
  }

  private async resetPostgres(trx: any): Promise<void> {
    const tables = [
      'flagged_reviews',
      'reverse_reviews',
      'skill_reviews',
      'review_evidences',
      'task_self_assessments',
      'review_sessions',
      'user_profile_snapshots',
      'user_work_history',
      'user_domain_expertise',
      'user_performance_stats',
      'user_skills',
      'recruiter_bookmarks',
      'user_subscriptions',
      'messages',
      'conversation_participants',
      'conversations',
      'task_required_skills',
      'task_versions',
      'task_assignments',
      'task_applications',
      'project_attachments',
      'project_members',
      'tasks',
      'task_workflow_transitions',
      'task_statuses',
      'organization_users',
      'projects',
      'organizations',
      'user_oauth_providers',
      'skills',
      'remember_me_tokens',
      'users',
    ]

    for (const table of tables) {
      await this.deleteTableIfExists(trx, table)
    }
  }

  private async resetMongo(): Promise<void> {
    if (!env.get('MONGODB_URL', '')) {
      return
    }

    await Promise.all([
      MongoNotification.deleteMany({}),
      MongoAuditLogModel.deleteMany({}),
      MongoUserActivityLog.deleteMany({}),
    ])
  }

  private async seedSkills(trx: any): Promise<Record<string, string>> {
    const skillSpecs = [
      ['typescript', 'TypeScript', 'technical'],
      ['svelte', 'Svelte', 'technical'],
      ['postgresql', 'PostgreSQL', 'technical'],
      ['mongodb', 'MongoDB', 'technical'],
      ['devops', 'DevOps', 'technical'],
      ['testing', 'Testing & QA', 'delivery'],
      ['code_review', 'Code Review', 'delivery'],
      ['communication', 'Communication', 'soft_skill'],
      ['problem_solving', 'Problem Solving', 'soft_skill'],
      ['leadership', 'Leadership', 'soft_skill'],
    ] as const

    const result: Record<string, string> = {}

    for (const [code, name, category] of skillSpecs) {
      const existing = await this.findRow(trx, 'skills', { skill_code: code })
      const id = existing?.id ?? this.uuid()
      const payload = {
        category_code: category,
        display_type: 'spider_chart',
        skill_code: code,
        skill_name: name,
        description: `${name} - seeded demo skill for UI verification`,
        icon_url: `https://cdn.suar.local/skills/${code}.svg`,
        is_active: true,
        sort_order: Object.keys(result).length,
        created_at: this.isoDaysAgo(90),
        updated_at: this.isoDaysAgo(1),
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

    return result
  }

  private async seedUsers(trx: any): Promise<Record<UserKey, SeededUser>> {
    const specs: Record<
      UserKey,
      {
        username: string
        email: string
        system_role: 'superadmin' | 'registered_user'
        auth_method: 'google' | 'github'
        bio: string
        is_freelancer: boolean
        rating: number | null
        completedTasks: number
        headline: string
        preferredJobTypes: string[]
      }
    > = {
      owner: {
        username: 'Suar',
        email: 'tranngocduyet31@gmail.com',
        system_role: 'registered_user',
        auth_method: 'github',
        bio: 'Chủ organization A, có dự án đang quản lý và đồng thời là thành viên thường của organization B để test context switching.',
        is_freelancer: false,
        rating: 4.7,
        completedTasks: 2,
        headline: 'Organization owner testing multi-org workspace',
        preferredJobTypes: ['full-time', 'project-based'],
      },
      superadmin: {
        username: 'DuyetTN3112(edu)',
        email: 'td6622i@gre.ac.uk',
        system_role: 'superadmin',
        auth_method: 'google',
        bio: 'System superadmin account dùng để kiểm tra redirect vào admin và dữ liệu trang quản trị.',
        is_freelancer: false,
        rating: null,
        completedTasks: 0,
        headline: 'System administrator for redirect and admin dashboard checks',
        preferredJobTypes: ['admin'],
      },
      member: {
        username: 'duyetlaaithe',
        email: 'duyetlaaithe@gmail.com',
        system_role: 'registered_user',
        auth_method: 'github',
        bio: 'User thường thuộc organization của Suar, đã có task đang làm, task hoàn thành, review, proof và profile snapshot.',
        is_freelancer: true,
        rating: 4.5,
        completedTasks: 3,
        headline: 'Contributor with completed work history and published profile proof',
        preferredJobTypes: ['contract', 'part-time'],
      },
      orgAdmin: {
        username: 'LinhPM',
        email: 'linh.pm@suar.local',
        system_role: 'registered_user',
        auth_method: 'google',
        bio: 'Org admin của organization A, chịu trách nhiệm review và quản lý project.',
        is_freelancer: false,
        rating: 4.6,
        completedTasks: 1,
        headline: 'Organization admin and project manager',
        preferredJobTypes: ['full-time'],
      },
      peerReviewer: {
        username: 'HaQA',
        email: 'ha.qa@suar.local',
        system_role: 'registered_user',
        auth_method: 'google',
        bio: 'Peer reviewer seed user để tạo review chéo và flagged review cho admin kiểm tra.',
        is_freelancer: false,
        rating: 4.2,
        completedTasks: 1,
        headline: 'Peer reviewer for quality and flagged review scenarios',
        preferredJobTypes: ['full-time'],
      },
      orgBOwner: {
        username: 'OpenEduOwner',
        email: 'owner.edu@suar.local',
        system_role: 'registered_user',
        auth_method: 'google',
        bio: 'Chủ organization B, dùng để tạo case chuyển từ owner ở org A sang member ở org B.',
        is_freelancer: false,
        rating: 4.4,
        completedTasks: 1,
        headline: 'Owner of the secondary organization',
        preferredJobTypes: ['full-time'],
      },
      freelancerOne: {
        username: 'MaiFreelancer',
        email: 'mai.freelancer@suar.local',
        system_role: 'registered_user',
        auth_method: 'github',
        bio: 'Freelancer ứng tuyển task public để test marketplace và notification.',
        is_freelancer: true,
        rating: 4.8,
        completedTasks: 6,
        headline: 'External contributor for marketplace scenarios',
        preferredJobTypes: ['freelance', 'contract'],
      },
      freelancerTwo: {
        username: 'NamFreelancer',
        email: 'nam.freelancer@suar.local',
        system_role: 'registered_user',
        auth_method: 'github',
        bio: 'Freelancer phụ thứ hai để task application list có nhiều trạng thái hơn.',
        is_freelancer: true,
        rating: 4.3,
        completedTasks: 4,
        headline: 'Secondary marketplace applicant',
        preferredJobTypes: ['freelance'],
      },
    }

    const seeded: Partial<Record<UserKey, SeededUser>> = {}

    for (const [key, spec] of Object.entries(specs) as Array<[UserKey, (typeof specs)[UserKey]]>) {
      const existing = await this.findRow(trx, 'users', { email: spec.email })
      const id = existing?.id ?? this.uuid()

      const payload = {
        username: spec.username,
        email: spec.email,
        status: 'active',
        system_role: spec.system_role,
        current_organization_id: null,
        auth_method: spec.auth_method,
        avatar_url: `https://api.dicebear.com/9.x/identicon/svg?seed=${encodeURIComponent(spec.username)}`,
        bio: spec.bio,
        phone: '+84900000000',
        address: 'Ho Chi Minh City, Vietnam',
        timezone: 'Asia/Ho_Chi_Minh',
        language: 'vi',
        is_freelancer: spec.is_freelancer,
        freelancer_rating: spec.rating,
        freelancer_completed_tasks_count: spec.completedTasks,
        ranking_priority: spec.system_role === 'superadmin' ? 1 : 2,
        is_verified_badge: true,
        profile_settings: this.toJson({
          is_searchable: spec.is_freelancer,
          show_contact_info: false,
          show_organizations: true,
          show_projects: true,
          show_spider_chart: true,
          show_technical_skills: true,
          custom_headline: spec.headline,
          preferred_job_types: spec.preferredJobTypes,
          preferred_locations: ['remote', 'Ho Chi Minh'],
          min_salary_expectation: spec.is_freelancer ? 25000000 : null,
          salary_currency: 'VND',
          available_from: spec.is_freelancer ? this.isoDaysAhead(7) : null,
        }),
        trust_data: this.toJson({
          current_tier_code: spec.system_role === 'superadmin' ? 'partner' : 'organization',
          calculated_score: spec.system_role === 'superadmin' ? 99 : 82,
          raw_score: spec.system_role === 'superadmin' ? 120 : 94,
          total_verified_reviews: spec.completedTasks,
          last_calculated_at: this.isoDaysAgo(1),
        }),
        credibility_data: this.toJson({
          credibility_score: spec.system_role === 'superadmin' ? 98 : 84,
          total_reviews_given: spec.completedTasks + 2,
          accurate_reviews: spec.completedTasks + 1,
          disputed_reviews: key === 'peerReviewer' ? 1 : 0,
          last_calculated_at: this.isoDaysAgo(1),
        }),
        created_at: this.isoDaysAgo(120),
        updated_at: this.isoDaysAgo(1),
      }

      if (existing) {
        await trx.from('users').where('id', id).update(payload)
      } else {
        await trx
          .insertQuery()
          .table('users')
          .insert({ id, ...payload })
      }

      seeded[key] = {
        id,
        username: spec.username,
        email: spec.email,
      }
    }

    return seeded as Record<UserKey, SeededUser>
  }

  private async seedOrganizations(
    trx: any,
    users: Record<UserKey, SeededUser>
  ): Promise<Record<OrgKey, SeededOrg>> {
    const specs: Record<
      OrgKey,
      {
        name: string
        slug: string
        owner: UserKey
        plan: 'starter' | 'professional'
        description: string
      }
    > = {
      orgA: {
        name: 'Suar Workspace Lab',
        slug: 'suar-workspace-lab',
        owner: 'owner',
        plan: 'professional',
        description:
          'Organization chính dùng để test giao diện owner/admin và dữ liệu project/task cho tài khoản tranngocduyet31@gmail.com.',
      },
      orgB: {
        name: 'Open Education Guild',
        slug: 'open-education-guild',
        owner: 'orgBOwner',
        plan: 'starter',
        description:
          'Organization phụ để kiểm tra case user đổi context từ org_owner sang org_member.',
      },
      orgC: {
        name: 'Creator Circle Studio',
        slug: 'creator-circle-studio',
        owner: 'peerReviewer',
        plan: 'starter',
        description:
          'Organization thứ ba để kiểm tra thêm case user là member ở nhiều org và admin dashboard có nhiều tenants hơn.',
      },
      orgD: {
        name: 'Remote Talent Pool',
        slug: 'remote-talent-pool',
        owner: 'freelancerOne',
        plan: 'professional',
        description:
          'Organization thiên về external contributors, dùng để seed package adoption và public task nhiều hơn.',
      },
    }

    const result: Partial<Record<OrgKey, SeededOrg>> = {}

    for (const [key, spec] of Object.entries(specs) as Array<[OrgKey, (typeof specs)[OrgKey]]>) {
      const existing = await this.findRow(trx, 'organizations', { slug: spec.slug })
      const id = existing?.id ?? this.uuid()
      const payload = {
        name: spec.name,
        slug: spec.slug,
        description: spec.description,
        logo: `https://api.dicebear.com/9.x/shapes/svg?seed=${spec.slug}`,
        website: `https://${spec.slug}.local`,
        plan: spec.plan,
        owner_id: users[spec.owner].id,
        custom_roles: this.toJson([
          {
            name: 'tech_lead',
            permissions: ['manage_projects', 'manage_tasks', 'review_code'],
            description: 'Technical lead',
          },
        ]),
        partner_type: key === 'orgA' ? 'gold' : null,
        partner_verified_at: key === 'orgA' ? this.isoDaysAgo(45) : null,
        partner_verified_by: key === 'orgA' ? users.superadmin.id : null,
        partner_verification_proof:
          key === 'orgA' ? 'Seeded verification proof for local admin testing' : null,
        partner_expires_at: key === 'orgA' ? this.isoDaysAhead(180) : null,
        partner_is_active: key === 'orgA',
        created_at: this.isoDaysAgo(90),
        updated_at: this.isoDaysAgo(2),
      }

      if (existing) {
        await trx.from('organizations').where('id', id).update(payload)
      } else {
        await trx
          .insertQuery()
          .table('organizations')
          .insert({ id, ...payload })
      }

      result[key] = { id, name: spec.name, slug: spec.slug }
    }

    return result as Record<OrgKey, SeededOrg>
  }

  private async seedOrganizationMemberships(
    trx: any,
    users: Record<UserKey, SeededUser>,
    organizations: Record<OrgKey, SeededOrg>
  ): Promise<void> {
    const memberships: Array<{
      organization: OrgKey
      user: UserKey
      role: 'org_owner' | 'org_admin' | 'org_member'
      status: 'approved' | 'pending'
      invitedBy?: UserKey
    }> = [
      { organization: 'orgA', user: 'owner', role: 'org_owner', status: 'approved' },
      {
        organization: 'orgA',
        user: 'orgAdmin',
        role: 'org_admin',
        status: 'approved',
        invitedBy: 'owner',
      },
      {
        organization: 'orgA',
        user: 'member',
        role: 'org_member',
        status: 'approved',
        invitedBy: 'owner',
      },
      {
        organization: 'orgA',
        user: 'peerReviewer',
        role: 'org_member',
        status: 'approved',
        invitedBy: 'orgAdmin',
      },
      {
        organization: 'orgA',
        user: 'freelancerOne',
        role: 'org_member',
        status: 'pending',
        invitedBy: 'owner',
      },
      { organization: 'orgB', user: 'orgBOwner', role: 'org_owner', status: 'approved' },
      {
        organization: 'orgB',
        user: 'owner',
        role: 'org_member',
        status: 'approved',
        invitedBy: 'orgBOwner',
      },
      {
        organization: 'orgB',
        user: 'member',
        role: 'org_member',
        status: 'approved',
        invitedBy: 'orgBOwner',
      },
      { organization: 'orgC', user: 'peerReviewer', role: 'org_owner', status: 'approved' },
      {
        organization: 'orgC',
        user: 'owner',
        role: 'org_member',
        status: 'approved',
        invitedBy: 'peerReviewer',
      },
      {
        organization: 'orgC',
        user: 'orgAdmin',
        role: 'org_admin',
        status: 'approved',
        invitedBy: 'peerReviewer',
      },
      { organization: 'orgD', user: 'freelancerOne', role: 'org_owner', status: 'approved' },
      {
        organization: 'orgD',
        user: 'owner',
        role: 'org_member',
        status: 'approved',
        invitedBy: 'freelancerOne',
      },
      {
        organization: 'orgD',
        user: 'freelancerTwo',
        role: 'org_member',
        status: 'approved',
        invitedBy: 'freelancerOne',
      },
    ]

    for (const item of memberships) {
      const where = {
        organization_id: organizations[item.organization].id,
        user_id: users[item.user].id,
      }
      const existing = await this.findRow(trx, 'organization_users', where)
      const payload = {
        org_role: item.role,
        status: item.status,
        invited_by: item.invitedBy ? users[item.invitedBy].id : null,
        created_at: this.isoDaysAgo(item.status === 'approved' ? 60 : 2),
        updated_at: this.isoDaysAgo(1),
      }

      if (existing) {
        await this.applyWhere(trx.from('organization_users'), where).update(payload)
      } else {
        await trx
          .insertQuery()
          .table('organization_users')
          .insert({ ...where, ...payload })
      }
    }
  }

  private async seedProjects(
    trx: any,
    users: Record<UserKey, SeededUser>,
    organizations: Record<OrgKey, SeededOrg>
  ): Promise<Record<ProjectKey, SeededProject>> {
    const specs: Record<
      ProjectKey,
      {
        name: string
        organization: OrgKey
        creator: UserKey
        owner: UserKey
        manager: UserKey
        status: 'in_progress' | 'completed'
        visibility: 'team' | 'private'
      }
    > = {
      orgAPlatform: {
        name: 'Org Context & Profile Platform',
        organization: 'orgA',
        creator: 'owner',
        owner: 'owner',
        manager: 'orgAdmin',
        status: 'in_progress',
        visibility: 'team',
      },
      orgAOperations: {
        name: 'Admin Quality Control',
        organization: 'orgA',
        creator: 'owner',
        owner: 'owner',
        manager: 'owner',
        status: 'in_progress',
        visibility: 'private',
      },
      orgADesignSystem: {
        name: 'Workspace Design System',
        organization: 'orgA',
        creator: 'owner',
        owner: 'owner',
        manager: 'orgAdmin',
        status: 'in_progress',
        visibility: 'team',
      },
      orgAAnalytics: {
        name: 'System Metrics & Moderation Hub',
        organization: 'orgA',
        creator: 'owner',
        owner: 'owner',
        manager: 'owner',
        status: 'in_progress',
        visibility: 'private',
      },
      orgBKnowledgeBase: {
        name: 'Org B Knowledge Base',
        organization: 'orgB',
        creator: 'orgBOwner',
        owner: 'orgBOwner',
        manager: 'orgBOwner',
        status: 'in_progress',
        visibility: 'team',
      },
      orgBCurriculumOps: {
        name: 'Org B Curriculum Ops',
        organization: 'orgB',
        creator: 'orgBOwner',
        owner: 'orgBOwner',
        manager: 'orgBOwner',
        status: 'in_progress',
        visibility: 'team',
      },
      orgCMarketplaceLab: {
        name: 'Marketplace Growth Lab',
        organization: 'orgC',
        creator: 'peerReviewer',
        owner: 'peerReviewer',
        manager: 'orgAdmin',
        status: 'in_progress',
        visibility: 'team',
      },
      orgDTalentShowcase: {
        name: 'Talent Showcase Portal',
        organization: 'orgD',
        creator: 'freelancerOne',
        owner: 'freelancerOne',
        manager: 'freelancerOne',
        status: 'in_progress',
        visibility: 'team',
      },
    }

    const seeded: Partial<Record<ProjectKey, SeededProject>> = {}

    for (const [key, spec] of Object.entries(specs) as Array<
      [ProjectKey, (typeof specs)[ProjectKey]]
    >) {
      const organizationId = organizations[spec.organization].id
      const existing = await trx
        .from('projects')
        .where('organization_id', organizationId)
        .where('name', spec.name)
        .first()
      const id = existing?.id ?? this.uuid()
      const payload = {
        creator_id: users[spec.creator].id,
        name: spec.name,
        description: `${spec.name} - seeded project for local end-to-end verification.`,
        organization_id: organizationId,
        start_date: this.isoDaysAgo(30),
        end_date: this.isoDaysAhead(45),
        status: spec.status,
        budget: spec.organization === 'orgA' ? 45000000 : 18000000,
        manager_id: users[spec.manager].id,
        owner_id: users[spec.owner].id,
        visibility: spec.visibility,
        allow_freelancer: spec.organization === 'orgA',
        approval_required_for_members: true,
        tags: this.toJson(
          spec.organization === 'orgA' ? ['rbac', 'profile', 'admin'] : ['handbook', 'member-flow']
        ),
        custom_roles: this.toJson([]),
        created_at: this.isoDaysAgo(30),
        updated_at: this.isoDaysAgo(1),
      }

      if (existing) {
        await trx.from('projects').where('id', id).update(payload)
      } else {
        await trx
          .insertQuery()
          .table('projects')
          .insert({ id, ...payload })
      }

      seeded[key] = { id, name: spec.name, organizationId }
    }

    return seeded as Record<ProjectKey, SeededProject>
  }

  private async seedProjectMembers(
    trx: any,
    users: Record<UserKey, SeededUser>,
    projects: Record<ProjectKey, SeededProject>
  ): Promise<void> {
    const rows: Array<{ project: ProjectKey; user: UserKey; role: string }> = [
      { project: 'orgAPlatform', user: 'owner', role: 'project_owner' },
      { project: 'orgAPlatform', user: 'orgAdmin', role: 'project_manager' },
      { project: 'orgAPlatform', user: 'member', role: 'project_member' },
      { project: 'orgAPlatform', user: 'peerReviewer', role: 'project_member' },
      { project: 'orgAOperations', user: 'owner', role: 'project_owner' },
      { project: 'orgAOperations', user: 'orgAdmin', role: 'project_manager' },
      { project: 'orgAOperations', user: 'member', role: 'project_viewer' },
      { project: 'orgADesignSystem', user: 'owner', role: 'project_owner' },
      { project: 'orgADesignSystem', user: 'orgAdmin', role: 'project_manager' },
      { project: 'orgADesignSystem', user: 'member', role: 'project_member' },
      { project: 'orgAAnalytics', user: 'owner', role: 'project_owner' },
      { project: 'orgAAnalytics', user: 'orgAdmin', role: 'project_manager' },
      { project: 'orgAAnalytics', user: 'peerReviewer', role: 'project_member' },
      { project: 'orgBKnowledgeBase', user: 'orgBOwner', role: 'project_owner' },
      { project: 'orgBKnowledgeBase', user: 'owner', role: 'project_member' },
      { project: 'orgBKnowledgeBase', user: 'member', role: 'project_member' },
      { project: 'orgBCurriculumOps', user: 'orgBOwner', role: 'project_owner' },
      { project: 'orgBCurriculumOps', user: 'owner', role: 'project_member' },
      { project: 'orgCMarketplaceLab', user: 'peerReviewer', role: 'project_owner' },
      { project: 'orgCMarketplaceLab', user: 'owner', role: 'project_member' },
      { project: 'orgCMarketplaceLab', user: 'orgAdmin', role: 'project_manager' },
      { project: 'orgDTalentShowcase', user: 'freelancerOne', role: 'project_owner' },
      { project: 'orgDTalentShowcase', user: 'owner', role: 'project_member' },
      { project: 'orgDTalentShowcase', user: 'freelancerTwo', role: 'project_member' },
    ]

    for (const row of rows) {
      const where = {
        project_id: projects[row.project].id,
        user_id: users[row.user].id,
      }
      const existing = await this.findRow(trx, 'project_members', where)
      const payload = {
        project_role: row.role,
        created_at: this.isoDaysAgo(20),
      }

      if (existing) {
        await this.applyWhere(trx.from('project_members'), where).update(payload)
      } else {
        await trx
          .insertQuery()
          .table('project_members')
          .insert({ ...where, ...payload })
      }
    }
  }

  private async seedTaskStatuses(
    trx: any,
    organizations: Record<OrgKey, SeededOrg>
  ): Promise<Record<OrgKey, Record<StatusSlug, string>>> {
    const definitions = [
      { slug: 'todo', name: 'Backlog', category: 'todo', color: '#94A3B8', sort: 0 },
      {
        slug: 'in_progress',
        name: 'In Progress',
        category: 'in_progress',
        color: '#3B82F6',
        sort: 1,
      },
      {
        slug: 'in_review',
        name: 'Ready for Review',
        category: 'in_progress',
        color: '#F59E0B',
        sort: 2,
      },
      { slug: 'done', name: 'Done', category: 'done', color: '#10B981', sort: 3 },
      { slug: 'cancelled', name: 'Cancelled', category: 'cancelled', color: '#64748B', sort: 4 },
    ] as const

    const transitions: Array<[StatusSlug, StatusSlug]> = [
      ['todo', 'in_progress'],
      ['in_progress', 'in_review'],
      ['in_review', 'done'],
      ['in_progress', 'cancelled'],
      ['todo', 'cancelled'],
      ['in_review', 'in_progress'],
    ]

    const result: Partial<Record<OrgKey, Record<StatusSlug, string>>> = {}

    for (const [orgKey, org] of Object.entries(organizations) as Array<[OrgKey, SeededOrg]>) {
      const statusMap: Partial<Record<StatusSlug, string>> = {}

      for (const def of definitions) {
        const existing = await trx
          .from('task_statuses')
          .where('organization_id', org.id)
          .where('slug', def.slug)
          .first()
        const id = existing?.id ?? this.uuid()
        const payload = {
          organization_id: org.id,
          name: def.name,
          slug: def.slug,
          category: def.category,
          color: def.color,
          icon: null,
          description: `${def.name} seeded status`,
          sort_order: def.sort,
          is_default: def.slug === 'todo',
          is_system: true,
          created_at: this.isoDaysAgo(30),
          updated_at: this.isoDaysAgo(1),
          deleted_at: null,
        }

        if (existing) {
          await trx.from('task_statuses').where('id', id).update(payload)
        } else {
          await trx
            .insertQuery()
            .table('task_statuses')
            .insert({ id, ...payload })
        }

        statusMap[def.slug] = id
      }

      await trx.from('task_workflow_transitions').where('organization_id', org.id).delete()

      for (const [from, to] of transitions) {
        await trx
          .insertQuery()
          .table('task_workflow_transitions')
          .insert({
            id: this.uuid(),
            organization_id: org.id,
            from_status_id: statusMap[from],
            to_status_id: statusMap[to],
            conditions: this.toJson(
              from === 'todo' && to === 'in_progress' ? { requires_assignee: true } : {}
            ),
            created_at: this.isoDaysAgo(15),
          })
      }

      result[orgKey] = statusMap as Record<StatusSlug, string>
    }

    return result as Record<OrgKey, Record<StatusSlug, string>>
  }

  private async seedTasks(
    trx: any,
    users: Record<UserKey, SeededUser>,
    projects: Record<ProjectKey, SeededProject>,
    organizations: Record<OrgKey, SeededOrg>,
    statuses: Record<OrgKey, Record<StatusSlug, string>>
  ): Promise<Record<string, SeededTask>> {
    const result: Record<string, SeededTask> = {}

    for (const spec of SEEDED_TASK_SPECS) {
      const project = projects[spec.project]
      const organization = organizations[spec.organization]
      const existing = await trx
        .from('tasks')
        .where('project_id', project.id)
        .where('title', spec.title)
        .first()
      const id = existing?.id ?? this.uuid()
      const assignedUserId = spec.assignee ? users[spec.assignee].id : null
      const dueDate =
        spec.dueDaysOffset >= 0
          ? this.isoDaysAhead(spec.dueDaysOffset)
          : this.isoDaysAgo(Math.abs(spec.dueDaysOffset))

      const payload = {
        title: spec.title,
        description: spec.description,
        status: spec.status,
        label: spec.label,
        priority: spec.priority,
        difficulty: spec.difficulty,
        assigned_to: assignedUserId,
        creator_id: users[spec.creator].id,
        updated_by: users[spec.creator].id,
        due_date: dueDate,
        parent_task_id: null,
        estimated_time: spec.assignmentEstimatedHours ?? 8,
        actual_time:
          spec.status === 'done'
            ? (spec.assignmentActualHours ?? spec.assignmentEstimatedHours ?? 8)
            : (spec.assignmentActualHours ?? 0),
        organization_id: organization.id,
        project_id: project.id,
        task_visibility: spec.visibility,
        application_deadline:
          spec.visibility === 'internal'
            ? null
            : this.isoDaysAhead(spec.applicationDeadlineDaysAhead ?? 4),
        task_type: spec.taskType,
        acceptance_criteria: spec.acceptanceCriteria.join('\n'),
        verification_method: spec.verificationMethod,
        expected_deliverables: this.toJson(spec.expectedDeliverables),
        context_background: spec.contextBackground,
        impact_scope: spec.impactScope,
        tech_stack: this.toJson(spec.techStack),
        environment: spec.environment,
        collaboration_type: spec.collaborationType,
        complexity_notes: spec.complexityNotes,
        measurable_outcomes: this.toJson(spec.measurableOutcomes),
        learning_objectives: this.toJson(spec.learningObjectives),
        domain_tags: this.toJson(spec.domainTags),
        role_in_task: spec.roleInTask,
        autonomy_level: spec.autonomyLevel,
        problem_category: spec.problemCategory,
        business_domain: spec.businessDomain,
        estimated_users_affected: spec.estimatedUsersAffected,
        estimated_budget: spec.estimatedBudget,
        external_applications_count: spec.visibility === 'internal' ? 0 : 2,
        sort_order: Object.keys(result).length,
        task_status_id: statuses[spec.organization][spec.taskStatus],
        created_at: this.isoDaysAgo(20),
        updated_at: this.isoDaysAgo(1),
      }

      if (existing) {
        await trx.from('tasks').where('id', id).update(payload)
      } else {
        await trx
          .insertQuery()
          .table('tasks')
          .insert({ id, ...payload })
      }

      result[spec.key] = {
        id,
        title: spec.title,
        organizationId: organization.id,
        projectId: project.id,
      }
    }

    return result
  }

  private async seedTaskAssignments(
    trx: any,
    users: Record<UserKey, SeededUser>,
    tasks: Record<string, SeededTask>
  ): Promise<Record<string, SeededAssignment>> {
    const result: Record<string, SeededAssignment> = {}

    for (const spec of SEEDED_TASK_SPECS.filter((item) => item.assignee)) {
      const task = this.requireValue(tasks[spec.key], `task:${spec.key}`)
      const assigneeKey = this.requireValue(spec.assignee, `task-assignee:${spec.key}`)
      const assigneeId = users[assigneeKey].id
      const existing = await trx
        .from('task_assignments')
        .where('task_id', task.id)
        .where('assignee_id', assigneeId)
        .first()
      const id = existing?.id ?? this.uuid()

      const completedAt =
        typeof spec.assignmentCompletedDaysAgo === 'number'
          ? this.isoDaysAgo(spec.assignmentCompletedDaysAgo)
          : null

      const payload = {
        task_id: task.id,
        assignee_id: assigneeId,
        assigned_by: users[spec.creator].id,
        assignment_type:
          spec.visibility === 'internal'
            ? 'member'
            : spec.assignee?.startsWith('freelancer')
              ? 'freelancer'
              : 'member',
        assignment_status: spec.status === 'done' ? 'completed' : 'active',
        estimated_hours: spec.assignmentEstimatedHours ?? 8,
        actual_hours:
          spec.status === 'done'
            ? (spec.assignmentActualHours ?? spec.assignmentEstimatedHours ?? 8)
            : (spec.assignmentActualHours ?? null),
        progress_percentage: spec.status === 'done' ? 100 : spec.status === 'in_review' ? 90 : 55,
        completion_notes:
          spec.status === 'done' ? 'Seeded completion note for local verification.' : null,
        verified_by: spec.status === 'done' ? users.orgAdmin.id : null,
        verified_at: completedAt,
        assigned_at: this.isoDaysAgo(18),
        completed_at: completedAt,
      }

      if (existing) {
        await trx.from('task_assignments').where('id', id).update(payload)
      } else {
        await trx
          .insertQuery()
          .table('task_assignments')
          .insert({ id, ...payload })
      }

      result[spec.key] = { id, taskId: task.id, assigneeId }
    }

    return result
  }

  private async seedTaskApplications(
    trx: any,
    users: Record<UserKey, SeededUser>,
    tasks: Record<string, SeededTask>
  ): Promise<void> {
    const rows = [
      {
        taskKey: 'marketplace-content-pass',
        applicant: 'freelancerOne',
        status: 'pending',
        source: 'public_listing',
        message:
          'Tôi có kinh nghiệm viết tài liệu kỹ thuật cho B2B SaaS và có thể bàn giao trong 3 ngày.',
      },
      {
        taskKey: 'marketplace-content-pass',
        applicant: 'freelancerTwo',
        status: 'approved',
        source: 'referral',
        message: 'Đã từng triển khai content guide cho marketplace workflow tương tự.',
      },
      {
        taskKey: 'marketplace-qa-pipeline',
        applicant: 'freelancerOne',
        status: 'pending',
        source: 'public_listing',
        message: 'Có thể hỗ trợ thiết kế QA checklist và checklist verify deliverables.',
      },
    ] as const

    for (const row of rows) {
      const task = this.requireValue(tasks[row.taskKey], `task-application:${row.taskKey}`)
      const where = {
        task_id: task.id,
        applicant_id: users[row.applicant].id,
      }
      const existing = await this.findRow(trx, 'task_applications', where)
      const payload = {
        application_status: row.status,
        application_source: row.source,
        message: row.message,
        expected_rate: row.applicant === 'freelancerOne' ? 600000 : 450000,
        portfolio_links: this.toJson([
          `https://portfolio.local/${users[row.applicant].username.toLowerCase()}`,
          `https://github.com/${users[row.applicant].username.toLowerCase()}`,
        ]),
        applied_at: this.isoDaysAgo(2),
        reviewed_by: row.status === 'approved' ? users.owner.id : null,
        reviewed_at: row.status === 'approved' ? this.isoDaysAgo(1) : null,
        rejection_reason: null,
      }

      if (existing) {
        await this.applyWhere(trx.from('task_applications'), where).update(payload)
      } else {
        await trx
          .insertQuery()
          .table('task_applications')
          .insert({ id: this.uuid(), ...where, ...payload })
      }
    }
  }

  private async seedTaskRequiredSkills(
    trx: any,
    tasks: Record<string, SeededTask>,
    skills: Record<string, string>
  ): Promise<void> {
    for (const spec of SEEDED_TASK_SPECS) {
      for (const code of spec.requiredSkills) {
        const task = this.requireValue(tasks[spec.key], `task-required-skills:${spec.key}`)
        const skillId = this.requireValue(skills[code], `skill:${code}`)
        const where = {
          task_id: task.id,
          skill_id: skillId,
        }
        const existing = await this.findRow(trx, 'task_required_skills', where)
        const payload = {
          required_level_code:
            code === 'leadership' || code === 'problem_solving'
              ? 'senior'
              : code === 'communication'
                ? 'middle'
                : 'junior',
          is_mandatory: true,
          created_at: this.isoDaysAgo(15),
        }

        if (existing) {
          await this.applyWhere(trx.from('task_required_skills'), where).update(payload)
        } else {
          await trx
            .insertQuery()
            .table('task_required_skills')
            .insert({ id: this.uuid(), ...where, ...payload })
        }
      }
    }
  }

  private async seedReviewData(
    trx: any,
    users: Record<UserKey, SeededUser>,
    tasks: Record<string, SeededTask>,
    assignments: Record<string, SeededAssignment>,
    skills: Record<string, string>,
    organizations: Record<OrgKey, SeededOrg>
  ): Promise<void> {
    const sessionSpecs = [
      {
        key: 'member-org-switch',
        overall: 5,
        delivery: 'on_time',
        requirement: 5,
        communication: 4,
        codeQuality: 5,
        proactive: 4,
        strengths:
          'Nắm rất nhanh logic quyền theo organization và chủ động đề xuất checklist test.',
        improvements: 'Có thể bổ sung thêm automation coverage cho đường dẫn redirect.',
        selfSatisfaction: 4,
        skills: [
          {
            reviewer: 'orgAdmin' as UserKey,
            reviewerType: 'manager',
            skill: 'typescript',
            level: 'senior',
            comment: 'Xử lý state và typing tốt, không để lọt case role mismatch.',
          },
          {
            reviewer: 'peerReviewer' as UserKey,
            reviewerType: 'peer',
            skill: 'communication',
            level: 'middle',
            comment: 'Trao đổi rõ các case edge và báo tiến độ đều.',
          },
        ],
      },
      {
        key: 'member-profile-proof',
        overall: 5,
        delivery: 'slightly_late',
        requirement: 5,
        communication: 5,
        codeQuality: 4,
        proactive: 5,
        strengths:
          'Kết nối tốt dữ liệu từ review sang profile snapshot và tổng hợp đúng các proof cần hiển thị.',
        improvements: 'Cần tinh gọn thêm luồng invalidate cache profile.',
        selfSatisfaction: 5,
        skills: [
          {
            reviewer: 'orgAdmin' as UserKey,
            reviewerType: 'manager',
            skill: 'postgresql',
            level: 'middle',
            comment: 'Dựng dữ liệu profile aggregate chắc tay, nắm rõ bảng review và snapshot.',
          },
          {
            reviewer: 'peerReviewer' as UserKey,
            reviewerType: 'peer',
            skill: 'problem_solving',
            level: 'senior',
            comment: 'Biết lần theo dependency dữ liệu khi UI hiển thị tĩnh.',
          },
          {
            reviewer: 'peerReviewer' as UserKey,
            reviewerType: 'peer',
            skill: 'testing',
            level: 'middle',
            comment: 'Có checklist verify profile proof và share link.',
          },
        ],
      },
      {
        key: 'member-admin-regression',
        overall: 4,
        delivery: 'on_time',
        requirement: 4,
        communication: 5,
        codeQuality: 4,
        proactive: 4,
        strengths: 'Tài liệu kiểm thử rõ ràng, dễ dùng cho admin redirect regression.',
        improvements: 'Nên thêm một case cho current_organization_id null.',
        selfSatisfaction: 4,
        skills: [
          {
            reviewer: 'orgAdmin' as UserKey,
            reviewerType: 'manager',
            skill: 'testing',
            level: 'middle',
            comment: 'Checklist hợp lý và bám sát bug report.',
          },
          {
            reviewer: 'peerReviewer' as UserKey,
            reviewerType: 'peer',
            skill: 'communication',
            level: 'senior',
            comment: 'Tài liệu rõ và có giải thích được tình huống back button.',
          },
        ],
      },
      {
        key: 'owner-seed-governance',
        overall: 4,
        delivery: 'on_time',
        requirement: 4,
        communication: 4,
        codeQuality: 4,
        proactive: 4,
        strengths: 'Điều phối tốt nhiều luồng seed khác nhau.',
        improvements: 'Cần thêm dữ liệu analytics cho admin sau này.',
        selfSatisfaction: 4,
        skills: [
          {
            reviewer: 'orgAdmin' as UserKey,
            reviewerType: 'manager',
            skill: 'leadership',
            level: 'lead',
            comment: 'Quản lý tốt phạm vi seed đa vai trò.',
          },
          {
            reviewer: 'peerReviewer' as UserKey,
            reviewerType: 'peer',
            skill: 'code_review',
            level: 'middle',
            comment: 'Có checklist review seed command rõ ràng.',
          },
        ],
      },
    ] as const

    const flaggedReviewTargets: string[] = []

    for (const spec of sessionSpecs) {
      const assignment = this.requireValue(assignments[spec.key], `assignment:${spec.key}`)
      const task = this.requireValue(tasks[spec.key], `task-review:${spec.key}`)
      const existing = await trx
        .from('review_sessions')
        .where('task_assignment_id', assignment.id)
        .where('reviewee_id', assignment.assigneeId)
        .first()
      const sessionId = existing?.id ?? this.uuid()
      const payload = {
        task_assignment_id: assignment.id,
        reviewee_id: assignment.assigneeId,
        status: 'completed',
        manager_review_completed: true,
        peer_reviews_count: spec.skills.filter((item) => item.reviewerType === 'peer').length,
        required_peer_reviews: 1,
        completed_at: this.isoDaysAgo(2),
        deadline: this.isoDaysAgo(1),
        confirmations: this.toJson([
          {
            user_id: assignment.assigneeId,
            action: 'confirmed',
            dispute_reason: null,
            created_at: this.isoDaysAgo(2),
          },
        ]),
        overall_quality_score: spec.overall,
        delivery_timeliness: spec.delivery,
        requirement_adherence: spec.requirement,
        communication_quality: spec.communication,
        code_quality_score: spec.codeQuality,
        proactiveness_score: spec.proactive,
        would_work_with_again: true,
        strengths_observed: spec.strengths,
        areas_for_improvement: spec.improvements,
        created_at: this.isoDaysAgo(3),
        updated_at: this.isoDaysAgo(1),
      }

      if (existing) {
        await trx.from('review_sessions').where('id', sessionId).update(payload)
      } else {
        await trx
          .insertQuery()
          .table('review_sessions')
          .insert({ id: sessionId, ...payload })
      }

      for (const skillReview of spec.skills) {
        const where = {
          review_session_id: sessionId,
          reviewer_id: users[skillReview.reviewer].id,
          skill_id: skills[skillReview.skill],
        }
        const existingSkillReview = await this.findRow(trx, 'skill_reviews', where)
        const existingSkillReviewId = existingSkillReview?.id
        const skillReviewId =
          typeof existingSkillReviewId === 'string' ? existingSkillReviewId : this.uuid()
        const skillPayload = {
          reviewer_type: skillReview.reviewerType,
          assigned_level_code: skillReview.level,
          comment: skillReview.comment,
          created_at: this.isoDaysAgo(2),
          updated_at: this.isoDaysAgo(1),
        }

        if (existingSkillReview) {
          await this.applyWhere(trx.from('skill_reviews'), where).update(skillPayload)
        } else {
          await trx
            .insertQuery()
            .table('skill_reviews')
            .insert({ id: skillReviewId, ...where, ...skillPayload })
        }

        if (spec.key === 'member-profile-proof' && skillReview.skill === 'testing') {
          flaggedReviewTargets.push(skillReviewId)
        }
      }

      const assessmentWhere = {
        task_assignment_id: assignment.id,
        user_id: assignment.assigneeId,
      }
      const existingAssessment = await this.findRow(trx, 'task_self_assessments', assessmentWhere)
      const assessmentPayload = {
        overall_satisfaction: spec.selfSatisfaction,
        difficulty_felt: 'as_expected',
        confidence_level: 4,
        what_went_well: spec.strengths,
        what_would_do_different: spec.improvements,
        blockers_encountered: this.toJson([
          'Không có blocker nghiêm trọng trong môi trường seed local',
        ]),
        skills_felt_lacking: this.toJson(['automation']),
        skills_felt_strong: this.toJson(['communication', 'problem solving']),
        submitted_at: this.isoDaysAgo(2),
        created_at: this.isoDaysAgo(2),
        updated_at: this.isoDaysAgo(1),
      }

      if (existingAssessment) {
        await this.applyWhere(trx.from('task_self_assessments'), assessmentWhere).update(
          assessmentPayload
        )
      } else {
        await trx
          .insertQuery()
          .table('task_self_assessments')
          .insert({ id: this.uuid(), ...assessmentWhere, ...assessmentPayload })
      }

      const evidenceRows = [
        {
          evidence_type: 'pull_request',
          url: `https://github.com/suar/demo/pull/${Math.floor(Math.random() * 100 + 10)}`,
          title: `${task.title} - Pull Request`,
        },
        {
          evidence_type: 'demo_recording',
          url: `https://demo.local/${spec.key}`,
          title: `${task.title} - Demo`,
        },
      ] as const

      for (const evidence of evidenceRows) {
        const where = {
          review_session_id: sessionId,
          title: evidence.title,
        }
        const existingEvidence = await this.findRow(trx, 'review_evidences', where)
        const payloadEvidence = {
          evidence_type: evidence.evidence_type,
          url: evidence.url,
          description: `Seeded ${evidence.evidence_type} for ${task.title}`,
          uploaded_by: users.orgAdmin.id,
          created_at: this.isoDaysAgo(2),
          updated_at: this.isoDaysAgo(1),
        }

        if (existingEvidence) {
          await this.applyWhere(trx.from('review_evidences'), where).update(payloadEvidence)
        } else {
          await trx
            .insertQuery()
            .table('review_evidences')
            .insert({
              id: this.uuid(),
              review_session_id: sessionId,
              ...payloadEvidence,
              title: evidence.title,
            })
        }
      }

      if (spec.key.startsWith('member-')) {
        const reverseWhere = {
          review_session_id: sessionId,
          reviewer_id: assignment.assigneeId,
          target_type: 'organization',
          target_id: organizations.orgA.id,
        }
        const existingReverse = await this.findRow(trx, 'reverse_reviews', reverseWhere)
        const reversePayload = {
          rating: 4,
          comment: 'Tổ chức hỗ trợ tốt, quy trình review rõ ràng và phản hồi nhanh.',
          is_anonymous: false,
          created_at: this.isoDaysAgo(1),
        }

        if (existingReverse) {
          await this.applyWhere(trx.from('reverse_reviews'), reverseWhere).update(reversePayload)
        } else {
          await trx
            .insertQuery()
            .table('reverse_reviews')
            .insert({ id: this.uuid(), ...reverseWhere, ...reversePayload })
        }
      }
    }

    for (const skillReviewId of flaggedReviewTargets) {
      const where = {
        skill_review_id: skillReviewId,
        flag_type: 'frequency_anomaly',
      }
      const existing = await this.findRow(trx, 'flagged_reviews', where)
      const payload = {
        severity: 'high',
        detected_at: this.isoDaysAgo(1),
        status: 'pending',
        reviewed_by: null,
        reviewed_at: null,
        notes: 'Seeded flagged review for admin moderation page.',
        created_at: this.isoDaysAgo(1),
        updated_at: this.isoDaysAgo(1),
      }

      if (existing) {
        await this.applyWhere(trx.from('flagged_reviews'), where).update(payload)
      } else {
        await trx
          .insertQuery()
          .table('flagged_reviews')
          .insert({ id: this.uuid(), ...where, ...payload })
      }
    }
  }

  private async seedUserSkills(
    trx: any,
    users: Record<UserKey, SeededUser>,
    skills: Record<string, string>
  ): Promise<void> {
    const rows: Array<{
      user: UserKey
      skill: string
      level: string
      totalReviews: number
      avgPercentage: number
      source: 'reviewed' | 'imported'
    }> = [
      {
        user: 'member',
        skill: 'typescript',
        level: 'senior',
        totalReviews: 4,
        avgPercentage: 91,
        source: 'reviewed',
      },
      {
        user: 'member',
        skill: 'postgresql',
        level: 'middle',
        totalReviews: 3,
        avgPercentage: 84,
        source: 'reviewed',
      },
      {
        user: 'member',
        skill: 'testing',
        level: 'middle',
        totalReviews: 3,
        avgPercentage: 82,
        source: 'reviewed',
      },
      {
        user: 'member',
        skill: 'communication',
        level: 'senior',
        totalReviews: 4,
        avgPercentage: 88,
        source: 'reviewed',
      },
      {
        user: 'member',
        skill: 'problem_solving',
        level: 'senior',
        totalReviews: 3,
        avgPercentage: 90,
        source: 'reviewed',
      },
      {
        user: 'member',
        skill: 'svelte',
        level: 'middle',
        totalReviews: 2,
        avgPercentage: 79,
        source: 'reviewed',
      },
      {
        user: 'owner',
        skill: 'leadership',
        level: 'lead',
        totalReviews: 2,
        avgPercentage: 89,
        source: 'reviewed',
      },
      {
        user: 'owner',
        skill: 'code_review',
        level: 'middle',
        totalReviews: 2,
        avgPercentage: 81,
        source: 'reviewed',
      },
      {
        user: 'owner',
        skill: 'communication',
        level: 'senior',
        totalReviews: 2,
        avgPercentage: 86,
        source: 'reviewed',
      },
      {
        user: 'owner',
        skill: 'devops',
        level: 'middle',
        totalReviews: 1,
        avgPercentage: 75,
        source: 'imported',
      },
      {
        user: 'orgAdmin',
        skill: 'testing',
        level: 'senior',
        totalReviews: 2,
        avgPercentage: 87,
        source: 'reviewed',
      },
      {
        user: 'orgAdmin',
        skill: 'leadership',
        level: 'lead',
        totalReviews: 2,
        avgPercentage: 85,
        source: 'reviewed',
      },
      {
        user: 'peerReviewer',
        skill: 'testing',
        level: 'senior',
        totalReviews: 1,
        avgPercentage: 83,
        source: 'reviewed',
      },
      {
        user: 'superadmin',
        skill: 'leadership',
        level: 'lead',
        totalReviews: 1,
        avgPercentage: 92,
        source: 'imported',
      },
      {
        user: 'superadmin',
        skill: 'communication',
        level: 'senior',
        totalReviews: 1,
        avgPercentage: 90,
        source: 'imported',
      },
    ]

    for (const row of rows) {
      const where = {
        user_id: users[row.user].id,
        skill_id: skills[row.skill],
      }
      const existing = await this.findRow(trx, 'user_skills', where)
      const payload = {
        level_code: row.level,
        total_reviews: row.totalReviews,
        avg_score: Math.min(5, Math.round((row.avgPercentage / 20) * 100) / 100),
        last_reviewed_at: row.source === 'reviewed' ? this.isoDaysAgo(1) : null,
        avg_percentage: row.avgPercentage,
        last_calculated_at: this.isoDaysAgo(1),
        source: row.source,
        created_at: this.isoDaysAgo(40),
        updated_at: this.isoDaysAgo(1),
      }

      if (existing) {
        await this.applyWhere(trx.from('user_skills'), where).update(payload)
      } else {
        await trx
          .insertQuery()
          .table('user_skills')
          .insert({ id: this.uuid(), ...where, ...payload })
      }
    }
  }

  private async seedUserSubscriptions(trx: any, users: Record<UserKey, SeededUser>): Promise<void> {
    const rows = [
      {
        user: 'owner' as UserKey,
        plan: 'enterprise',
        status: 'active',
        startedAt: this.isoDaysAgo(25),
        expiresAt: this.isoDaysAhead(335),
        autoRenew: true,
      },
      {
        user: 'member' as UserKey,
        plan: 'pro',
        status: 'active',
        startedAt: this.isoDaysAgo(18),
        expiresAt: this.isoDaysAhead(30),
        autoRenew: true,
      },
      {
        user: 'freelancerOne' as UserKey,
        plan: 'enterprise',
        status: 'active',
        startedAt: this.isoDaysAgo(7),
        expiresAt: this.isoDaysAhead(358),
        autoRenew: false,
      },
      {
        user: 'freelancerTwo' as UserKey,
        plan: 'pro',
        status: 'cancelled',
        startedAt: this.isoDaysAgo(60),
        expiresAt: this.isoDaysAhead(5),
        autoRenew: false,
      },
    ] as const

    for (const row of rows) {
      const where = { user_id: users[row.user].id }
      const existing = await this.findRow(trx, 'user_subscriptions', where)
      const payload = {
        plan: row.plan,
        status: row.status,
        started_at: row.startedAt,
        expires_at: row.expiresAt,
        auto_renew: row.autoRenew,
        created_at: this.isoDaysAgo(20),
        updated_at: this.isoDaysAgo(1),
      }

      if (existing) {
        await this.applyWhere(trx.from('user_subscriptions'), where).update(payload)
      } else {
        await trx
          .insertQuery()
          .table('user_subscriptions')
          .insert({ id: this.uuid(), ...where, ...payload })
      }
    }
  }

  private async seedProjectAttachments(
    trx: any,
    users: Record<UserKey, SeededUser>,
    projects: Record<ProjectKey, SeededProject>
  ): Promise<void> {
    const rows = [
      {
        project: 'orgAPlatform' as ProjectKey,
        file_name: 'org-context-role-matrix.pdf',
        mime_type: 'application/pdf',
      },
      {
        project: 'orgAOperations' as ProjectKey,
        file_name: 'admin-redirect-regression.md',
        mime_type: 'text/markdown',
      },
    ]

    for (const row of rows) {
      const where = {
        project_id: projects[row.project].id,
        file_name: row.file_name,
      }
      const existing = await this.findRow(trx, 'project_attachments', where)
      const payload = {
        file_path: `/uploads/projects/${projects[row.project].id}/${row.file_name}`,
        file_size: 4096,
        mime_type: row.mime_type,
        uploaded_by: users.owner.id,
        created_at: this.isoDaysAgo(5),
        updated_at: this.isoDaysAgo(1),
      }

      if (existing) {
        await this.applyWhere(trx.from('project_attachments'), where).update(payload)
      } else {
        await trx
          .insertQuery()
          .table('project_attachments')
          .insert({ id: this.uuid(), ...where, ...payload })
      }
    }
  }

  private async updateCurrentOrganizations(
    trx: any,
    users: Record<UserKey, SeededUser>,
    organizations: Record<OrgKey, SeededOrg>
  ): Promise<void> {
    const updates: Array<[UserKey, string | null]> = [
      ['owner', organizations.orgA.id],
      ['member', organizations.orgA.id],
      ['orgAdmin', organizations.orgA.id],
      ['peerReviewer', organizations.orgA.id],
      ['orgBOwner', organizations.orgB.id],
      ['superadmin', null],
      ['freelancerOne', null],
      ['freelancerTwo', null],
    ]

    for (const [userKey, currentOrgId] of updates) {
      await trx
        .from('users')
        .where('id', users[userKey].id)
        .update({
          current_organization_id: currentOrgId,
          updated_at: this.isoDaysAgo(1),
        })
    }
  }

  private async seedProfileAggregates(context: SeedContext): Promise<SeedContext> {
    await this.resetProfileAggregateScope([context.users.member.id, context.users.owner.id])
    await this.seedUserWorkHistory(context)
    await this.seedUserPerformanceStats(context)
    await this.seedUserDomainExpertise(context)

    await this.createProfileSnapshot(context.users.member.id, 'duyetlaaithe draft snapshot', false)
    context.snapshots.member = await this.createProfileSnapshot(
      context.users.member.id,
      'duyetlaaithe profile proof',
      true
    )
    context.snapshots.owner = await this.createProfileSnapshot(
      context.users.owner.id,
      'organization-owner profile snapshot',
      true
    )

    return context
  }

  private async resetProfileAggregateScope(userIds: string[]): Promise<void> {
    for (const table of [
      'user_profile_snapshots',
      'user_work_history',
      'user_domain_expertise',
      'user_performance_stats',
    ]) {
      await db.from(table).whereIn('user_id', userIds).delete()
    }
  }

  private async seedUserWorkHistory(context: SeedContext): Promise<void> {
    const rows = [
      {
        taskKey: 'member-org-switch',
        overallQualityScore: 5,
        daysEarlyOrLate: 2,
        skillScores: [
          {
            skillCode: 'typescript',
            skillName: 'TypeScript',
            reviewerType: 'manager',
            assignedLevelCode: 'senior',
            comment: 'Xử lý state và typing tốt, không để lọt case role mismatch.',
          },
          {
            skillCode: 'communication',
            skillName: 'Communication',
            reviewerType: 'peer',
            assignedLevelCode: 'middle',
            comment: 'Trao đổi rõ các case edge và báo tiến độ đều.',
          },
        ],
        knowledgeArtifacts: [
          {
            type: 'retrospective_success',
            content:
              'Nắm rất nhanh logic quyền theo organization và chủ động đề xuất checklist test.',
          },
          {
            type: 'retrospective_improvement',
            content: 'Có thể bổ sung thêm automation coverage cho đường dẫn redirect.',
          },
        ],
        evidenceLinks: [
          {
            evidence_id: this.uuid(),
            evidence_type: 'pull_request',
            url: 'https://github.com/suar/demo/pull/90',
            title: 'Hoàn thiện luồng chuyển organization theo role - Pull Request',
          },
          {
            evidence_id: this.uuid(),
            evidence_type: 'demo_recording',
            url: 'https://demo.local/member-org-switch',
            title: 'Hoàn thiện luồng chuyển organization theo role - Demo',
          },
        ],
      },
      {
        taskKey: 'member-profile-proof',
        overallQualityScore: 5,
        daysEarlyOrLate: 2,
        skillScores: [
          {
            skillCode: 'postgresql',
            skillName: 'PostgreSQL',
            reviewerType: 'manager',
            assignedLevelCode: 'middle',
            comment: 'Dựng dữ liệu profile aggregate chắc tay, nắm rõ bảng review và snapshot.',
          },
          {
            skillCode: 'problem_solving',
            skillName: 'Problem Solving',
            reviewerType: 'peer',
            assignedLevelCode: 'senior',
            comment: 'Biết lần theo dependency dữ liệu khi UI hiển thị tĩnh.',
          },
          {
            skillCode: 'testing',
            skillName: 'Testing & QA',
            reviewerType: 'peer',
            assignedLevelCode: 'middle',
            comment: 'Có checklist verify profile proof và share link.',
          },
        ],
        knowledgeArtifacts: [
          {
            type: 'retrospective_success',
            content:
              'Kết nối tốt dữ liệu từ review sang profile snapshot và tổng hợp đúng các proof cần hiển thị.',
          },
          {
            type: 'retrospective_improvement',
            content: 'Cần tinh gọn thêm luồng invalidate cache profile.',
          },
        ],
        evidenceLinks: [
          {
            evidence_id: this.uuid(),
            evidence_type: 'pull_request',
            url: 'https://github.com/suar/demo/pull/35',
            title: 'Xuất profile proof và snapshot công khai - Pull Request',
          },
          {
            evidence_id: this.uuid(),
            evidence_type: 'demo_recording',
            url: 'https://demo.local/member-profile-proof',
            title: 'Xuất profile proof và snapshot công khai - Demo',
          },
        ],
      },
      {
        taskKey: 'member-admin-regression',
        overallQualityScore: 4,
        daysEarlyOrLate: 1,
        skillScores: [
          {
            skillCode: 'testing',
            skillName: 'Testing & QA',
            reviewerType: 'manager',
            assignedLevelCode: 'middle',
            comment: 'Checklist hợp lý và bám sát bug report.',
          },
          {
            skillCode: 'communication',
            skillName: 'Communication',
            reviewerType: 'peer',
            assignedLevelCode: 'senior',
            comment: 'Tài liệu rõ và có giải thích được tình huống back button.',
          },
        ],
        knowledgeArtifacts: [
          {
            type: 'retrospective_success',
            content: 'Tài liệu kiểm thử rõ ràng, dễ dùng cho admin redirect regression.',
          },
          {
            type: 'retrospective_improvement',
            content: 'Nên thêm một case cho current_organization_id null.',
          },
        ],
        evidenceLinks: [
          {
            evidence_id: this.uuid(),
            evidence_type: 'pull_request',
            url: 'https://github.com/suar/demo/pull/35',
            title: 'Chuẩn bị regression pack cho admin redirect - Pull Request',
          },
          {
            evidence_id: this.uuid(),
            evidence_type: 'demo_recording',
            url: 'https://demo.local/member-admin-regression',
            title: 'Chuẩn bị regression pack cho admin redirect - Demo',
          },
        ],
      },
    ] as const

    for (const row of rows) {
      const spec = this.getTaskSpec(row.taskKey)
      const task = this.requireValue(context.tasks[row.taskKey], `work-history-task:${row.taskKey}`)
      const assignment = this.requireValue(
        context.assignments[row.taskKey],
        `work-history-assignment:${row.taskKey}`
      )

      await db
        .insertQuery()
        .table('user_work_history')
        .insert({
          id: this.uuid(),
          user_id: context.users.member.id,
          task_id: task.id,
          task_assignment_id: assignment.id,
          organization_id: task.organizationId,
          project_id: task.projectId,
          task_title: task.title,
          task_type: spec.taskType,
          business_domain: spec.businessDomain,
          problem_category: spec.problemCategory,
          role_in_task: spec.roleInTask,
          autonomy_level: spec.autonomyLevel,
          collaboration_type: spec.collaborationType,
          tech_stack: this.toJson(spec.techStack),
          domain_tags: this.toJson(spec.domainTags),
          difficulty: spec.difficulty,
          estimated_hours: spec.assignmentEstimatedHours ?? null,
          actual_hours: spec.assignmentActualHours ?? null,
          was_on_time: false,
          days_early_or_late: row.daysEarlyOrLate,
          measurable_outcomes: this.toJson(spec.measurableOutcomes),
          estimated_business_value: spec.impactScope,
          knowledge_artifacts: this.toJson(row.knowledgeArtifacts),
          overall_quality_score: row.overallQualityScore,
          skill_scores: this.toJson(
            row.skillScores.map((skill) => ({
              skill_id: this.requireValue(
                context.skills[skill.skillCode],
                `skill:${skill.skillCode}`
              ),
              skill_name: skill.skillName,
              reviewer_type: skill.reviewerType,
              assigned_level_code: skill.assignedLevelCode,
              comment: skill.comment,
            }))
          ),
          evidence_links: this.toJson(row.evidenceLinks),
          is_featured: false,
          is_public: false,
          completed_at: this.isoDaysAgo(spec.assignmentCompletedDaysAgo ?? 0),
          created_at: this.isoDaysAgo(0),
          updated_at: this.isoDaysAgo(0),
        })
    }
  }

  private async seedUserPerformanceStats(context: SeedContext): Promise<void> {
    const rows = [
      {
        userId: context.users.owner.id,
        totalTasksCompleted: 0,
        totalHoursWorked: 0,
        avgQualityScore: null,
        onTimeDeliveryRate: null,
        avgDaysEarlyOrLate: null,
        tasksByType: {},
        tasksByDifficulty: {},
        tasksByDomain: {},
        tasksAsLead: 0,
        tasksAsSoleContributor: 0,
        tasksMentoringOthers: 0,
        longestOnTimeStreak: 0,
        currentOnTimeStreak: 0,
        selfAssessmentAccuracy: null,
      },
      {
        userId: context.users.member.id,
        totalTasksCompleted: 3,
        totalHoursWorked: 49,
        avgQualityScore: 4.67,
        onTimeDeliveryRate: 0,
        avgDaysEarlyOrLate: 1.67,
        tasksByType: { technical_writing: 1, feature_development: 2 },
        tasksByDifficulty: { hard: 1, medium: 2 },
        tasksByDomain: { saas: 2, internal_tooling: 1 },
        tasksAsLead: 0,
        tasksAsSoleContributor: 0,
        tasksMentoringOthers: 0,
        longestOnTimeStreak: 0,
        currentOnTimeStreak: 0,
        selfAssessmentAccuracy: 91.67,
      },
    ] as const

    for (const row of rows) {
      await db
        .insertQuery()
        .table('user_performance_stats')
        .insert({
          id: this.uuid(),
          user_id: row.userId,
          period_start: null,
          period_end: null,
          total_tasks_completed: row.totalTasksCompleted,
          total_hours_worked: row.totalHoursWorked,
          avg_quality_score: row.avgQualityScore,
          on_time_delivery_rate: row.onTimeDeliveryRate,
          avg_days_early_or_late: row.avgDaysEarlyOrLate,
          performance_score: null,
          tasks_by_type: this.toJson(row.tasksByType),
          tasks_by_difficulty: this.toJson(row.tasksByDifficulty),
          tasks_by_domain: this.toJson(row.tasksByDomain),
          tasks_as_lead: row.tasksAsLead,
          tasks_as_sole_contributor: row.tasksAsSoleContributor,
          tasks_mentoring_others: row.tasksMentoringOthers,
          longest_on_time_streak: row.longestOnTimeStreak,
          current_on_time_streak: row.currentOnTimeStreak,
          self_assessment_accuracy: row.selfAssessmentAccuracy,
          calculated_at: this.isoDaysAgo(0),
          created_at: this.isoDaysAgo(0),
          updated_at: this.isoDaysAgo(0),
        })
    }
  }

  private async seedUserDomainExpertise(context: SeedContext): Promise<void> {
    const rows = [
      {
        userId: context.users.owner.id,
        techStackFrequency: {},
        domainFrequency: {},
        problemCategoryFrequency: {},
        topSkills: [],
      },
      {
        userId: context.users.member.id,
        techStackFrequency: {
          Svelte: 3,
          MongoDB: 1,
          AdonisJS: 1,
          PostgreSQL: 2,
          Documentation: 1,
        },
        domainFrequency: {
          qa: 1,
          rbac: 1,
          saas: 2,
          admin: 1,
          proof: 1,
          review: 1,
          profile: 1,
          redirect: 1,
          navigation: 1,
          organization: 1,
          internal_tooling: 1,
        },
        problemCategoryFrequency: {
          new_capability: 2,
          maintainability: 1,
        },
        topSkills: [
          { skill_name: 'Testing & QA', weighted_score: 1, review_mentions: 2 },
          { skill_name: 'Communication', weighted_score: 1, review_mentions: 2 },
          { skill_name: 'TypeScript', weighted_score: 1, review_mentions: 1 },
          { skill_name: 'PostgreSQL', weighted_score: 1, review_mentions: 1 },
          { skill_name: 'Problem Solving', weighted_score: 1, review_mentions: 1 },
        ],
      },
    ] as const

    for (const row of rows) {
      await db
        .insertQuery()
        .table('user_domain_expertise')
        .insert({
          id: this.uuid(),
          user_id: row.userId,
          tech_stack_frequency: this.toJson(row.techStackFrequency),
          domain_frequency: this.toJson(row.domainFrequency),
          problem_category_frequency: this.toJson(row.problemCategoryFrequency),
          top_skills: this.toJson(row.topSkills),
          calculated_at: this.isoDaysAgo(0),
          created_at: this.isoDaysAgo(0),
          updated_at: this.isoDaysAgo(0),
        })
    }
  }

  private async createProfileSnapshot(
    userId: string,
    snapshotName: string,
    isPublic: boolean
  ): Promise<string> {
    const user = (await db.from('users').where('id', userId).first()) as {
      username?: unknown
      trust_data?: unknown
    } | null
    if (!user) {
      throw new Error(`User ${userId} not found for snapshot seed`)
    }

    const lastSnapshot = await db
      .from('user_profile_snapshots')
      .where('user_id', userId)
      .orderBy('version', 'desc')
      .first()

    const nextVersion = Number(lastSnapshot?.version ?? 0) + 1
    const username = this.readNonEmptyString(user.username, userId)
    const slugBase = username.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    const versionLabel = String(nextVersion)
    const shareableSlug = isPublic
      ? `${slugBase}-v${versionLabel}-${Date.now().toString(36)}`
      : null
    const shareableToken = isPublic ? randomUUID().replace(/-/g, '') : null

    const skills = await db
      .from('user_skills as us')
      .join('skills as s', 's.id', 'us.skill_id')
      .where('us.user_id', userId)
      .orderBy('us.total_reviews', 'desc')
      .select(
        'us.skill_id',
        's.skill_name',
        'us.level_code',
        'us.total_reviews',
        'us.avg_percentage',
        'us.avg_score',
        'us.last_reviewed_at'
      )

    const performance = await db
      .from('user_performance_stats')
      .where('user_id', userId)
      .whereNull('period_start')
      .whereNull('period_end')
      .orderBy('calculated_at', 'desc')
      .first()

    const domainExpertise = await db.from('user_domain_expertise').where('user_id', userId).first()
    const highlights = await db
      .from('user_work_history')
      .where('user_id', userId)
      .orderBy('completed_at', 'desc')
      .limit(6)

    await db
      .from('user_profile_snapshots')
      .where('user_id', userId)
      .where('is_current', true)
      .update({ is_current: false, updated_at: this.isoDaysAgo(0) })

    const trustData =
      typeof user.trust_data === 'string'
        ? this.parseJsonRecord(user.trust_data)
        : this.toRecord(user.trust_data)

    const verifiedSkills = skills
      .filter((skill) => Number(skill.total_reviews ?? 0) > 0)
      .map((skill) => ({
        skill_id: skill.skill_id,
        skill_name: skill.skill_name,
        level_code: skill.level_code,
        total_reviews: Number(skill.total_reviews ?? 0),
        avg_percentage: Number(skill.avg_percentage ?? 0),
        avg_score: Number(skill.avg_score ?? 0),
        last_reviewed_at: skill.last_reviewed_at,
      }))

    const summary = {
      user_id: userId,
      username,
      total_verified_skills: verifiedSkills.length,
      total_tasks_completed: Number(performance?.total_tasks_completed ?? highlights.length),
      trust_score: Number(trustData.calculated_score ?? 0),
      trust_tier: trustData.current_tier_code ?? null,
      generated_at: new Date().toISOString(),
    }

    const performanceMetrics = {
      total_tasks_completed: Number(performance?.total_tasks_completed ?? 0),
      total_hours_worked: Number(performance?.total_hours_worked ?? 0),
      avg_quality_score:
        performance?.avg_quality_score !== null && performance?.avg_quality_score !== undefined
          ? Number(performance.avg_quality_score)
          : null,
      on_time_delivery_rate:
        performance?.on_time_delivery_rate !== null &&
        performance?.on_time_delivery_rate !== undefined
          ? Number(performance.on_time_delivery_rate)
          : null,
      performance_score:
        performance?.performance_score !== null && performance?.performance_score !== undefined
          ? Number(performance.performance_score)
          : null,
      tasks_by_type: performance?.tasks_by_type ?? {},
      tasks_by_domain: performance?.tasks_by_domain ?? {},
      tasks_by_difficulty: performance?.tasks_by_difficulty ?? {},
    }

    const trustMetrics = {
      trust_data: trustData,
      domain_expertise: {
        tech_stack_frequency: domainExpertise?.tech_stack_frequency ?? {},
        domain_frequency: domainExpertise?.domain_frequency ?? {},
        problem_category_frequency: domainExpertise?.problem_category_frequency ?? {},
        top_skills: domainExpertise?.top_skills ?? [],
      },
    }

    const snapshotId = this.uuid()
    await db
      .insertQuery()
      .table('user_profile_snapshots')
      .insert({
        id: snapshotId,
        user_id: userId,
        version: nextVersion,
        snapshot_name: snapshotName,
        is_current: true,
        is_public: isPublic,
        shareable_slug: shareableSlug,
        shareable_token: shareableToken,
        summary: this.toJson(summary),
        skills_verified: this.toJson(verifiedSkills),
        work_highlights: this.toJson(highlights),
        performance_metrics: this.toJson(performanceMetrics),
        trust_metrics: this.toJson(trustMetrics),
        scoring_version: 'seed-v1',
        created_at: this.isoDaysAgo(0),
        updated_at: this.isoDaysAgo(0),
      })

    return snapshotId
  }

  private async seedMongo(context: SeedContext): Promise<void> {
    if (!env.get('MONGODB_URL', '')) {
      return
    }

    const userIds = Object.values(context.users).map((user) => user.id)
    const entityIds = [
      ...Object.values(context.organizations).map((org) => org.id),
      ...Object.values(context.projects).map((project) => project.id),
      ...Object.values(context.tasks).map((task) => task.id),
      ...Object.values(context.snapshots),
    ]

    if (!this.fresh) {
      await Promise.all([
        MongoNotification.deleteMany({ user_id: { $in: userIds } }),
        MongoUserActivityLog.deleteMany({ user_id: { $in: userIds } }),
        MongoAuditLogModel.deleteMany({
          $or: [{ user_id: { $in: userIds } }, { entity_id: { $in: entityIds } }],
        }),
      ])
    }

    const marketplaceTask = this.requireValue(
      context.tasks['marketplace-content-pass'],
      'mongo-task:marketplace-content-pass'
    )

    await MongoNotification.insertMany([
      {
        user_id: context.users.owner.id,
        title: 'Đã có ứng viên mới cho task marketplace',
        message: 'MaiFreelancer vừa apply vào task public của organization A.',
        type: 'task_application_submitted',
        related_entity_type: 'task',
        related_entity_id: marketplaceTask.id,
        metadata: { applicant: context.users.freelancerOne.username },
        is_read: false,
        created_at: new Date(this.isoDaysAgo(1)),
        updated_at: new Date(this.isoDaysAgo(1)),
      },
      {
        user_id: context.users.owner.id,
        title: 'Đã chuyển context mặc định về organization owner',
        message:
          'Tài khoản của bạn sẽ vào Suar Workspace Lab trước để test giao diện owner rõ hơn.',
        type: 'organization_context_updated',
        related_entity_type: 'organization',
        related_entity_id: context.organizations.orgA.id,
        metadata: { role: 'org_owner' },
        is_read: false,
        created_at: new Date(this.isoDaysAgo(0)),
        updated_at: new Date(this.isoDaysAgo(0)),
      },
      {
        user_id: context.users.owner.id,
        title: 'Org B đã giao thêm task cho bạn',
        message: 'Bạn hiện có dữ liệu task khi chuyển sang org B với vai trò member.',
        type: 'task_assigned',
        related_entity_type: 'organization',
        related_entity_id: context.organizations.orgB.id,
        metadata: { role: 'org_member' },
        is_read: false,
        created_at: new Date(this.isoDaysAgo(0)),
        updated_at: new Date(this.isoDaysAgo(0)),
      },
      {
        user_id: context.users.member.id,
        title: 'Snapshot hồ sơ đã được publish',
        message: 'Profile proof mới nhất của bạn đã có share link và lịch sử snapshot.',
        type: 'profile_snapshot_published',
        related_entity_type: 'user_profile_snapshot',
        related_entity_id: context.snapshots.member,
        metadata: { visibility: 'public' },
        is_read: false,
        created_at: new Date(this.isoDaysAgo(1)),
        updated_at: new Date(this.isoDaysAgo(1)),
      },
      {
        user_id: context.users.member.id,
        title: 'Bạn có task đang review',
        message:
          'Luồng profile động đang có một task ở trạng thái in_review để test widget realtime.',
        type: 'task_review_pending',
        related_entity_type: 'task',
        related_entity_id: this.requireValue(
          context.tasks['member-profile-live'],
          'mongo-task:member-profile-live'
        ).id,
        metadata: { project: context.projects.orgAPlatform.name },
        is_read: false,
        created_at: new Date(this.isoDaysAgo(0)),
        updated_at: new Date(this.isoDaysAgo(0)),
      },
      {
        user_id: context.users.superadmin.id,
        title: 'Có review bị flag cần kiểm tra',
        message: 'Trang admin hiện có 1 flagged review ở trạng thái pending.',
        type: 'flagged_review_pending',
        related_entity_type: 'flagged_review',
        related_entity_id: null,
        metadata: { source: 'seed:data' },
        is_read: false,
        created_at: new Date(this.isoDaysAgo(1)),
        updated_at: new Date(this.isoDaysAgo(1)),
      },
      {
        user_id: context.users.superadmin.id,
        title: 'Package usage đã được cập nhật',
        message: 'Dashboard có dữ liệu gói Pro và ProMax để kiểm tra admin package management.',
        type: 'subscription_metrics_ready',
        related_entity_type: 'user_subscription',
        related_entity_id: null,
        metadata: { packages: ['pro', 'promax'] },
        is_read: false,
        created_at: new Date(this.isoDaysAgo(0)),
        updated_at: new Date(this.isoDaysAgo(0)),
      },
      {
        user_id: context.users.orgAdmin.id,
        title: 'Design system role states cần review',
        message:
          'Có task mới trong Workspace Design System để kiểm tra owner/member visual states.',
        type: 'task_assigned',
        related_entity_type: 'project',
        related_entity_id: context.projects.orgADesignSystem.id,
        metadata: {
          task: this.requireValue(
            context.tasks['orga-design-refresh'],
            'mongo-task:orga-design-refresh'
          ).id,
        },
        is_read: false,
        created_at: new Date(this.isoDaysAgo(0)),
        updated_at: new Date(this.isoDaysAgo(0)),
      },
    ])

    await MongoAuditLogModel.insertMany([
      {
        user_id: context.users.owner.id,
        action: 'seed_org_owner_workspace',
        entity_type: 'organization',
        entity_id: context.organizations.orgA.id,
        old_values: null,
        new_values: {
          current_org: context.organizations.orgA.slug,
          secondary_membership: context.organizations.orgB.slug,
        },
        ip_address: '127.0.0.1',
        user_agent: 'seed:data',
        created_at: new Date(this.isoDaysAgo(1)),
      },
      {
        user_id: context.users.superadmin.id,
        action: 'seed_admin_dashboard',
        entity_type: 'user',
        entity_id: context.users.superadmin.id,
        old_values: { system_role: 'registered_user' },
        new_values: { system_role: 'superadmin', redirect_target: '/admin' },
        ip_address: '127.0.0.1',
        user_agent: 'seed:data',
        created_at: new Date(this.isoDaysAgo(1)),
      },
      {
        user_id: context.users.member.id,
        action: 'publish_profile_snapshot',
        entity_type: 'user_profile_snapshot',
        entity_id: context.snapshots.member,
        old_values: null,
        new_values: { is_public: true, user_id: context.users.member.id },
        ip_address: '127.0.0.1',
        user_agent: 'seed:data',
        created_at: new Date(this.isoDaysAgo(1)),
      },
      {
        user_id: context.users.owner.id,
        action: 'create_project',
        entity_type: 'project',
        entity_id: context.projects.orgAPlatform.id,
        old_values: null,
        new_values: { organization_id: context.organizations.orgA.id },
        ip_address: '127.0.0.1',
        user_agent: 'seed:data',
        created_at: new Date(this.isoDaysAgo(5)),
      },
      {
        user_id: context.users.superadmin.id,
        action: 'seed_package_catalog',
        entity_type: 'user_subscription',
        entity_id: null,
        old_values: null,
        new_values: { packages: ['pro', 'promax'], active_subscriptions: 3 },
        ip_address: '127.0.0.1',
        user_agent: 'seed:data',
        created_at: new Date(this.isoDaysAgo(0)),
      },
    ])

    await MongoUserActivityLog.insertMany([
      {
        user_id: context.users.owner.id,
        action_type: 'switch_organization',
        action_data: {
          from: context.organizations.orgA.slug,
          to: context.organizations.orgB.slug,
          expected_role: 'org_member',
        },
        related_entity_type: 'organization',
        related_entity_id: context.organizations.orgB.id,
        ip_address: '127.0.0.1',
        user_agent: 'seed:data',
        created_at: new Date(this.isoDaysAgo(1)),
      },
      {
        user_id: context.users.member.id,
        action_type: 'profile_snapshot_published',
        action_data: {
          snapshot_id: context.snapshots.member,
          total_completed_assignments: 3,
        },
        related_entity_type: 'user_profile_snapshot',
        related_entity_id: context.snapshots.member,
        ip_address: '127.0.0.1',
        user_agent: 'seed:data',
        created_at: new Date(this.isoDaysAgo(1)),
      },
      {
        user_id: context.users.superadmin.id,
        action_type: 'admin_login',
        action_data: {
          redirect_to: '/admin',
          current_organization_id: null,
        },
        related_entity_type: 'user',
        related_entity_id: context.users.superadmin.id,
        ip_address: '127.0.0.1',
        user_agent: 'seed:data',
        created_at: new Date(this.isoDaysAgo(1)),
      },
      {
        user_id: context.users.owner.id,
        action_type: 'package_metrics_viewed',
        action_data: {
          packages: ['pro', 'promax'],
          active_orgs: Object.keys(context.organizations).length,
        },
        related_entity_type: 'user_subscription',
        related_entity_id: null,
        ip_address: '127.0.0.1',
        user_agent: 'seed:data',
        created_at: new Date(this.isoDaysAgo(0)),
      },
    ])
  }

  private async logSummary(context: SeedContext): Promise<void> {
    const count = async (table: string) => {
      const row = await db.from(table).count('* as total').first()
      return Number((row?.total as string | number | undefined) ?? 0)
    }

    const [
      userCount,
      orgCount,
      projectCount,
      taskCount,
      reviewCount,
      subscriptionCount,
      notificationCount,
      auditLogCount,
      userActivityCount,
    ] = await Promise.all([
      count('users'),
      count('organizations'),
      count('projects'),
      count('tasks'),
      count('review_sessions'),
      count('user_subscriptions'),
      env.get('MONGODB_URL', '') ? MongoNotification.countDocuments({}) : Promise.resolve(0),
      env.get('MONGODB_URL', '') ? MongoAuditLogModel.countDocuments({}) : Promise.resolve(0),
      env.get('MONGODB_URL', '') ? MongoUserActivityLog.countDocuments({}) : Promise.resolve(0),
    ])

    this.logger.info(
      `Users=${userCount}, organizations=${orgCount}, projects=${projectCount}, tasks=${taskCount}, review_sessions=${reviewCount}, user_subscriptions=${subscriptionCount}, mongo_notifications=${notificationCount}, mongo_audit_logs=${auditLogCount}, mongo_user_activity_logs=${userActivityCount}`
    )
    this.logger.info(
      `Owner account: ${context.users.owner.email} | Superadmin: ${context.users.superadmin.username} | Member account: ${context.users.member.username}`
    )
  }
}
