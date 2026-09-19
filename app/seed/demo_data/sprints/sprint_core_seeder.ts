import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type { SeedRuntime } from '../seed_runtime.js'
import { findRow } from '../seed_utils.js'
import type {
  ProjectKey,
  SeededProject,
  SeededSprint,
  SeededTask,
  SeededUser,
  UserKey,
} from '../types.js'

export interface SprintSpec {
  key: string
  id: string
  project: ProjectKey
  name: string
  goal: string
  status: 'active' | 'review_open'
  startsDaysAgo: number
  endsDaysAhead: number
  taskKeys: string[]
}

export const SPRINT_SPECS: SprintSpec[] = [
  {
    key: 'trustReviewJuly',
    id: 'sprint-trust-review-2026-07-a',
    project: 'orgAPlatform',
    name: 'Vận hành Đánh giá Tin cậy - Tháng 7 đợt A',
    goal: 'Khép kín vòng đánh giá tin cậy từ chứng cứ công việc đến hồ sơ năng lực, giữ minh bạch quá trình bàn giao của cộng tác viên.',
    status: 'review_open',
    startsDaysAgo: 16,
    endsDaysAhead: -2,
    taskKeys: [
      'member-org-switch',
      'member-profile-proof',
      'member-profile-live',
      'owner-evidence-architecture',
      'owner-profile-api-contract',
    ],
  },
  {
    key: 'trustReviewJulyNext',
    id: 'sprint-trust-review-2026-07-b',
    project: 'orgAPlatform',
    name: 'Vận hành Đánh giá Tin cậy - Tháng 7 đợt B',
    goal: 'Ổn định luồng duyệt ứng viên marketplace, phản hồi sprint và các trang hồ sơ công khai cho đợt phát hành kế tiếp.',
    status: 'active',
    startsDaysAgo: 2,
    endsDaysAhead: 12,
    taskKeys: ['owner-active-platform-work', 'marketplace-qa-pipeline'],
  },
  {
    key: 'operationsReviewJuly',
    id: 'sprint-operations-review-2026-07-a',
    project: 'orgAOperations',
    name: 'Kiểm soát Chất lượng Vận hành - Tháng 7',
    goal: 'Giải quyết tranh chấp đánh giá vận hành dựa trên chứng cứ công việc, hạng mục liên quan và ngữ cảnh reviewer trong cùng một chuỗi sprint.',
    status: 'active',
    startsDaysAgo: 14,
    endsDaysAhead: 3,
    taskKeys: [
      'owner-review-dispute-case',
      'orga-review-dispute-detail',
      'member-admin-regression',
      'owner-data-governance',
      'owner-release-governance',
    ],
  },
]

export async function upsertSprint(
  runtime: SeedRuntime,
  trx: TransactionClientContract,
  spec: SprintSpec,
  users: Record<UserKey, SeededUser>,
  projects: Record<ProjectKey, SeededProject>
): Promise<SeededSprint> {
  const project = projects[spec.project]
  const existing = await findRow(trx, 'project_sprints', { id: spec.id })
  const payload = {
    organization_id: project.organizationId,
    project_id: project.id,
    name: spec.name,
    status: spec.status,
    starts_at: runtime.isoDaysAgo(spec.startsDaysAgo),
    ends_at:
      spec.endsDaysAhead >= 0
        ? runtime.isoDaysAhead(spec.endsDaysAhead)
        : runtime.isoDaysAgo(Math.abs(spec.endsDaysAhead)),
    created_by: users.owner.id,
    closed_by: spec.status === 'review_open' ? users.owner.id : null,
    review_opened_at: spec.status === 'review_open' ? runtime.isoDaysAgo(1, 10) : null,
    review_closed_at: null,
    goal: spec.goal,
    created_at: runtime.isoDaysAgo(20),
    updated_at: runtime.isoDaysAgo(1),
  }

  if (existing) {
    await trx.from('project_sprints').where('id', spec.id).update(payload)
  } else {
    await trx
      .insertQuery()
      .table('project_sprints')
      .insert({ id: spec.id, ...payload })
  }

  return {
    id: spec.id,
    projectId: project.id,
    organizationId: project.organizationId,
    status: spec.status,
  }
}

export async function linkTasksToSprint(
  trx: TransactionClientContract,
  sprint: SeededSprint,
  spec: SprintSpec,
  tasks: Record<string, SeededTask>
): Promise<void> {
  for (const taskKey of spec.taskKeys) {
    const task = tasks[taskKey]
    if (!task) continue
    await trx.from('tasks').where('id', task.id).update({ project_sprint_id: sprint.id })
  }
}
