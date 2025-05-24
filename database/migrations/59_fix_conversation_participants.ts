import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    // Đảm bảo tất cả người tham gia cuộc trò chuyện đều có liên kết đúng với tổ chức
    // Thêm người dùng vào organization_users nếu họ là thành viên của conversation_participants
    // nhưng chưa có trong organization_users với trạng thái approved
    await this.db.rawQuery(`
      INSERT IGNORE INTO organization_users (organization_id, user_id, role_id, status, created_at, updated_at)
      SELECT DISTINCT
        c.organization_id,
        cp.user_id,
        3, -- Default role_id for regular users (adjust as needed)
        'approved',
        NOW(),
        NOW()
      FROM conversation_participants cp
      JOIN conversations c ON cp.conversation_id = c.id
      LEFT JOIN organization_users ou ON cp.user_id = ou.user_id AND c.organization_id = ou.organization_id
      WHERE ou.user_id IS NULL
      AND c.organization_id IS NOT NULL
    `)
  }

  async down() {
    // Không cần rollback cho migration này vì nó chỉ thêm dữ liệu
    // Việc xóa dữ liệu đã thêm có thể gây ảnh hưởng không mong muốn
  }
}
