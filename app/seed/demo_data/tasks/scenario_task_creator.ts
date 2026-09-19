import type { TaskSpec } from '../types.js'

import { ensureFourCategoryRequiredSkills } from './task_skill_category_rules.js'

export type ScenarioTaskInput = Pick<
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
      | 'seedGovernanceFixture'
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

export function createScenarioTask(input: ScenarioTaskInput): TaskSpec {
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
    ...(input.seedGovernanceFixture ? { seedGovernanceFixture: true } : {}),
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
      'Phạm vi, người phụ trách và trạng thái task được thể hiện nhất quán trên bảng dự án',
      'Kết quả hoàn thành đáp ứng mô tả, ràng buộc và tiêu chí nghiệm thu đã công bố',
    ],
    verificationMethod: input.verificationMethod ?? 'manual_qa',
    expectedDeliverables: input.expectedDeliverables ?? [
      'Kết quả triển khai theo mô tả task',
      'Tài liệu hướng dẫn sử dụng hoặc vận hành (nếu task cần)',
    ],
    contextBackground:
      input.contextBackground ??
      'Hạng mục thuộc lộ trình sản phẩm liên tổ chức, cần đủ bối cảnh để người nhận có thể bắt tay thực hiện ngay.',
    impactScope: input.impactScope ?? 'project',
    techStack: input.techStack ?? ['AdonisJS', 'Svelte', 'PostgreSQL'],
    environment: input.environment ?? 'staging',
    collaborationType: input.collaborationType ?? 'small_team',
    complexityNotes:
      input.complexityNotes ??
      'Công việc liên kết nhiều bên và nhiều giai đoạn, vì vậy mốc thời gian, trách nhiệm và phụ thuộc phải được ghi nhận thống nhất.',
    measurableOutcomes: input.measurableOutcomes ?? [],
    learningObjectives: input.learningObjectives ?? [],
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
