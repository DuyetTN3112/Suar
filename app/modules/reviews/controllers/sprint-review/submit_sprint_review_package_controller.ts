import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { mapReviewDataApiBody } from '../mappers/response/review-core/review_response_mapper.js'

import { HttpStatus } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import {
  type SubmitSprintEnvironmentReviewInput,
  type SubmitSprintManagerReviewInput,
} from '#modules/reviews/actions/commands/submit_sprint_review_package_command'
import { ReviewActionFactory } from '#modules/reviews/actions/ports/inbound/review_action_factory'

@inject()
export default class SubmitSprintReviewPackageController {
  constructor(private readonly actions: ReviewActionFactory) {}

  async handle(ctx: HttpContext) {
    const result = await this.actions
      .makeSubmitSprintReviewPackageCommand(actionContextFromHttp(ctx))
      .executeAndWrap({
        package_id: ctx.params['packageId'] as string,
        manager_reviews: normalizeManagerReviews(
          readAliased(ctx, 'managerReviews', 'manager_reviews', [])
        ),
        environment_reviews: normalizeEnvironmentReviews(
          readAliased(ctx, 'environmentReviews', 'environment_reviews', [])
        ),
      })
      .then((outcome) => outcome.getValue())

    ctx.response.status(HttpStatus.CREATED)
    return mapReviewDataApiBody(result)
  }
}

function readAliased(ctx: HttpContext, camelKey: string, snakeKey: string, fallback: unknown): unknown {
  return ctx.request.input(camelKey, ctx.request.input(snakeKey, fallback))
}

function normalizeManagerReviews(value: unknown): SubmitSprintManagerReviewInput[] {
  if (!Array.isArray(value)) return []

  return value.map((item) => {
    const record = item && typeof item === 'object' ? (item as Record<string, unknown>) : {}
    return {
      target_user_id: readString(record['targetUserId'] ?? record['target_user_id']),
      rating: Number(record['rating']),
      dimensions: normalizeRecord(record['dimensions']),
      comment: typeof record['comment'] === 'string' ? record['comment'] : null,
      is_anonymous_to_target: normalizeBoolean(
        record['isAnonymousToTarget'] ?? record['is_anonymous_to_target'],
        true
      ),
    }
  })
}

function normalizeEnvironmentReviews(value: unknown): SubmitSprintEnvironmentReviewInput[] {
  if (!Array.isArray(value)) return []

  return value.map((item) => {
    const record = item && typeof item === 'object' ? (item as Record<string, unknown>) : {}
    return {
      target_type: readString(
        record['targetType'] ?? record['target_type']
      ) as SubmitSprintEnvironmentReviewInput['target_type'],
      target_id: readString(record['targetId'] ?? record['target_id']),
      rating: Number(record['rating']),
      dimensions: normalizeRecord(record['dimensions']),
      comment: typeof record['comment'] === 'string' ? record['comment'] : null,
      is_anonymous_publicly: normalizeBoolean(
        record['isAnonymousPublicly'] ?? record['is_anonymous_publicly'],
        true
      ),
    }
  })
}

function normalizeRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function normalizeBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}
