import { BaseCommand } from '../../shared/base_command.js'
import type { RegisterUserDTO } from '../dtos/register_user_dto.js'
import User from '#models/user'
import UserDetail from '#models/user_detail'
import UserProfile from '#models/user_profile'
import UserSetting from '#models/user_setting'
import hash from '@adonisjs/core/services/hash'
import type { HttpContext } from '@adonisjs/core/http'

/**
 * RegisterUserCommand
 *
 * Registers a new user with all related records.
 * This is a Command (Write operation) that creates multiple database records.
 *
 * Business Rules:
 * - Password handling (plain text in dev, hashed in production)
 * - Default status: 'active'
 * - Default role: 'user'
 * - Creates User + UserDetail + UserProfile + UserSetting
 * - Auto-login after successful registration
 * - Transaction ensures atomicity
 * - Audit log created
 *
 * Security:
 * - ✅ Email uniqueness checked by database constraint
 * - ✅ Username uniqueness checked by database constraint
 * - ⚠️ Password hashing DISABLED for development (set USE_PASSWORD_HASH = true in production!)
 */
export default class RegisterUserCommand extends BaseCommand<RegisterUserDTO, User> {
  // 🔧 DEVELOPMENT MODE: Set to true to enable password hashing in production
  private readonly USE_PASSWORD_HASH = false

  constructor(ctx: HttpContext) {
    super(ctx)
  }

  /**
   * Main handler - registers user and creates all related records
   */
  async handle(dto: RegisterUserDTO): Promise<User> {
    // Execute everything in a transaction
    const user = await this.executeInTransaction(async (trx) => {
      // 1. Get default status and role
      const { statusId, roleId } = await this.getDefaultStatusAndRole(trx)

      // 2. Prepare password (hash in production, plain text in dev)
      const password = this.USE_PASSWORD_HASH
        ? await this.hashPassword(dto.password) // 🔒 PRODUCTION: Hash password
        : dto.password // 🔧 DEVELOPMENT: Plain text for faster dev

      // 3. Create user
      const newUser = await this.createUser(dto, password, statusId, roleId, trx)

      // 4. Create related records
      await this.createUserDetail(newUser.id, trx)
      await this.createUserProfile(newUser.id, trx)
      await this.createUserSetting(newUser.id, trx)

      return newUser
    })

    // 5. Auto-login the newly created user
    await this.autoLogin(user)

    // 6. Log registration
    await this.logAudit('register', 'user', user.id, null, {
      email: user.email,
      username: user.username,
    })

    return user
  }

  /**
   * Get default status_id and role_id from database
   */
  private async getDefaultStatusAndRole(trx: any): Promise<{ statusId: number; roleId: number }> {
    const defaultStatus = await trx.from('user_status').where('name', 'active').select('id').first()

    const defaultRole = await trx.from('user_roles').where('name', 'user').select('id').first()

    if (!defaultStatus || !defaultRole) {
      throw new Error('Default status or role not found. Database may not be properly set up.')
    }

    return {
      statusId: defaultStatus.id,
      roleId: defaultRole.id,
    }
  }

  /**
   * Hash password with scrypt
   * Only used when USE_PASSWORD_HASH = true
   */
  private async hashPassword(password: string): Promise<string> {
    // 🔒 PRODUCTION: Hash password securely
    return await hash.make(password)
  }

  /**
   * Create user record
   */
  private async createUser(
    dto: RegisterUserDTO,
    hashedPassword: string,
    statusId: number,
    roleId: number,
    trx: any
  ): Promise<User> {
    return await User.create(
      {
        first_name: dto.firstName,
        last_name: dto.lastName,
        username: dto.username,
        email: dto.email,
        password: hashedPassword,
        status_id: statusId,
        role_id: roleId,
        current_organization_id: null,
      },
      { client: trx }
    )
  }

  /**
   * Create user detail record
   */
  private async createUserDetail(userId: number, trx: any): Promise<void> {
    await UserDetail.create(
      {
        user_id: userId,
      },
      { client: trx }
    )
  }

  /**
   * Create user profile record with default language
   */
  private async createUserProfile(userId: number, trx: any): Promise<void> {
    await UserProfile.create(
      {
        user_id: userId,
        language: 'vi', // Default language
      },
      { client: trx }
    )
  }

  /**
   * Create user setting record with defaults
   */
  private async createUserSetting(userId: number, trx: any): Promise<void> {
    await UserSetting.create(
      {
        user_id: userId,
        theme: 'light',
        notifications_enabled: true,
        display_mode: 'grid',
      },
      { client: trx }
    )
  }

  /**
   * Auto-login the newly created user
   */
  private async autoLogin(user: User): Promise<void> {
    await this.ctx.auth.use('web').login(user)
  }
}
