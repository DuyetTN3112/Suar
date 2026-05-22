import type { AdminActionContext } from '#modules/admin/packages/actions/action_context'
import { BaseCommand } from '#modules/admin/packages/actions/commands/packages/base_command'
import type { AdminSubscriptionWriter } from '#modules/admin/packages/actions/ports/outbound/packages/admin_operational_repository'
import { validateSubscriptionAdministrationInput } from '#modules/admin/packages/domain/packages/subscription_administration_policy'
import ValidationException from '#modules/errors/public_contracts/validation_exception'
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
    private readonly repo: AdminSubscriptionWriter
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
    const result = validateSubscriptionAdministrationInput(dto)
    if (!result.valid && result.field === 'plan') {
      throw ValidationException.field('plan', 'Gói đăng ký không hợp lệ')
    }
    if (!result.valid) {
      throw ValidationException.field('status', 'Trạng thái đăng ký không hợp lệ')
    }
  }
}
