import { BaseSeeder } from '@adonisjs/lucid/seeders'
import User from '#models/user'
import Organization from '#models/organization'
import UserRole from '#models/user_role'
import db from '@adonisjs/lucid/services/db'

export class OrganizationSeeder extends BaseSeeder {
  async run() {
    // Lấy các user hiện có
    const users = await User.all()
    if (users.length === 0) {
      console.warn('Không tìm thấy user nào để tạo tổ chức')
      return
    }

    // Lấy user role ids
    const adminRole = await UserRole.findBy('name', 'admin')
    const userRole = await UserRole.findBy('name', 'user')

    // Lấy user IDs để gán owner cho organization
    const superadmin = await User.findBy('username', 'superadmin')
    const admin = await User.findBy('username', 'admin')
    const johndoe = await User.findBy('username', 'johndoe')
    const janesmith = await User.findBy('username', 'janesmith')
    const davidm = await User.findBy('username', 'davidm')

    if (!superadmin || !admin || !johndoe || !janesmith) {
      console.warn('Không tìm thấy đủ user để tạo tổ chức')
      return
    }

    // Tạo các tổ chức mẫu theo database
    const organizations = [
      {
        name: 'Acme Corp',
        slug: 'acme-corp',
        description: 'A sample organization',
        owner_id: superadmin.id,
      },
      {
        name: 'Beta LLC',
        slug: 'beta-llc',
        description: 'Another sample organization',
        owner_id: admin.id,
      },
      {
        name: 'Gamma Inc',
        slug: 'gamma-inc',
        description: 'A new organization',
        owner_id: johndoe.id,
      },
      {
        name: 'Delta Ltd',
        slug: 'delta-ltd',
        description: 'Another new organization',
        owner_id: janesmith.id,
      },
      {
        name: 'Tech Innovators',
        slug: 'tech-innovators',
        description: 'Công ty công nghệ sáng tạo',
        owner_id: superadmin.id,
      },
      {
        name: 'Global Solutions',
        slug: 'global-solutions',
        description: 'Nhà cung cấp dịch vụ toàn cầu',
        owner_id: admin.id,
      },
      {
        name: 'Future Labs',
        slug: 'future-labs',
        description: 'Phòng thí nghiệm công nghệ tương lai',
        owner_id: davidm?.id || janesmith.id,
      },
      {
        name: 'SkyNet Systems',
        slug: 'skynet-systems',
        description: 'Hệ thống AI tiên tiến',
        owner_id: superadmin.id,
      },
    ]

    // Tạo tổ chức và thêm thành viên
    for (const orgData of organizations) {
      const organization = await Organization.create(orgData)

      if (organization.name === 'Acme Corp') {
        // Thêm người dùng vào tổ chức (Tự động có owner trong trigger)
        // Bổ sung thêm users khác
        if (johndoe && janesmith) {
          await db.table('organization_users').insert([
            { organization_id: organization.id, user_id: johndoe.id, role_id: userRole?.id || 3 },
            { organization_id: organization.id, user_id: janesmith.id, role_id: userRole?.id || 3 },
          ])
        }
      } else if (organization.name === 'Beta LLC') {
        if (janesmith) {
          await db.table('organization_users').insert([
            {
              organization_id: organization.id,
              user_id: janesmith.id,
              role_id: userRole?.id || 3,
            },
          ])
        }
      } else if (organization.name === 'Tech Innovators') {
        if (johndoe) {
          await db
            .table('organization_users')
            .insert([
              { organization_id: organization.id, user_id: johndoe.id, role_id: userRole?.id || 3 },
            ])
        }
      } else if (organization.name === 'Global Solutions') {
        if (janesmith) {
          await db.table('organization_users').insert([
            {
              organization_id: organization.id,
              user_id: janesmith.id,
              role_id: userRole?.id || 3,
            },
          ])
        }
      } else if (organization.name === 'Future Labs') {
        if (davidm) {
          await db
            .table('organization_users')
            .insert([
              { organization_id: organization.id, user_id: davidm.id, role_id: adminRole?.id || 2 },
            ])
        }
      }
    }

    console.log('Tạo tổ chức mẫu thành công')
  }
}
