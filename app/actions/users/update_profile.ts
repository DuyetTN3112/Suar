import { Request } from '@adonisjs/core/http'
import hash from '@adonisjs/core/services/hash'
import User from '../../models/user.js'
import UserDetail from '../../models/user_detail.js'
import UserProfile from '../../models/user_profile.js'
import UserUrl from '../../models/user_url.js'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

export async function updateProfile(userId: string, request: Request) {
  const data = request.only([
    'first_name',
    'last_name',
    'email',
    'current_password',
    'new_password',
  ])

  const detailData = request.only(['phone_number', 'bio', 'avatar_url'])
  const profileData = request.only(['date_of_birth', 'language'])
  const urls = request.input('urls', [])

  const trx = await db.transaction()

  try {
    // Tìm user
    const user = await User.findOrFail(userId)

    // Kiểm tra mật khẩu hiện tại nếu cần đổi mật khẩu
    if (data.current_password && data.new_password) {
      const isPasswordValid = await hash.verify(data.current_password, user.password)
      if (!isPasswordValid) {
        throw new Error('Mật khẩu hiện tại không chính xác')
      }
    }

    // Cập nhật thông tin cơ bản
    await user
      .merge({
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        password: data.new_password ? data.new_password : user.password,
      })
      .save()

    // Cập nhật thông tin chi tiết
    if (Object.keys(detailData).length > 0) {
      const userDetail = await UserDetail.firstOrNew(
        { user_id: Number(userId) },
        { user_id: Number(userId) }
      )

      await userDetail
        .merge({
          phone_number: detailData.phone_number,
          bio: detailData.bio,
          avatar_url: detailData.avatar_url,
        })
        .save()
    }

    // Cập nhật thông tin hồ sơ
    if (Object.keys(profileData).length > 0) {
      const userProfile = await UserProfile.firstOrNew(
        { user_id: Number(userId) },
        { user_id: Number(userId) }
      )

      await userProfile
        .merge({
          date_of_birth: profileData.date_of_birth
            ? DateTime.fromISO(profileData.date_of_birth)
            : undefined,
          language: profileData.language,
        })
        .save()
    }

    // Cập nhật URLs
    if (urls && urls.length > 0) {
      // Xóa URLs cũ
      await UserUrl.query().where('user_id', Number(userId)).delete()
      // Thêm URLs mới
      for (const url of urls) {
        await UserUrl.create({ user_id: Number(userId), url })
      }
    }

    await trx.commit()
    return user
  } catch (error) {
    await trx.rollback()
    throw error
  }
}
