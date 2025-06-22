import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import PublishUserProfileSnapshotCommand from '#actions/users/commands/publish_user_profile_snapshot_command'

export default class PublishProfileSnapshotController {
  async handle(ctx: HttpContext) {
    const { request, response } = ctx

    const command = new PublishUserProfileSnapshotCommand(ExecutionContext.fromHttp(ctx))
    const result = await command.handle({
      snapshotName: request.input('snapshot_name') as string | undefined,
      isPublic: request.input('is_public') as boolean | undefined,
      expiresInDays: request.input('expires_in_days') as number | undefined,
    })

    response.status(201).json({ success: true, data: result })
  }
}
