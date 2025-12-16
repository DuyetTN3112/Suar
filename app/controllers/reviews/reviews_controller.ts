import type { HttpContext } from '@adonisjs/core/http'
import CreateReviewSessionCommand from '#actions/reviews/commands/create_review_session_command'
import SubmitSkillReviewCommand from '#actions/reviews/commands/submit_skill_review_command'
import ConfirmReviewCommand from '#actions/reviews/commands/confirm_review_command'
import GetReviewSessionQuery from '#actions/reviews/queries/get_review_session_query'
import GetUserReviewsQuery from '#actions/reviews/queries/get_user_reviews_query'
import GetPendingReviewsQuery from '#actions/reviews/queries/get_pending_reviews_query'
import {
  CreateReviewSessionDTO,
  SubmitSkillReviewDTO,
  ConfirmReviewDTO,
  GetReviewSessionDTO,
  GetUserReviewsDTO,
} from '#actions/reviews/dtos/review_dtos'
import Skill from '#models/skill'
import ProficiencyLevel from '#models/proficiency_level'

/**
 * ReviewsController
 *
 * Handles 360° review workflow:
 * - Creating review sessions
 * - Submitting skill reviews
 * - Confirming/disputing results
 * - Viewing review history
 */
export default class ReviewsController {
  /**
   * List pending reviews for current user
   * GET /reviews/pending
   */
  async pending(ctx: HttpContext) {
    const { request, inertia } = ctx

    const query = new GetPendingReviewsQuery(ctx)
    const result = await query.handle({
      page: request.input('page', 1),
      per_page: request.input('per_page', 20),
    })

    return inertia.render('reviews/pending', {
      reviews: result.data.map((r) => r.serialize()),
      meta: result.meta,
    })
  }

  /**
   * Show review session details
   * GET /reviews/:id
   */
  async show(ctx: HttpContext) {
    const { params, inertia } = ctx

    const query = new GetReviewSessionQuery(ctx)
    const session = await query.handle(new GetReviewSessionDTO(Number(params.id)))

    // Get skills and proficiency levels for the review form
    const skills = await Skill.query()
      .where('is_active', true)
      .preload('category')
      .orderBy('skill_name')

    const proficiencyLevels = await ProficiencyLevel.query().orderBy('level_order')

    return inertia.render('reviews/show', {
      session: session.serialize(),
      skills: skills.map((s) => s.serialize()),
      proficiencyLevels: proficiencyLevels.map((p) => p.serialize()),
    })
  }

  /**
   * Submit skill reviews
   * POST /reviews/:id/submit
   */
  async submit(ctx: HttpContext) {
    const { request, response, params, session } = ctx

    try {
      const dto = new SubmitSkillReviewDTO({
        review_session_id: Number(params.id),
        reviewer_type: request.input('reviewer_type'),
        skill_ratings: request.input('skill_ratings'),
      })

      const command = new SubmitSkillReviewCommand(ctx)
      await command.handle(dto)

      session.flash('success', 'Review submitted successfully')
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit review'
      session.flash('error', errorMessage)
    }

    response.redirect().back()
  }

  /**
   * Confirm or dispute review
   * POST /reviews/:id/confirm
   */
  async confirm(ctx: HttpContext) {
    const { request, response, params, session } = ctx

    try {
      const dto = new ConfirmReviewDTO({
        review_session_id: Number(params.id),
        action: request.input('action'),
        dispute_reason: request.input('dispute_reason'),
      })

      const command = new ConfirmReviewCommand(ctx)
      await command.handle(dto)

      const message =
        dto.action === 'confirmed'
          ? 'Review confirmed successfully'
          : 'Review disputed. An admin will review your case.'
      session.flash('success', message)
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to confirm review'
      session.flash('error', errorMessage)
    }

    response.redirect().back()
  }

  /**
   * Get my reviews (as reviewee)
   * GET /my-reviews
   */
  async myReviews(ctx: HttpContext) {
    const { request, inertia, auth } = ctx

    const dto = new GetUserReviewsDTO({
      user_id: auth.user!.id,
      page: request.input('page', 1),
      per_page: request.input('per_page', 20),
    })

    const query = new GetUserReviewsQuery(ctx)
    const result = await query.handle(dto)

    return inertia.render('reviews/my-reviews', {
      reviews: result.data.map((r) => r.serialize()),
      meta: result.meta,
    })
  }

  /**
   * View user's reviews (public profile)
   * GET /users/:id/reviews
   */
  async userReviews(ctx: HttpContext) {
    const { request, params, inertia } = ctx

    const dto = new GetUserReviewsDTO({
      user_id: Number(params.id),
      page: request.input('page', 1),
      per_page: request.input('per_page', 20),
    })

    const query = new GetUserReviewsQuery(ctx)
    const result = await query.handle(dto)

    return inertia.render('reviews/user-reviews', {
      userId: params.id,
      reviews: result.data.map((r) => r.serialize()),
      meta: result.meta,
    })
  }

  /**
   * API: Create review session (after task completion)
   * POST /api/reviews/sessions
   */
  async createSession(ctx: HttpContext) {
    const { request, response } = ctx

    try {
      const dto = new CreateReviewSessionDTO({
        task_assignment_id: request.input('task_assignment_id'),
        reviewee_id: request.input('reviewee_id'),
        required_peer_reviews: request.input('required_peer_reviews', 2),
      })

      const command = new CreateReviewSessionCommand(ctx)
      const session = await command.handle(dto)

      response.status(201).json({
        success: true,
        data: session.serialize(),
      })
      return
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to create review session'
      response.status(400).json({
        success: false,
        message: errorMessage,
      })
      return
    }
  }
}
