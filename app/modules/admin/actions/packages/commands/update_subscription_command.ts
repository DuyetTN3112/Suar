import type { AdminActionContext } from '#modules/admin/actions/admin_action_context'
import { BaseCommand } from '#modules/admin/actions/base_command'
import { AdminSubscriptionWriteOps } from '#modules/admin/infra/repositories/write/admin_subscription_mutations'
import ValidationException from '#modules/http/exceptions/validation_exception'
import { toStorageSubscriptionPlan } from '#modules/users/public_contracts/subscription_rules'

export interface UpdateSubscriptionDTO {
  subscriptionId: string
  plan?: string
  status?: string
  auto_renew?: boolean
  expires_at?: string | null
}

export default class UpdateSubscriptionCommand extends BaseCommand<UpdateSubscriptionDTO> {
  constructor(
    execCtx: AdminActionContext,
    private repo = AdminSubscriptionWriteOps
  ) {
    super(execCtx)
  }

  async handle(dto: UpdateSubscriptionDTO): Promise<void> {
    this.validate(dto)
    const plan = toStorageSubscriptionPlan(dto.plan)

    // Intentionally no executeInTransaction: this is a single-table subscription update.
    await this.repo.updateSubscription(dto.subscriptionId, {
      ...(plan ? { plan } : {}),
      ...(dto.status ? { status: dto.status } : {}),
      ...(dto.auto_renew === undefined ? {} : { auto_renew: dto.auto_renew }),
      ...(dto.expires_at === undefined ? {} : { expires_at: dto.expires_at }),
    })
  }

  private validate(dto: UpdateSubscriptionDTO): void {
    const validInputPlans = new Set(['pro', 'promax', 'enterprise'])
    const validStatuses = new Set(['active', 'cancelled'])

    if (dto.plan !== undefined && !validInputPlans.has(dto.plan)) {
      throw ValidationException.field('plan', 'Gói đăng ký không hợp lệ')
    }

    if (dto.status !== undefined && !validStatuses.has(dto.status)) {
      throw ValidationException.field('status', 'Trạng thái đăng ký không hợp lệ')
    }
  }
}
