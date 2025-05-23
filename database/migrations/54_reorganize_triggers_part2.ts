import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    // Thêm các triggers liên quan đến task
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
  }

  async down() {
    // Xóa triggers
    await this.db.rawQuery('DROP TRIGGER IF EXISTS before_task_project_update')
    await this.db.rawQuery('DROP TRIGGER IF EXISTS before_task_project_insert')
    await this.db.rawQuery('DROP TRIGGER IF EXISTS task_version_trigger')
  }
}
