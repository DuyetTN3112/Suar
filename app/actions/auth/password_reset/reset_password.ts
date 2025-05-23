import VerifyPasswordResetToken from '#actions/auth/password_reset/verify_password_reset_token'
import { Exception } from '@adonisjs/core/exceptions'
import ExpirePasswordResetTokens from '#actions/auth/password_reset/expire_password_reset_tokens'

type Params = {
  data: {
    password: string
    value: string
  }
}

export default class ResetPassword {
  static async handle({ data }: Params) {
    const { isValid, user } = await VerifyPasswordResetToken.handle({ encryptedValue: data.value })

    if (!isValid) {
      throw new Exception('Mã đặt lại mật khẩu không hợp lệ hoặc đã hết hạn', {
        status: 403,
        code: 'E_UNAUTHORIZED',
      })
    }

    await user!.merge({ password: data.password }).save()
    await ExpirePasswordResetTokens.handle({ user: user! })

    return user!
  }
} 