import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import UpdateProfileSnapshotAccessCommand from '#actions/users/commands/update_profile_snapshot_access_command'

export default class UpdateProfileSnapshotAccessController {
  async handle(ctx: HttpContext) {
    const { request, params } = ctx
    const rawIsPublic = request.input('is_public') as unknown
    const parsedIsPublic =
      rawIsPublic === true || rawIsPublic === 'true' || rawIsPublic === 1 || rawIsPublic === '1'

    const command = new UpdateProfileSnapshotAccessCommand(ExecutionContext.fromHttp(ctx))
    const result = await command.handle({
      snapshotId: params.id as string,
      isPublic: parsedIsPublic,
      expiresInDays: request.input('expires_in_days') as number | undefined,
    })

    ctx.response.status(200).json({ success: true, data: result })
  }
}
