import type { HttpContext } from '@adonisjs/core/http'
import { BaseCommand } from '#actions/shared/base_command'
import { UpdateUserDetailsDTO } from '../dtos/update_user_details_dto.js'
import UserDetail from '#models/user_detail'

/**
 * UpdateUserDetailsCommand
 *
 * Command for updating user profile details.
 * Creates a new UserDetail record if it doesn't exist.
 *
 * Business Rules:
 * - User can only update their own details
 * - Creates UserDetail if not exists (first time profile completion)
 * - Uses transaction for data consistency
 * - Logs audit trail for tracking changes
 */
export default class UpdateUserDetailsCommand extends BaseCommand<UpdateUserDetailsDTO, UserDetail> {
  constructor(protected override ctx: HttpContext) {
    super(ctx)
  }

  /**
   * Execute the command to update user details
   */
  async handle(dto: UpdateUserDetailsDTO): Promise<UserDetail> {
    const user = this.ctx.auth.user
    if (!user) {
      throw new Error('User not authenticated')
    }

    return await this.executeInTransaction(async (trx) => {
      // Try to find existing user detail
      let userDetail = await UserDetail.query({ client: trx })
        .where('user_id', user.id)
        .first()

      const oldValues = userDetail ? { ...userDetail.$attributes } : null

      if (userDetail) {
        // Update existing record
        userDetail.merge({
          avatar_url: dto.avatar_url !== undefined ? dto.avatar_url : userDetail.avatar_url,
          bio: dto.bio !== undefined ? dto.bio : userDetail.bio,
          phone: dto.phone !== undefined ? dto.phone : userDetail.phone,
          address: dto.address !== undefined ? dto.address : userDetail.address,
          timezone: dto.timezone !== undefined ? dto.timezone : userDetail.timezone,
          language: dto.language !== undefined ? dto.language : userDetail.language,
          is_freelancer: dto.is_freelancer !== undefined ? dto.is_freelancer : userDetail.is_freelancer,
        })
        await userDetail.useTransaction(trx).save()
      } else {
        // Create new record
        userDetail = await UserDetail.create(
          {
            user_id: user.id,
            avatar_url: dto.avatar_url ?? null,
            bio: dto.bio ?? null,
            phone: dto.phone ?? null,
            address: dto.address ?? null,
            timezone: dto.timezone ?? 'UTC',
            language: dto.language ?? 'vi',
            is_freelancer: dto.is_freelancer ?? false,
            freelancer_rating: null,
            freelancer_completed_tasks_count: 0,
          },
          { client: trx }
        )
      }

      // Log audit
      await this.logAudit(
        oldValues ? 'update' : 'create',
        'user_detail',
        user.id,
        oldValues,
        { ...dto }
      )

      return userDetail
    })
  }
}
