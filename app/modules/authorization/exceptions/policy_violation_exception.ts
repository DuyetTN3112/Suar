import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import ForbiddenException from '#modules/http/exceptions/forbidden_exception'

export type PolicyViolationCode = 'FORBIDDEN' | 'BUSINESS_RULE' | 'INVALID_STATE'

export interface PolicyViolationDetails {
  readonly policyCode: PolicyViolationCode
  readonly reason: string
}

export class ForbiddenPolicyViolationException
  extends ForbiddenException
  implements PolicyViolationDetails
{
  static override code = 'E_FORBIDDEN'
  readonly policyCode = 'FORBIDDEN'

  constructor(public readonly reason: string) {
    super(reason)
    this.name = 'ForbiddenPolicyViolationException'
  }
}

export class BusinessPolicyViolationException
  extends BusinessLogicException
  implements PolicyViolationDetails
{
  constructor(
    public readonly policyCode: PolicyViolationCode,
    public readonly reason: string
  ) {
    super(reason)
    this.name = 'BusinessPolicyViolationException'
  }
}

export type PolicyViolationException =
  | ForbiddenPolicyViolationException
  | BusinessPolicyViolationException

export function isPolicyViolationException(error: unknown): error is PolicyViolationException {
  return error instanceof ForbiddenPolicyViolationException || error instanceof BusinessPolicyViolationException
}
