import type { ExecutionContext } from '#types/execution_context'
import AdminSubscriptionRepository from '#infra/admin/repositories/admin_subscription_repository'

export interface UpdateSubscriptionDTO {
  subscriptionId: string
  plan?: string
  status?: string
  auto_renew?: boolean
  expires_at?: string | null
}

export default class UpdateSubscriptionCommand {
  constructor(
    protected execCtx: ExecutionContext,
    private repo = new AdminSubscriptionRepository()
  ) {}

  async handle(dto: UpdateSubscriptionDTO): Promise<void> {
    void this.execCtx
    const plan = dto.plan === 'promax' ? 'enterprise' : dto.plan
    await this.repo.updateSubscription(dto.subscriptionId, {
      plan,
      status: dto.status,
      auto_renew: dto.auto_renew,
      expires_at: dto.expires_at,
    })
  }
}
