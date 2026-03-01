import loggerService from '#modules/logger/public_contracts/logger_service'
import MongoUserActivityLog from '#modules/user_activity/infra/models/user_activity_log'
import type { UserActivityLogCreateData } from '#modules/user_activity/infra/repositories/user_activity_repository_interface'

export const create = async (data: UserActivityLogCreateData): Promise<void> => {
  try {
    await new MongoUserActivityLog({
      user_id: data.user_id,
      action_type: data.action_type,
      action_data: data.action_data ?? undefined,
      related_entity_type: data.related_entity_type ?? undefined,
      related_entity_id: data.related_entity_id ?? undefined,
      ip_address: data.ip_address ?? undefined,
      user_agent: data.user_agent ?? undefined,
    }).save()
  } catch (error) {
    loggerService.error('MongoUserActivityLogRepository.create failed', {
      userId: data.user_id,
      actionType: data.action_type,
      error: error instanceof Error ? error.message : String(error),
    })
    throw error
  }
}
