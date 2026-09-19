import type { TaskSpec } from '../types.js'

import { ensureFourCategoryRequiredSkills } from './task_skill_category_rules.js'

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
