import {
  AuthWebSessionUserReader,
  type AuthWebSessionUser,
} from '#modules/auth/actions/ports/outbound/auth_web_session_user_reader'
import UserModel from '#modules/users/infra/models/profile/user'

export class AuthWebSessionUserReaderAdapter extends AuthWebSessionUserReader {
  async findById(userId: string): Promise<AuthWebSessionUser | null> {
    return UserModel.query().where('id', userId).first()
  }
}
