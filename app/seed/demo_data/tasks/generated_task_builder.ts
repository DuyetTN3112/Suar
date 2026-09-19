import type { GeneratedProjectTaskSeedConfig, ProjectKey, TaskSpec } from '../types.js'

import { GENERATED_PROJECT_TASK_CONFIG } from './generated_task_config.js'
import { PROJECT_NARRATIVE_TITLES } from './project_narrative_titles.js'
import { ensureFourCategoryRequiredSkills } from './task_skill_category_rules.js'

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
      const narrativeTitle = PROJECT_NARRATIVE_TITLES[project][ordinal - 1]
      if (!narrativeTitle) {
        throw new Error(`Missing explicit narrative for ${project} generated item ${ordinal}`)
      }
      const taskStatus =
        narrativeTitle === 'Hoàn thiện trạng thái rỗng cho bảng đánh giá'
          ? 'done'
          : pickCycled(CANONICAL_STATUS_SEQUENCE, targetIndex, `${project}:taskStatus`)
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
          `Kết quả triển khai của ${narrativeTitle}`,
          `Tài liệu hướng dẫn hoặc cấu hình liên quan đến ${project}`,
        ],
        contextBackground:
          `Dự án ${config.titlePrefix} cần mô tả rõ kết quả và cách kiểm tra; hạng mục này bổ sung một phần việc cụ thể vào lộ trình đó.`,
        impactScope: pickCycled(BULK_IMPACT_SEQUENCE, targetIndex, `${project}:impactScope`),
        techStack: config.techStack,
        environment: pickCycled(BULK_ENVIRONMENT_SEQUENCE, targetIndex, `${project}:environment`),
        collaborationType: pickCycled(
          BULK_COLLABORATION_SEQUENCE,
          targetIndex,
          `${project}:collaborationType`
        ),
        complexityNotes:
          `Nhóm phải thống nhất nguồn dữ liệu, tiêu chí nghiệm thu và phụ thuộc của “${narrativeTitle}” trước khi chuyển trạng thái.`,
        measurableOutcomes: [],
        learningObjectives: [],
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
