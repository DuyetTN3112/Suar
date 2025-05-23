import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    // Thêm triggers liên quan đến nhiệm vụ (Task)
    await this.db.rawQuery(`
      CREATE TRIGGER task_version_trigger
      BEFORE UPDATE ON tasks
      FOR EACH ROW
      BEGIN
        -- Chỉ lưu phiên bản nếu có thay đổi thực sự
        IF NOT (NEW.title <=> OLD.title)
            OR NOT (NEW.description <=> OLD.description)
            OR NOT (NEW.status_id <=> OLD.status_id)
            OR NOT (NEW.label_id <=> OLD.label_id)
            OR NOT (NEW.priority_id <=> OLD.priority_id)
            OR NOT (NEW.assigned_to <=> OLD.assigned_to)
            OR NOT (NEW.due_date <=> OLD.due_date)
            OR NOT (NEW.parent_task_id <=> OLD.parent_task_id)
            OR NOT (NEW.estimated_time <=> OLD.estimated_time)
            OR NOT (NEW.actual_time <=> OLD.actual_time)
            OR NOT (NEW.organization_id <=> OLD.organization_id)
        THEN
            INSERT INTO task_versions (
                task_id,
                title,
                description,
                status_id,
                label_id,
                priority_id,
                assigned_to,
                changed_by -- Lưu người THỰC HIỆN thay đổi
            ) VALUES (
                OLD.id,      -- Dùng OLD cho các giá trị trước đó
                OLD.title,
                OLD.description,
                OLD.status_id,
                OLD.label_id,
                OLD.priority_id,
                OLD.assigned_to,
                NEW.updated_by -- Dùng NEW để lấy người vừa cập nhật
            );
        END IF;
      END
    `)

    await this.db.rawQuery(`
      CREATE TRIGGER before_task_project_insert
      BEFORE INSERT ON tasks
      FOR EACH ROW
      BEGIN
        IF NEW.project_id IS NOT NULL THEN
          IF (SELECT organization_id FROM projects WHERE id = NEW.project_id) != NEW.organization_id THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Project and task must belong to the same organization';
          END IF;
        END IF;
      END
    `)

    await this.db.rawQuery(`
      CREATE TRIGGER before_task_project_update
      BEFORE UPDATE ON tasks
      FOR EACH ROW
      BEGIN
        IF NEW.project_id IS NOT NULL AND (NEW.project_id != OLD.project_id OR NEW.organization_id != OLD.organization_id) THEN
          IF (SELECT organization_id FROM projects WHERE id = NEW.project_id) != NEW.organization_id THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Project and task must belong to the same organization';
          END IF;
        END IF;
      END
    `)

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
  }

  async down() {
    // Xóa triggers
    await this.db.rawQuery('DROP TRIGGER IF EXISTS check_creator_organization')
    await this.db.rawQuery('DROP TRIGGER IF EXISTS check_assigned_to_organization')
    await this.db.rawQuery('DROP TRIGGER IF EXISTS before_task_update')
    await this.db.rawQuery('DROP TRIGGER IF EXISTS before_task_project_update')
    await this.db.rawQuery('DROP TRIGGER IF EXISTS before_task_project_insert')
    await this.db.rawQuery('DROP TRIGGER IF EXISTS task_version_trigger')
  }
}
