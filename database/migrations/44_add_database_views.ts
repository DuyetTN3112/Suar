import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    // Thêm views
    await this.db.rawQuery(`
      CREATE OR REPLACE VIEW active_tasks_with_users AS
      SELECT 
          t.id, t.title, t.description, 
          ts.name AS status, 
          tl.name AS label, 
          tp.name AS priority,
          CONCAT(u1.first_name, ' ', u1.last_name) AS assigned_to_name,
          CONCAT(u2.first_name, ' ', u2.last_name) AS creator_name,
          t.due_date, t.estimated_time, t.actual_time, 
          t.created_at, t.updated_at
      FROM 
          tasks t
      LEFT JOIN 
          task_status ts ON t.status_id = ts.id
      LEFT JOIN 
          task_labels tl ON t.label_id = tl.id
      LEFT JOIN 
          task_priorities tp ON t.priority_id = tp.id
      LEFT JOIN 
          users u1 ON t.assigned_to = u1.id
      LEFT JOIN 
          users u2 ON t.creator_id = u2.id
      WHERE 
          t.deleted_at IS NULL
    `)

    await this.db.rawQuery(`
      CREATE OR REPLACE VIEW active_users_with_details AS
      SELECT 
          u.id, u.full_name, u.username, u.email,
          ud.phone_number, ur.name AS role, us.name AS status,
          up.date_of_birth, up.language, 
          uset.theme, uset.display_mode
      FROM 
          users u
      LEFT JOIN 
          user_roles ur ON u.role_id = ur.id
      LEFT JOIN 
          user_status us ON u.status_id = us.id
      LEFT JOIN 
          user_profile up ON u.id = up.user_id
      LEFT JOIN 
          user_details ud ON u.id = ud.user_id
      LEFT JOIN 
          user_settings uset ON u.id = uset.user_id
      WHERE 
          u.deleted_at IS NULL
    `)
  }

  async down() {
    // Xóa views
    await this.db.rawQuery('DROP VIEW IF EXISTS active_users_with_details')
    await this.db.rawQuery('DROP VIEW IF EXISTS active_tasks_with_users')
  }
}
