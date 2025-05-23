import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    // Thêm các triggers liên quan đến task (tiếp)
    await this.db.rawQuery(`
      CREATE TRIGGER before_task_update
      BEFORE UPDATE ON tasks
      FOR EACH ROW
      BEGIN
        -- Kiểm tra assigned_to có thuộc tổ chức không
        IF NEW.assigned_to IS NOT NULL THEN
            IF NOT EXISTS (
                SELECT 1 FROM organization_users 
                WHERE user_id = NEW.assigned_to 
                    AND organization_id = NEW.organization_id
            ) THEN
                SIGNAL SQLSTATE '45000' 
                SET MESSAGE_TEXT = 'Người được gán phải thuộc cùng tổ chức';
            END IF;
        END IF;

        -- Kiểm tra creator_id có thuộc tổ chức không (nếu organization_id thay đổi)
        IF NEW.organization_id <> OLD.organization_id THEN
            IF NOT EXISTS (
                SELECT 1 FROM organization_users 
                WHERE user_id = NEW.creator_id 
                    AND organization_id = NEW.organization_id
            ) THEN
                SIGNAL SQLSTATE '45000' 
                SET MESSAGE_TEXT = 'Người tạo task phải thuộc tổ chức mới';
            END IF;
        END IF;
      END
    `)

    await this.db.rawQuery(`
      CREATE TRIGGER check_assigned_to_organization
      BEFORE INSERT ON tasks
      FOR EACH ROW
      BEGIN
        DECLARE is_same_org BOOLEAN;
        SELECT EXISTS (
            SELECT 1 
            FROM organization_users 
            WHERE user_id = NEW.assigned_to 
            AND organization_id = NEW.organization_id
        ) INTO is_same_org;
        
        IF NOT is_same_org THEN
            SIGNAL SQLSTATE '45000' 
            SET MESSAGE_TEXT = 'Người được gán phải thuộc cùng tổ chức';
        END IF;
      END
    `)

    await this.db.rawQuery(`
      CREATE TRIGGER check_creator_organization
      BEFORE INSERT ON tasks
      FOR EACH ROW
      BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM organization_users
            WHERE user_id = NEW.creator_id AND organization_id = NEW.organization_id
        ) THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Người tạo task phải thuộc tổ chức của task';
        END IF;
      END
    `)

    // Thêm các triggers liên quan đến người dùng
    await this.db.rawQuery(`
      CREATE TRIGGER before_user_update
      BEFORE UPDATE ON users
      FOR EACH ROW
      BEGIN
          SET NEW.updated_at = CURRENT_TIMESTAMP;
      END
    `)

    await this.db.rawQuery(`
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

    await this.db.rawQuery(`
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
  }

  async down() {
    // Xóa triggers
    await this.db.rawQuery('DROP TRIGGER IF EXISTS before_update_user_current_org')
    await this.db.rawQuery('DROP TRIGGER IF EXISTS before_user_insert')
    await this.db.rawQuery('DROP TRIGGER IF EXISTS before_user_update')
    await this.db.rawQuery('DROP TRIGGER IF EXISTS check_creator_organization')
    await this.db.rawQuery('DROP TRIGGER IF EXISTS check_assigned_to_organization')
    await this.db.rawQuery('DROP TRIGGER IF EXISTS before_task_update')
  }
}
