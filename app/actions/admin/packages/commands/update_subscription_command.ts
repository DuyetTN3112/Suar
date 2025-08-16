import { BaseCommand } from '#actions/admin/base_command'
import { toStorageSubscriptionPlan } from '#domain/users/subscription_rules'
import { AdminSubscriptionWriteOps } from '#infra/admin/repositories/write/admin_subscription_mutations'
import type { ExecutionContext } from '#types/execution_context'

export interface UpdateSubscriptionDTO {
  subscriptionId: string
  plan?: string
  status?: string
  auto_renew?: boolean
  expires_at?: string | null
}

export default class UpdateSubscriptionCommand extends BaseCommand<UpdateSubscriptionDTO> {
  constructor(
    execCtx: ExecutionContext,
    private repo = AdminSubscriptionWriteOps
  ) {
    super(execCtx)
  }

  async handle(dto: UpdateSubscriptionDTO): Promise<void> {
    // Intentionally no executeInTransaction: this is a single-table subscription update.
    await this.repo.updateSubscription(dto.subscriptionId, {
      plan: toStorageSubscriptionPlan(dto.plan),
      status: dto.status,
      auto_renew: dto.auto_renew,
      expires_at: dto.expires_at,
    })
  }
}
