import db from '@adonisjs/lucid/services/db'

import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import ForbiddenException from '#modules/http/exceptions/forbidden_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import {
  BACKEND_NOTIFICATION_ENTITY_TYPES,
  BACKEND_NOTIFICATION_TYPES,
} from '#modules/notifications/public_contracts/notification_constants'
import { notificationPublicApi } from '#modules/notifications/public_contracts/notification_creator'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'
import { queueAiDisputeEvaluationAfterReport } from '#modules/reviews/actions/support/ai_dispute_auto_queue'
import { buildReviewDisputeCaseFileRecord } from '#modules/reviews/actions/support/review_dispute_case_file_builder'
import {
  ACTIVE_REVIEW_DISPUTE_STATUSES,
  ReviewDisputeStatus,
} from '#modules/reviews/constants/review_constants'

export interface ReportReviewDisputeDTO {
  dispute_id: string
  escalation_reason: string
}

function requireUserId(ctx: ReviewActionContext): string {
  if (!ctx.userId) {
    throw new UnauthorizedException()
  }

  return ctx.userId
}

export default class ReportReviewDisputeCommand {
  constructor(private execCtx: ReviewActionContext) {}

  async execute(dto: ReportReviewDisputeDTO): Promise<{ id: string; status: string }> {
    const actorId = requireUserId(this.execCtx)
    const trx = await db.transaction()

    try {
      const dispute = (await trx
        .from('review_disputes')
        .where('id', dto.dispute_id)
        .forUpdate()
        .first()) as
        | {
            id: string
            status: string
            reviewee_id: string
            task_id: string
            reported_to_admin_at: string | null
          }
        | undefined

      if (!dispute) {
        throw new BusinessLogicException('Review dispute không tồn tại')
      }

      if (!ACTIVE_REVIEW_DISPUTE_STATUSES.includes(dispute.status as (typeof ACTIVE_REVIEW_DISPUTE_STATUSES)[number])) {
        throw new BusinessLogicException('Review dispute không còn ở trạng thái có thể report')
      }

      if (dispute.reviewee_id !== actorId) {
        throw new ForbiddenException('Chỉ reviewee mới có thể report tranh chấp này lên admin')
      }

      if (dispute.reported_to_admin_at) {
        throw new BusinessLogicException('Review dispute này đã được report lên admin trước đó')
      }

      const exchangeRows = (await trx
        .from('review_dispute_comments')
        .where('dispute_id', dto.dispute_id)
        .where('visibility', 'all_parties')
        .select('author_id')) as Array<{ author_id: string }>

      const hasRevieweeMessage = exchangeRows.some((row) => row.author_id === actorId)
      const hasCounterpartyMessage = exchangeRows.some((row) => row.author_id !== actorId)

      if (!hasRevieweeMessage || !hasCounterpartyMessage) {
        throw new BusinessLogicException(
          'Cần có trao đổi thực tế giữa hai bên trong dispute trước khi report lên admin'
        )
      }

      await trx
        .from('review_disputes')
        .where('id', dto.dispute_id)
        .update({
          status: ReviewDisputeStatus.ADMIN_REVIEWING,
          reported_to_admin_at: db.raw('NOW()'),
          reported_to_admin_by: actorId,
          escalation_reason: dto.escalation_reason.trim(),
          updated_at: db.raw('NOW()'),
        })

      const built = await buildReviewDisputeCaseFileRecord(trx, dto.dispute_id, actorId)
      const builtCaseFile = {
        id: built.id,
        caseVersion: built.caseVersion,
        completenessScore: built.completenessScore,
      }

      await trx.commit()

      await auditPublicApi.write(this.execCtx, {
        user_id: actorId,
        action: 'report_review_dispute',
        entity_type: 'review_dispute',
        entity_id: dto.dispute_id,
        old_values: null,
        new_values: {
          status: ReviewDisputeStatus.ADMIN_REVIEWING,
          escalation_reason: dto.escalation_reason.trim(),
          case_file_id: builtCaseFile.id,
          case_version: builtCaseFile.caseVersion,
          case_file_completeness_score: builtCaseFile.completenessScore,
        },
      })

      await auditPublicApi.write(this.execCtx, {
        user_id: actorId,
        action: 'build_review_dispute_case_file',
        entity_type: 'review_dispute',
        entity_id: dto.dispute_id,
        old_values: null,
        new_values: {
          case_file_id: builtCaseFile.id,
          case_version: builtCaseFile.caseVersion,
          completeness_score: builtCaseFile.completenessScore,
          trigger: 'report_review_dispute',
        },
      })

      await notificationPublicApi.handle({
        user_id: actorId,
        type: BACKEND_NOTIFICATION_TYPES.REVIEW_DISPUTE_ESCALATED,
        title: 'Tranh chấp đã được báo cáo lên admin',
        message: 'Admin hệ thống sẽ xem xét hồ sơ tranh chấp của bạn.',
        related_entity_type: BACKEND_NOTIFICATION_ENTITY_TYPES.TASK,
        related_entity_id: dispute.task_id,
      })

      const adminUsers = (await db
        .from('users')
        .whereIn('system_role', ['system_admin', 'superadmin'])
        .whereNot('id', actorId)
        .select('id')) as Array<{ id: string }>

      for (const adminUser of adminUsers) {
        await notificationPublicApi.handle({
          user_id: adminUser.id,
          type: BACKEND_NOTIFICATION_TYPES.REVIEW_DISPUTE_ESCALATED,
          title: 'Có tranh chấp review mới cần admin xử lý',
          message: 'Một review dispute đã được report lên hệ thống và đang chờ admin xem xét.',
          related_entity_type: BACKEND_NOTIFICATION_ENTITY_TYPES.TASK,
          related_entity_id: dispute.task_id,
        })
      }

      await queueAiDisputeEvaluationAfterReport({
        disputeId: dto.dispute_id,
        sourceType: 'review_dispute',
        requestContext: this.execCtx,
      })

      return {
        id: dto.dispute_id,
        status: ReviewDisputeStatus.ADMIN_REVIEWING,
      }
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }
}
