import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type { SeedRuntime } from '../seed_runtime.js'
import { applyWhere, findRow } from '../seed_utils.js'
import type { SeededSprint, SeededUser, UserKey } from '../types.js'

import { packageId, reviewId } from './sprint_context_loader.js'

export interface SprintPackageSpec {
  reviewer: UserKey
  status: 'pending' | 'submitted'
}

interface SprintManagerReviewRow {
  id: string
}

export const REVIEW_PACKAGE_SPECS: SprintPackageSpec[] = [
  { reviewer: 'owner', status: 'submitted' },
  { reviewer: 'orgAdmin', status: 'submitted' },
  { reviewer: 'member', status: 'submitted' },
  { reviewer: 'peerReviewer', status: 'pending' },
]

export async function upsertPackage(
  runtime: SeedRuntime,
  trx: TransactionClientContract,
  sprint: SeededSprint,
  reviewer: SeededUser,
  status: 'pending' | 'submitted',
  packageIdValue: string
): Promise<void> {
  const existing = await findRow(trx, 'sprint_review_packages', { id: packageIdValue })
  const payload = {
    sprint_id: sprint.id,
    reviewer_id: reviewer.id,
    status,
    submitted_at: status === 'submitted' ? runtime.isoDaysAgo(1, 15) : null,
    created_at: runtime.isoDaysAgo(1, 9),
    updated_at: runtime.isoDaysAgo(1, 15),
  }

  if (existing) {
    await trx.from('sprint_review_packages').where('id', packageIdValue).update(payload)
  } else {
    await trx
      .insertQuery()
      .table('sprint_review_packages')
      .insert({ id: packageIdValue, ...payload })
  }
}

export async function upsertSprintReviews(
  runtime: SeedRuntime,
  trx: TransactionClientContract,
  sprint: SeededSprint,
  users: Record<UserKey, SeededUser>
): Promise<void> {
  for (const packageSpec of REVIEW_PACKAGE_SPECS.filter((item) => item.status === 'submitted')) {
    const packageIdValue = packageId(sprint.id, packageSpec.reviewer)
    const managerReviewId = reviewId(packageIdValue, 'manager')
    const managerTargetUser = packageSpec.reviewer === 'member' ? users.owner : users.orgAdmin
    const existingManager = (await findRow(trx, 'sprint_manager_reviews', {
      id: managerReviewId,
    })) as SprintManagerReviewRow | null
    const managerPayload = {
      package_id: packageIdValue,
      target_user_id: managerTargetUser.id,
      target_role: 'manager',
      rating: packageSpec.reviewer === 'member' ? 4 : 5,
      dimensions: runtime.toJson({
        planning: 'clear',
        feedback_latency: packageSpec.reviewer === 'member' ? 'could_improve' : 'fast',
      }),
      comment:
        packageSpec.reviewer === 'member'
          ? 'Kế hoạch sprint rõ ràng; nếu có ví dụ rubric sớm hơn, người thực hiện sẽ tự đối chiếu được trước khi vào review.'
          : 'Quản lý sprint giữ mục tiêu review luôn hiển thị và gỡ vướng bàn giao cho cộng tác viên rất nhanh.',
      is_anonymous_to_target: true,
      created_at: runtime.isoDaysAgo(1, 16),
      updated_at: runtime.isoDaysAgo(1, 16),
    }

    if (existingManager) {
      await trx.from('sprint_manager_reviews').where('id', managerReviewId).update(managerPayload)
    } else {
      await trx
        .insertQuery()
        .table('sprint_manager_reviews')
        .insert({
          id: managerReviewId,
          ...managerPayload,
        })
    }

    const environmentWhere = {
      package_id: packageIdValue,
      target_type: 'organization',
      target_id: sprint.organizationId,
    }
    const existingEnvironment = await findRow(trx, 'sprint_environment_reviews', environmentWhere)
    const environmentPayload = {
      rating: packageSpec.reviewer === 'orgAdmin' ? 3 : 5,
      dimensions: runtime.toJson({
        review_context: packageSpec.reviewer === 'orgAdmin' ? 'ambiguous' : 'strong',
        tooling: 'reliable',
      }),
      comment:
        packageSpec.reviewer === 'orgAdmin'
          ? 'Công cụ hoạt động tốt, nhưng cần quy định rõ hơn về trách nhiệm chấm điểm trước kỳ chốt sprint tiếp theo.'
          : 'Tổ chức cung cấp ngữ cảnh hữu ích, chứng cứ rõ ràng và hỗ trợ review kịp thời.',
      is_anonymous_publicly: true,
      created_at: runtime.isoDaysAgo(1, 16),
      updated_at: runtime.isoDaysAgo(1, 16),
    }

    if (existingEnvironment) {
      await applyWhere(trx.from('sprint_environment_reviews'), environmentWhere).update(
        environmentPayload
      )
    } else {
      await trx
        .insertQuery()
        .table('sprint_environment_reviews')
        .insert({
          id: reviewId(packageIdValue, 'environment'),
          ...environmentWhere,
          ...environmentPayload,
        })
    }
  }
}
