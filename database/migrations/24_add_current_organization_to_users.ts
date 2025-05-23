import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    // Thêm foreign key constraint cho users.current_organization_id
    this.db.rawQuery(`
      ALTER TABLE users
      ADD COLUMN current_organization_id INT UNSIGNED NULL,
      ADD CONSTRAINT fk_users_current_org FOREIGN KEY (current_organization_id) 
      REFERENCES organizations(id) ON DELETE SET NULL
    `)
    // Thêm trigger để kiểm tra current_organization_id khi update
    this.db.rawQuery(`
      CREATE TRIGGER before_update_user_current_org
      BEFORE UPDATE ON users
      FOR EACH ROW
      BEGIN
          IF NEW.current_organization_id IS NOT NULL THEN
              IF NOT EXISTS (
                  SELECT 1 FROM organization_users 
                  WHERE user_id = NEW.id 
                      AND organization_id = NEW.current_organization_id
              ) THEN
                  SIGNAL SQLSTATE '45000'
                  SET MESSAGE_TEXT = 'Người dùng không thuộc tổ chức này';
              END IF;
          END IF;
      END
    `)
    // Trigger ngăn việc đặt current_organization_id khi thêm mới
    this.db.rawQuery(`
      CREATE TRIGGER before_user_insert
      BEFORE INSERT ON users
      FOR EACH ROW
      BEGIN
          IF NEW.current_organization_id IS NOT NULL THEN
              SIGNAL SQLSTATE '45000'
              SET MESSAGE_TEXT = 'Không thể đặt current_organization_id khi thêm mới người dùng. Hãy thêm người dùng vào tổ chức sau.';
          END IF;
      END
    `)
  }

  async down() {
    // Xóa triggers
    this.db.rawQuery('DROP TRIGGER IF EXISTS before_update_user_current_org')
    this.db.rawQuery('DROP TRIGGER IF EXISTS before_user_insert')
    // Xóa foreign key và column từ users table
    this.db.rawQuery(`
      ALTER TABLE users
      DROP FOREIGN KEY fk_users_current_org,
      DROP COLUMN current_organization_id
    `)
  }
}
